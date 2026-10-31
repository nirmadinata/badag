import { TASK_KIND_ENUM } from "@/task/kind";
import { isTaskName } from "@/task/task-name";

import { declaredBranches, quoteNames } from "./branch-wiring";
import type { DAGTask } from "./dag-task";

/**
 * Machine-readable category for one `DAG.validate()` finding.
 */
export const DAG_VIOLATION_ENUM = {
    /** An edge joins a task back to one of its own ancestors. */
    Cycle: "cycle",
    /** A task lists itself as an upstream or downstream task. */
    SelfEdge: "self-edge",
    /** An edge endpoint is not registered in this DAG. */
    ForeignEdge: "foreign-edge",
    /** One side of the edge records a dependency the other side does not. */
    InconsistentEdge: "inconsistent-edge",
    /** A branch task declares a branch name it never routes to. */
    UnroutedBranch: "unrouted-branch",
    /** A branch task routes to a task it never declared. */
    UndeclaredBranchTarget: "undeclared-branch-target",
    /** A branch task declares the same branch name more than once. */
    DuplicateDeclaredBranch: "duplicate-declared-branch",
    /** A branch task declares a name that can never be a task name. */
    InvalidDeclaredBranch: "invalid-declared-branch",
    /** A trigger task starts the DAG that contains it. */
    SelfTrigger: "self-trigger",
} as const;

/**
 * A category reported by `DAG.validate()`.
 */
export type DAGViolationCode =
    (typeof DAG_VIOLATION_ENUM)[keyof typeof DAG_VIOLATION_ENUM];

/**
 * One problem found in a DAG.
 *
 * `subjects` holds the names the finding involves, in the order the message
 * names them. Every entry is a task name except in the branch and trigger
 * findings, where the second entry is a declared branch name or a DAG name:
 * both endpoints for an edge, the traversal path (closing task repeated) for a
 * cycle, and `[task, declaredName]` for a branch or trigger finding.
 */
export interface DAGViolation {
    readonly code: DAGViolationCode;
    readonly subjects: readonly string[];
    readonly message: string;
}

/** One task on the depth-first path, plus how far its children were walked. */
interface Frame {
    readonly task: DAGTask;
    readonly children: readonly DAGTask[];
    index: number;
}

/**
 * Report every self edge, foreign edge, and half-recorded edge.
 *
 * The two walks report disjoint conditions on the same directed edge: the
 * downstream walk reports a missing upstream record, the upstream walk a
 * missing downstream record, so an edge yields at most one finding.
 *
 * Only `downstream` and `upstream` are read, so the walk sees exactly the
 * graph a scheduler would.
 */
function findEdgeViolations(
    dagName: string,
    tasks: readonly DAGTask[],
    registered: ReadonlySet<DAGTask>
): DAGViolation[] {
    const violations: DAGViolation[] = [];

    for (const task of tasks) {
        for (const downstream of task.downstream) {
            if (downstream === task) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.SelfEdge,
                    message: `Task "${task.name}" depends on itself`,
                    subjects: [task.name],
                });
                continue;
            }

            if (!registered.has(downstream)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.ForeignEdge,
                    message: `Edge "${task.name}" -> "${downstream.name}" crosses DAG boundaries; "${downstream.name}" is not registered in DAG "${dagName}"`,
                    subjects: [task.name, downstream.name],
                });
                continue;
            }

            if (!downstream.upstream.has(task)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.InconsistentEdge,
                    message: `Edge "${task.name}" -> "${downstream.name}" is recorded on only one side`,
                    subjects: [task.name, downstream.name],
                });
            }
        }

        for (const upstream of task.upstream) {
            if (upstream === task) {
                // The downstream walk reports a self edge from either side;
                // here it is reported only when that side was missing.
                if (!task.downstream.has(task)) {
                    violations.push({
                        code: DAG_VIOLATION_ENUM.SelfEdge,
                        message: `Task "${task.name}" depends on itself`,
                        subjects: [task.name],
                    });
                }

                continue;
            }

            if (!registered.has(upstream)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.ForeignEdge,
                    message: `Edge "${upstream.name}" -> "${task.name}" crosses DAG boundaries; "${upstream.name}" is not registered in DAG "${dagName}"`,
                    subjects: [upstream.name, task.name],
                });
                continue;
            }

            if (!upstream.downstream.has(task)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.InconsistentEdge,
                    message: `Edge "${upstream.name}" -> "${task.name}" is recorded on only one side`,
                    subjects: [upstream.name, task.name],
                });
            }
        }
    }

    return violations;
}

/**
 * Report one violation per simple cycle in the graph.
 *
 * Each cycle is emitted once, at the back edge that closes it: a task is
 * explored once, then closed and never re-entered, so no cycle can be found
 * from two entry points. Distinct cycles that share tasks are separate
 * findings, because each closes on its own back edge.
 */
