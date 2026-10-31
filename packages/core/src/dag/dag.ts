import { hashTaskId } from "../hash/hash";
import {
    taskBehaviorCallback,
    taskBehaviorSource,
} from "../task/definition/identity";
import { findViolations } from "./audit/audit";
import type { DAGViolation } from "./audit/violation";
import { assertBranchWiring } from "./branch-routing";
import type { NextBranches } from "./chain/branches";
import type { NextEdges } from "./chain/edges";
import type { ChainProblem, ParseProblem } from "./chain/problem";
import type { NextSignatures } from "./chain/signatures";
import {
    DAGTask,
    isDefinition,
    normalizeTasks,
    stateOf,
} from "./registered-task";
import type { TaskDefinition, TaskLike, TaskOrTasks } from "./registered-task";
import { serializeDAG } from "./serialization";
import type { DAGJson } from "./serialization";
import { sortTopologically } from "./topological-sort";
import { parseWiringExpression } from "./wiring";
import type { WiringOperand } from "./wiring";

type TaskNameIndex = string;

type TaskIdIndex = string;

/** One validated edge step: every task on the left upstream of every task on the right. */
type EdgeStep = readonly [readonly DAGTask[], readonly DAGTask[]];

/**
 * An Airflow-inspired directed acyclic graph.
 *
 * `DagName`, `Signatures`, `Edges`, and `Branches` are compile-time
 * bookkeeping for `chain()`: the returned DAG carries the registrations,
 * edges, and declared branch sets added by the call. Keep calls fluent (or
 * keep the returned value) for static validation; the runtime checks cover
 * every wiring path.
 */
export class DAG<
    DagName extends string = string,
    Signatures = Record<never, never>,
    Edges = Record<never, never>,
    Branches = Record<never, never>,
