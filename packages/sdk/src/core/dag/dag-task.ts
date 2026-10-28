import { hashTaskId } from "@/core/hash/hash";
import { taskBehaviorSource } from "@/core/task/identity";
import { assertTaskName } from "@/core/task/task-name";
import type {
    AnyTaskDefinition,
    RegisteredTaskDefinition,
    TaskConfig,
    TaskKind,
} from "@/core/task/types";
import type { TriggerRule } from "@/core/trigger-rule";
import { DEFAULT_TRIGGER_RULE } from "@/core/trigger-rule";

import type { DAG } from "./dag";

/** Structural definition shape accepted by DAG registration. */
export type TaskDefinition = AnyTaskDefinition;

/**
 * A task handle, or a definition to resolve inside a DAG.
 *
 * Stays next to `DAGTask` so the union preserves the runtime class identity.
 */
export type TaskLike = DAGTask | TaskDefinition;

/**
 * A task, or a readonly wiring set, accepted by wiring methods.
 */
export type TaskOrTasks = TaskLike | readonly TaskLike[];

function isTaskList(tasks: TaskOrTasks): tasks is readonly TaskLike[] {
    return Array.isArray(tasks);
}

export function normalizeTasks(tasks: TaskOrTasks): readonly TaskLike[] {
    return isTaskList(tasks) ? tasks : [tasks];
}

/**
 * State owned by the DAG module so only `DAG` can write edges.
 *
 * Private fields are class-scoped, so `DAG` cannot mutate a task's sets
 * directly. Keeping the back-reference and adjacency here gives the aggregate
 * root write access without exposing a public mutation method.
 */
interface TaskState {
    readonly dag: DAG;
    readonly upstream: Set<DAGTask>;
    readonly downstream: Set<DAGTask>;
}

const TASK_STATE = new WeakMap<DAGTask, TaskState>();

export function stateOf(task: DAGTask): TaskState {
    const state = TASK_STATE.get(task);

    if (state === undefined) {
        throw new Error("Task was not created by a DAG");
    }

    return state;
}

/**
 * A task registered in a DAG.
 */
export class DAGTask<TaskName extends string = string> {
    /**
     * Content-derived task ID assigned when the task is registered.
     */
    readonly id: string;
    /**
     * Unique name within the owning DAG.
     */
    readonly name: TaskName;
    /**
     * Optional human-readable description.
     */
    readonly description: string | undefined;
    /**
     * Optional per-task settings; undefined when the task has none.
     */
    readonly config: TaskConfig | undefined;
    /**
     * When this task becomes ready; defaults to "all_success".
     */
    readonly triggerRule: TriggerRule;
    /**
     * Discriminates the task kind.
     */
    readonly kind: TaskKind;
    /**
     * The definition this handle was registered from, including kind-specific
     * fields such as a sensor predicate or delay duration.
     */
    readonly definition: RegisteredTaskDefinition;

    constructor(dag: DAG, definition: AnyTaskDefinition) {
        assertTaskName(definition.name);
        TASK_STATE.set(this, {
            dag,
            downstream: new Set(),
            upstream: new Set(),
        });
        this.id = hashTaskId(definition.name, taskBehaviorSource(definition));
        // SAFETY: DAG.getTask() types handles with the definition's literal name.
        this.name = definition.name as TaskName;
        this.description = definition.description;
        this.config = definition.config;
        this.triggerRule = definition.triggerRule ?? DEFAULT_TRIGGER_RULE;
        this.kind = definition.kind;
        // SAFETY: callbacks are callable with the task context; the registered
        // view widens their literal name parameter to string.
        this.definition = definition as RegisteredTaskDefinition;
    }

    /**
     * Tasks that must finish before this task runs.
     */
    get upstream(): ReadonlySet<DAGTask> {
        return stateOf(this).upstream;
    }

    /**
     * Tasks that run after this task completes.
     */
    get downstream(): ReadonlySet<DAGTask> {
        return stateOf(this).downstream;
    }

    /**
     * Make the given task(s) depend on this task.
     */
    setDownstream(tasks: TaskOrTasks): this {
        stateOf(this).dag.addDependencies(this, tasks);

        return this;
    }

    /**
     * Make this task depend on the given task(s).
     */
    setUpstream(tasks: TaskOrTasks): this {
        stateOf(this).dag.addDependencies(tasks, this);

        return this;
    }

    /**
     * Alias for setUpstream().
     */
    dependsOn(tasks: TaskOrTasks): this {
        return this.setUpstream(tasks);
    }
}

/**
 * Connect every task in `upstream` to every task in `downstream`.
 */
export function crossDownstream(
    upstream: readonly DAGTask[],
    downstream: readonly DAGTask[]
): void {
    const [first] = upstream;

    if (first === undefined || downstream.length === 0) {
        return;
    }

    stateOf(first).dag.addDependencies(upstream, downstream);
}

export function isDefinition(task: TaskLike): task is TaskDefinition {
    return !(task instanceof DAGTask);
}
