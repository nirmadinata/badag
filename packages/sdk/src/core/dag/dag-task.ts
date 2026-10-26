import { hashTaskId } from "../hash/hash";
import { assertTaskName } from "../task/task-name";
import type {
    AnyTaskFn,
    TaskConfig,
    TaskFn,
    TaskParamOutput,
} from "../task/types";
import type { TriggerRule } from "../trigger-rule";
import { DEFAULT_TRIGGER_RULE } from "../trigger-rule";
import type { DAG } from "./dag";

/** Structural definition shape accepted by DAG registration. */
export interface TaskDefinition {
    readonly name: string;
    readonly fn: AnyTaskFn;
    readonly description?: string;
    readonly config?: TaskConfig;
    readonly triggerRule: TriggerRule;
}

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
     * Task callback; receives a task context when invoked.
     */
    readonly fn: TaskFn;
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

    constructor(dag: DAG, definition: TaskParamOutput<TaskName>) {
        assertTaskName(definition.name);
        TASK_STATE.set(this, {
            dag,
            downstream: new Set(),
            upstream: new Set(),
        });
        this.id = hashTaskId(definition.name, definition.fn);
        this.name = definition.name;
        // SAFETY: task() types fn against this task's name; handles
        // expose the name-erased callback signature for execution.
        this.fn = definition.fn as TaskFn;
        this.description = definition.description;
        this.config = definition.config;
        this.triggerRule = definition.triggerRule ?? DEFAULT_TRIGGER_RULE;
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