function findCycleViolations(
    dagName: string,
    tasks: readonly DAGTask[],
    registered: ReadonlySet<DAGTask>
): DAGViolation[] {
    const violations: DAGViolation[] = [];
    const open = new Set<DAGTask>();
    const closed = new Set<DAGTask>();

    for (const root of tasks) {
        if (open.has(root) || closed.has(root)) {
            continue;
        }

        const frames: Frame[] = [];

        const enter = (task: DAGTask): void => {
            open.add(task);
            frames.push({
                task,
                children: [...task.downstream].filter(
                    (child) =>
                        child !== task &&
                        registered.has(child) &&
                        !closed.has(child)
                ),
                index: 0,
            });
        };

        enter(root);

        while (frames.length > 0) {
            const frame = frames.at(-1);

            if (frame === undefined) {
                break;
            }

            if (frame.index >= frame.children.length) {
                open.delete(frame.task);
                closed.add(frame.task);
                frames.pop();
                continue;
            }

            const child = frame.children[frame.index];
            frame.index += 1;

            if (closed.has(child)) {
                continue;
            }

            if (!open.has(child)) {
                enter(child);
                continue;
            }

            const start = frames.findIndex((entry) => entry.task === child);

            const cycle = [
                ...frames.slice(start).map((entry) => entry.task),
                child,
            ];

            violations.push({
                code: DAG_VIOLATION_ENUM.Cycle,
                message: `DAG "${dagName}" contains a cycle: ${quoteNames(
                    cycle.map((task) => task.name)
                )}`,
                subjects: cycle.map((task) => task.name),
            });
        }
    }

    return violations;
}

/**
 * Report branch tasks whose wiring disagrees with their declared branches.
 *
 * Only registered downstream tasks count: an edge to a task in another DAG is
 * a foreign-edge finding, not a routing one. A branch that declares no
 * branches at all is unconstrained and never reported.
 */
function findBranchViolations(
    tasks: readonly DAGTask[],
    registered: ReadonlySet<DAGTask>
): DAGViolation[] {
    const violations: DAGViolation[] = [];

    for (const task of tasks) {
        const declared = declaredBranches(task);

        if (declared === undefined || declared.length === 0) {
            continue;
        }

        const routed = [...task.downstream].flatMap((downstream) =>
            registered.has(downstream) ? [downstream.name] : []
        );

        // One finding per branch name, so a repeated declaration is reported
        // once and a name that can never be routed to is not also reported as
        // merely unrouted.
        for (const name of new Set(declared)) {
            if (!isTaskName(name)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.InvalidDeclaredBranch,
                    message: `Branch "${task.name}" declares "${name}", which is not a valid task name`,
                    subjects: [task.name, name],
                });
                continue;
            }

            if (declared.indexOf(name) !== declared.lastIndexOf(name)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.DuplicateDeclaredBranch,
                    message: `Branch "${task.name}" declares "${name}" more than once`,
                    subjects: [task.name, name],
                });
                continue;
            }

            if (!routed.includes(name)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.UnroutedBranch,
                    message: `Branch "${task.name}" must route to declared branch "${name}"`,
                    subjects: [task.name, name],
                });
            }
        }

        for (const name of new Set(routed)) {
            if (!declared.includes(name)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.UndeclaredBranchTarget,
                    message: `Branch "${task.name}" cannot route to "${name}"; declared branches are ${quoteNames(declared)}`,
                    subjects: [task.name, name],
                });
            }
        }
    }

    return violations;
}

/**
 * Report trigger tasks that start the DAG containing them.
 *
 * A trigger task names a target DAG, so a task pointing at its own DAG starts
 * a copy of itself; the SDK does not run DAGs, but no scheduler can execute
 * that request. The target name is compared after trimming, matching how
 * `createDAG` treats a name.
 */
function findTriggerViolations(
    dagName: string,
    tasks: readonly DAGTask[]
): DAGViolation[] {
    const violations: DAGViolation[] = [];
    const target = dagName.trim();

    for (const task of tasks) {
        const { definition } = task;

        if (definition.kind !== TASK_KIND_ENUM.Trigger) {
            continue;
        }

        if (definition.dagName.trim() === target) {
            violations.push({
                code: DAG_VIOLATION_ENUM.SelfTrigger,
                message: `Trigger task "${task.name}" starts DAG "${target}", which contains it`,
                subjects: [task.name, target],
            });
        }
    }

    return violations;
}

/**
 * Return every violation in a graph, in registration order.
 *
 * Pure: the graph is only read, so calling this is always safe and never
 * throws. Edges are reported before cycles and branch findings.
 */
export function findViolations(
    dagName: string,
    tasks: readonly DAGTask[]
): readonly DAGViolation[] {
    const registered = new Set(tasks);

    return [
        ...findEdgeViolations(dagName, tasks, registered),
        ...findCycleViolations(dagName, tasks, registered),
        ...findBranchViolations(tasks, registered),
        ...findTriggerViolations(dagName, tasks),
    ];
}
