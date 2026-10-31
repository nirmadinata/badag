/**
 * Serialized DAG and task snapshots returned by `DAG.toJSON()`.
 */

import type { TASK_KIND_ENUM } from "@/core/task/kind";
import type { TaskConfig, TaskKind } from "@/core/task/types";
import type { TriggerRule } from "@/core/trigger-rule";

/**
 * Fields common to every serialized task kind.
 */
export interface TaskJsonBase<Kind extends TaskKind> {
    /**
     * Content-derived task ID, stable for the same name and function source.
     */
    readonly id: string;
    /**
     * Unique name within the owning DAG.
     */
    readonly name: string;
    /**
     * Discriminates the task kind.
     */
    readonly kind: Kind;
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

/** A serialized regular task. */
export type TaskJsonTask = TaskJsonBase<typeof TASK_KIND_ENUM.Task>;

/** A serialized sensor task; the predicate itself is omitted. */
export interface SensorTaskJson extends TaskJsonBase<
    typeof TASK_KIND_ENUM.Sensor
> {
    /**
     * Delay between predicate evaluations in milliseconds.
     */
    readonly pokeIntervalMs?: number;
}

/** A serialized delay task. */
export interface DelayTaskJson extends TaskJsonBase<
    typeof TASK_KIND_ENUM.Delay
> {
    /**
     * Delay duration in milliseconds.
     */
    readonly durationMs: number;
}

/** A serialized branch task; the chooser itself is omitted. */
export type BranchTaskJson = TaskJsonBase<typeof TASK_KIND_ENUM.Branch>;

/** A serialized short-circuit task; the condition itself is omitted. */
export type ShortCircuitTaskJson = TaskJsonBase<
    typeof TASK_KIND_ENUM.ShortCircuit
>;

/** A serialized trigger task. */
export interface TriggerTaskJson extends TaskJsonBase<
    typeof TASK_KIND_ENUM.Trigger
> {
    /**
     * Name of the DAG to trigger.
     */
    readonly dagName: string;
    /**
     * Whether the trigger waits for the target DAG to finish.
     */
    readonly waitForCompletion: boolean;
}

/**
 * A task as it appears in `DAG.toJSON()`; functions are not serialized.
 */
export type TaskJson =
    | TaskJsonTask
    | SensorTaskJson
    | DelayTaskJson
    | BranchTaskJson
    | ShortCircuitTaskJson
    | TriggerTaskJson;

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
