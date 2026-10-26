/**
 * Serialized DAG and task snapshots returned by `DAG.toJSON()`.
 */

import type { TaskConfig } from "../task/types";
import type { TriggerRule } from "../trigger-rule";

/**
 * A task as it appears in `DAG.toJSON()`; `fn` is not serialized.
 */
export interface TaskJson {
    /**
     * Content-derived task ID, stable for the same name and function source.
     */
    readonly id: string;
    /**
     * Unique name within the owning DAG.
     */
    readonly name: string;
    /**
     * Trigger rule stored on the task.
     */
    readonly triggerRule: TriggerRule;
    /**
     * Optional human-readable description.
     */
    readonly description?: string;
    /**
     * Optional per-task settings; omitted when the task has none.
     */
    readonly config?: TaskConfig;
    /**
     * Names of tasks that must finish before this task.
     */
    readonly upstream: readonly string[];
    /**
     * Names of tasks that run after this task.
     */
    readonly downstream: readonly string[];
}

/**
 * JSON-safe snapshot of a DAG; edge lists contain task names.
 */
export interface DAGJson {
    /**
     * Name of the DAG.
     */
    readonly name: string;
    /**
     * Registered tasks in registration order.
     */
    readonly tasks: readonly TaskJson[];
}
