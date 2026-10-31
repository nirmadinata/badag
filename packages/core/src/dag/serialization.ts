/**
 * Serialized DAG and task snapshots returned by `DAG.toJSON()`.
 */

import { TASK_KIND_ENUM } from "../task/kind";
import type { TaskKind } from "../task/kind";
import type { TriggerRule } from "../task/trigger-rule";
import type { TaskConfig } from "../task/types/base";
import type { DAGTask } from "./registered-task";

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

/** Common serialized fields, omitting absent optional metadata. */
function taskJsonBase(task: DAGTask): Omit<TaskJsonBase<TaskKind>, "kind"> {
    const base = {
        id: task.id,
        name: task.name,
        triggerRule: task.triggerRule,
        upstream: [...task.upstream].map((upstream) => upstream.name),
        downstream: [...task.downstream].map((downstream) => downstream.name),
    };

    if (task.description === undefined && task.config === undefined) {
        return base;
    }

    if (task.description === undefined) {
        return { ...base, config: task.config };
    }

    if (task.config === undefined) {
        return { ...base, description: task.description };
    }

    return {
        ...base,
        description: task.description,
        config: task.config,
    };
}

/** Snapshot one task, omitting functions and absent optional fields. */
function taskJson(task: DAGTask): TaskJson {
    const base = taskJsonBase(task);
    const { definition } = task;

    switch (definition.kind) {
        case TASK_KIND_ENUM.Sensor: {
            const sensor = {
                ...base,
                kind: TASK_KIND_ENUM.Sensor,
            };

            return definition.pokeIntervalMs === undefined
                ? sensor
                : { ...sensor, pokeIntervalMs: definition.pokeIntervalMs };
        }

        case TASK_KIND_ENUM.Delay: {
            return {
                ...base,
                kind: TASK_KIND_ENUM.Delay,
                durationMs: definition.durationMs,
            };
        }

        case TASK_KIND_ENUM.Branch: {
            return { ...base, kind: TASK_KIND_ENUM.Branch };
        }

        case TASK_KIND_ENUM.ShortCircuit: {
            return { ...base, kind: TASK_KIND_ENUM.ShortCircuit };
        }

        case TASK_KIND_ENUM.Trigger: {
            return {
                ...base,
                kind: TASK_KIND_ENUM.Trigger,
                dagName: definition.dagName,
                waitForCompletion: definition.waitForCompletion,
            };
        }

        default: {
            return { ...base, kind: TASK_KIND_ENUM.Task };
        }
    }
}

/**
 * Return a JSON-safe snapshot of a DAG.
 *
 * Tasks keep their task IDs, names, kinds, descriptions, trigger rules,
 * configs, and serializable kind-specific fields; edges are listed by task
 * name. Functions are omitted. `JSON.stringify(dag)` calls this through
 * `DAG.toJSON()`, so `config` values must be JSON-serializable for that
 * conversion.
 */
export function serializeDAG(name: string, tasks: readonly DAGTask[]): DAGJson {
    return {
        name,
        tasks: tasks.map((task) => taskJson(task)),
    };
}