> {
    readonly #name: DagName;
    // Same task objects, two indexes: name drives public lookup and order;
    // task ID drives identity and duplicate detection.
    readonly #tasks = new Map<TaskNameIndex, DAGTask>();
    readonly #tasksById = new Map<TaskIdIndex, DAGTask>();

    constructor(name: DagName) {
        if (!name.trim()) {
            throw new Error("DAG name cannot be empty");
        }

        this.#name = name;
    }

    /**
     * Name supplied when the DAG was constructed.
     */
    get name(): DagName {
        return this.#name;
    }

    /**
     * Registered tasks keyed by task name, in registration order.
     */
    get tasks(): ReadonlyMap<TaskNameIndex, DAGTask> {
        return this.#tasks;
    }

    /**
     * Look up a registered task by name.
     *
     * The returned task is typed with the queried name: tasks are keyed by
     * their own `name`, so any hit carries that literal type.
     */
    getTask<const Name extends TaskNameIndex>(
        name: Name
    ): DAGTask<Name> | undefined {
        // SAFETY: #tasks is keyed by task.name, so a hit is always a DAGTask<Name>.
        return this.#tasks.get(name) as DAGTask<Name> | undefined;
    }

    /**
     * Add an edge: from -> to.
     *
     * Each side accepts a `DAGTask` handle or a definition. Definitions are
     * registered in this DAG on first use.
     */
    addDependency(from: TaskLike, to: TaskLike): void {
        this.addDependencies(from, to);
    }

    /**
     * Add every edge from `upstream` to `downstream`.
     *
     * The call is transactional: if any definition or edge is rejected, the
     * tasks and edges added by this call are rolled back.
     */
    addDependencies(upstream: TaskOrTasks, downstream: TaskOrTasks): void {
        const froms = normalizeTasks(upstream);
        const tos = normalizeTasks(downstream);

        if (froms.length === 0 || tos.length === 0) {
            return;
        }

        for (const task of froms) {
            this.#assertHandleBelongs(task);
        }

        for (const task of tos) {
            this.#assertHandleBelongs(task);
        }

        const inserted = this.#registerDefinitions(
            [...froms, ...tos].filter(isDefinition)
        );

        try {
            const fromTasks = froms.map((task) => this.#lookup(task));
            const toTasks = tos.map((task) => this.#lookup(task));

            this.#addEdges([fromTasks, toTasks]);
        } catch (error) {
            this.#removeTasks(inserted);
            throw error;
        }
    }

    /**
     * Register wiring sets and connect consecutive sets.
     *
     * dag.chain(a, b, c)       => a -> b -> c
     * dag.chain(a, [b, c], d)  => a -> b, a -> c, b -> d, c -> d
     *
     * Wiring sets may contain `DAGTask` handles or definitions. Definitions
     * are registered in this DAG before linking (validated as one batch); a
     * single wiring set registers tasks without adding edges. Existing edges
     * are skipped, so repeated calls are idempotent.
     *
     * The type-level state carried by the returned DAG rejects duplicate
     * definitions and edges that close a cycle. Keep the chain fluent (or keep
     * the returned value) for those checks to apply.
     */
    chain<const Groups extends readonly TaskOrTasks[]>(
        ...groups: Groups &
            (ChainProblem<
                DagName,
                Signatures,
                Edges,
                Branches,
                Groups
            > extends true
                ? unknown
                : ChainProblem<DagName, Signatures, Edges, Branches, Groups>)
    ): DAG<
        DagName,
        NextSignatures<DagName, Signatures, Groups>,
        NextEdges<Edges, Groups>,
        NextBranches<DagName, Branches, Groups>
    >;
    chain(...groups: TaskOrTasks[]): this {
        const normalized = groups.map((group) => normalizeTasks(group));

        for (const group of normalized) {
            for (const task of group) {
                this.#assertHandleBelongs(task);
            }
        }

        const inserted = this.#registerDefinitions(
            normalized.flat().filter(isDefinition)
        );

        try {
            const resolved = normalized.map((group) =>
                group.map((task) => this.#lookup(task))
            );

            this.#addEdges(resolved);
        } catch (error) {
            this.#removeTasks(inserted);
            throw error;
        }

        return this;
    }

    /**
     * Wire tasks with Airflow-style bitshift notation.
     *
     * dag.parse`${a} >> ${b} >> ${c}`        => a -> b -> c
     * dag.parse`${a} >> ${b} << ${c}`        => a -> b, c -> b
     * dag.parse`${[a, c]} >> ${b}`           => a -> b, c -> b
     * dag.parse`${a}`                        => registers a, adds no edge
     *
     * Operators evaluate left to right and each result feeds the next, so
     * `${a} >> ${b} << ${c}` is the same graph as `${[a, c]} >> ${b}`.
     * Operands accept `DAGTask` handles and definitions alike; definitions are
     * registered on first use, exactly as in `chain()`.
     *
     * One expression per call. A newline inside the template is rejected, so a
     * second expression needs a second call.
     *
     * This call is transactional, like `chain()`: a rejected task, edge, or
     * wiring step leaves the task registry and the edges unchanged.
     *
     * The returned DAG carries the operands as compile-time signatures and
     * declared branch sets, exactly as `chain()` does, so a later `chain()`
     * call's duplicate-definition check sees tasks registered here. It does
     * not carry edges: TypeScript cannot read the literal `>>`/`<<` segments,
     * so edge direction is known only at runtime, and recording guesswork in
     * the edge state would make a later `chain()` cycle check silently weaker.
     * Cycles, self edges, cross-DAG handles, and branch routing are therefore
     * checked when the call runs.
     */
    parse<const Operands extends readonly WiringOperand[]>(
        segments: TemplateStringsArray,
        ...operands: Operands &
            (ParseProblem<DagName, Signatures, Branches, Operands> extends true
                ? unknown
                : ParseProblem<DagName, Signatures, Branches, Operands>)
    ): DAG<
        DagName,
        NextSignatures<DagName, Signatures, Operands>,
        Edges,
        NextBranches<DagName, Branches, Operands>
    >;
    parse(
        segments: TemplateStringsArray,
        ...operands: readonly WiringOperand[]
    ): this {
        const { steps, tasks } = parseWiringExpression(
            this.#name,
            segments,
            operands
        );

        for (const task of tasks) {
            this.#assertHandleBelongs(task);
        }

        const inserted = this.#registerDefinitions(tasks.filter(isDefinition));

        try {
            const groups: EdgeStep[] = steps.map(([froms, tos]) => [
                froms.map((task) => this.#lookup(task)),
                tos.map((task) => this.#lookup(task)),
            ]);

            // Steps are independent edges, not a sequence of wiring sets: a
            // left-to-right chain must keep its direction, so each step is
            // validated on its own after the whole batch is planned.
            this.#addEdgeSteps(groups);
        } catch (error) {
            this.#removeTasks(inserted);
            throw error;
        }

        // The overloads carry the accumulated signature and branch state; the
        // implementation only has to report the instance it mutated.
        return this;
    }

    /**
     * Return every problem in the graph without throwing.
     *
     * The wiring methods reject malformed graphs as they run, so a DAG built
     * only through them validates clean. This method exists for graphs that
     * reach a checkpoint later — a snapshot, a graph restored from storage, a
     * half-built DAG before execution — and for the states wiring cannot see at
     * the time of a call: a branch task registered alone declares the branches
     * it must route to, and only pairing it with those tasks satisfies that.
     *
     * Findings are ordered edges, cycles, then branch routing, and `tasks`
     * names the tasks involved. An empty array means the graph is acyclic,
     * internally consistent, and every branch routes exactly to its declared
     * branches.
     */
    validate(): readonly DAGViolation[] {
        return findViolations(this.#name, [...this.#tasks.values()]);
    }

    /**
     * Return tasks in a valid topological execution order.
     * Throws if the graph is cyclic.
     */
    topologicalSort(): DAGTask[] {
        return sortTopologically(this.#tasks, this.#name);
    }

    /**
     * Return a JSON-safe snapshot of the graph.
     *
     * Tasks keep their task IDs, names, kinds, descriptions, trigger rules,
     * configs, and serializable kind-specific fields; edges are listed by task
     * name. Functions are omitted. `JSON.stringify(dag)` calls this method, so
     * `config` values must be JSON-serializable for that conversion.
     */
    toJSON(): DAGJson {
        return serializeDAG(this.#name, [...this.#tasks.values()]);
    }

    #assertHandleBelongs(task: TaskLike): void {
        if (task instanceof DAGTask && this.#tasksById.get(task.id) !== task) {
            throw new Error("Both tasks must belong to this DAG");
        }
    }

    /**
     * Register unseen definitions as one batch.
     *
     * Validation runs over the whole batch before any task is inserted, and a
     * definition with the same task ID is reused.
     */
    #registerDefinitions(
        definitions: readonly TaskDefinition[]
    ): readonly DAGTask[] {
        const pendingNames = new Set<string>();
        const pendingById = new Map<string, DAGTask>();
        const pending: DAGTask[] = [];

        for (const definition of definitions) {
            // SAFETY: task factories type kind-specific callbacks against this name.
            const candidate = new DAGTask(this, definition);

            const existing = this.#tasksById.get(candidate.id);

            if (existing !== undefined) {
                if (existing.name !== candidate.name) {
                    throw new Error(`Task ID "${candidate.id}" already exists`);
                }

                this.#assertDuplicateCallback(existing, candidate);

                continue;
            }

            const pendingTask = pendingById.get(candidate.id);

            if (pendingTask !== undefined) {
                if (pendingTask.name !== candidate.name) {
                    throw new Error(`Task ID "${candidate.id}" already exists`);
                }

                this.#assertDuplicateCallback(pendingTask, candidate);

                continue;
            }

            if (
                this.#tasks.has(candidate.name) ||
                pendingNames.has(candidate.name)
            ) {
                throw new Error(
                    `Task "${candidate.name}" already exists in DAG "${this.#name}"`
                );
            }

            pendingNames.add(candidate.name);
            pendingById.set(candidate.id, candidate);
            pending.push(candidate);
        }

        for (const task of pending) {
            this.#tasks.set(task.name, task);
            this.#tasksById.set(task.id, task);
        }

        return pending;
    }

    /**
     * Reject a duplicate definition whose behavior source matches but whose
     * callback instance does not.
     *
     * Callback source text omits captured values, so two distinct callbacks can
     * share a task ID while behaving differently. Treating one as a duplicate
     * would drop it without a trace; the caller must reuse the callback or give
     * the task a distinct name.
     */
    #assertDuplicateCallback(existing: DAGTask, candidate: DAGTask): void {
        const existingCallback = taskBehaviorCallback(existing.definition);
        const candidateCallback = taskBehaviorCallback(candidate.definition);

        if (existingCallback === candidateCallback) {
            return;
        }

        throw new Error(
            `Task "${candidate.name}" in DAG "${this.#name}" has the same callback source as an existing definition but a different callback instance; captured values are not part of task identity, so a duplicate registration would silently drop the task. Reuse the same callback or give the task a distinct name`
        );
    }

    /** Remove tasks inserted by a failed batch; reused tasks are untouched. */
    #removeTasks(tasks: readonly DAGTask[]): void {
        for (const task of tasks) {
            if (this.#tasksById.get(task.id) === task) {
                this.#tasks.delete(task.name);
                this.#tasksById.delete(task.id);
            }
        }
    }

    /** Resolve a handle or definition to its canonical task by task ID. */
    #lookup(task: TaskLike): DAGTask {
        const id =
            task instanceof DAGTask
                ? task.id
                : hashTaskId(task.name, taskBehaviorSource(task));

        const registered = this.#tasksById.get(id);

        if (registered === undefined) {
            throw new Error(
                `Task "${task.name}" is not registered in DAG "${this.#name}"`
            );
        }

        return registered;
    }

    /**
     * Validate and write every edge between consecutive wiring sets.
     *
     * Planning runs over the whole batch first, so a rejected edge leaves the
     * graph unchanged.
     */
    #addEdges(groups: readonly (readonly DAGTask[])[]): void {
        const steps: EdgeStep[] = [];

        for (let index = 1; index < groups.length; index += 1) {
            steps.push([groups[index - 1], groups[index]]);
        }

        this.#addEdgeSteps(steps);
    }

    /**
     * Validate and write a batch of independent edge steps.
     *
     * Steps keep their own direction; they are not chained to each other, so
     * `[a, b]` and `[c, b]` from notation like `a >> b << c` both apply.
     * Planning covers the whole batch before any edge is written.
     */
    #addEdgeSteps(steps: readonly EdgeStep[]): void {
        const planned = new Map<DAGTask, Set<DAGTask>>();

        for (const [froms, tos] of steps) {
            for (const from of froms) {
                for (const to of tos) {
                    if (from === to) {
                        throw new Error("A task cannot depend on itself");
                    }

                    if (from.downstream.has(to)) {
                        continue;
                    }

                    if (this.#hasPathIn(planned, to, from)) {
                        throw new Error(
                            `Dependency "${from.name}" -> "${to.name}" creates a cycle`
                        );
                    }

                    const next = planned.get(from) ?? new Set(from.downstream);
                    next.add(to);
                    planned.set(from, next);
                }
            }
        }

        for (const [froms, tos] of steps) {
            assertBranchWiring(froms, tos, planned);
        }

        for (const [froms, tos] of steps) {
            for (const from of froms) {
                for (const to of tos) {
                    if (from.downstream.has(to)) {
                        continue;
                    }

                    stateOf(from).downstream.add(to);
                    stateOf(to).upstream.add(from);
                }
            }
        }
    }

    #hasPathIn(
        planned: ReadonlyMap<DAGTask, ReadonlySet<DAGTask>>,
        from: DAGTask,
        target: DAGTask
    ): boolean {
        const visited = new Set<DAGTask>([from]);
        const pending: DAGTask[] = [from];
        let index = 0;

        while (index < pending.length) {
            const current = pending[index];
            index += 1;

            if (current === target) {
                return true;
            }

            const downstream = planned.get(current) ?? current.downstream;

            for (const next of downstream) {
                if (visited.has(next)) {
                    continue;
                }

                visited.add(next);
                pending.push(next);
            }
        }

        return false;
    }
}

/**
 * Create a DAG without `new`.
 *
 * Keeps the literal name in the returned type, so `chain()` checks apply
 * exactly as they do on a constructed `DAG`.
 */
export const createDAG = <const DagName extends string>(
    name: DagName
): DAG<DagName> => new DAG(name);
