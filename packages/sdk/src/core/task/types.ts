/**
 * Task callback, configuration, and definition types shared by the factory
 * and DAG registration.
 */

import type { TriggerRule } from "../trigger-rule";

/**
 * Context passed as the first argument to every task callback.
 */
export interface TaskContext<TaskName extends string = string> {
    /**
     * Content-derived ID of the registered task.
     */
    readonly id: string;
    /**
     * Name of the task whose callback is running.
     */
    readonly name: TaskName;
}

/**
 * A task callback.
 *
 * The task's context comes first; `name` narrows to the task's literal name
 * when `task()` infers it.
 */
export type TaskFn<TaskName extends string = string> = (
    ctx: TaskContext<TaskName>
) => PromiseLike<unknown> | unknown;

/**
 * Any callable shape used by aliases that must accept every task definition.
 *
 * `never[]` is the widest parameter tuple: every function is assignable to it
 * without falling back to `any`.
 */
export type AnyTaskFn = (...args: never[]) => PromiseLike<unknown> | unknown;

/** Whitespace trimmed from a task name by `task()`. */
type TaskNameWhitespace =
    | " "
    | "\n"
    | "\t"
    | "\r"
    | "\f"
    | "\v"
    | "\u00A0"
    | "\u1680"
    | "\u2000"
    | "\u2001"
    | "\u2002"
    | "\u2003"
    | "\u2004"
    | "\u2005"
    | "\u2006"
    | "\u2007"
    | "\u2008"
    | "\u2009"
    | "\u200A"
    | "\u2028"
    | "\u2029"
    | "\u202F"
    | "\u205F"
    | "\u3000"
    | "\uFEFF";

type TrimTaskNameEnd<Name extends string> =
    Name extends `${infer Rest}${TaskNameWhitespace}`
        ? TrimTaskNameEnd<Rest>
        : Name;

type TrimTaskNameStart<Name extends string> =
    Name extends `${TaskNameWhitespace}${infer Rest}`
        ? TrimTaskNameStart<Rest>
        : Name;

/** The task name after `task()` trims surrounding whitespace. */
export type TrimTaskName<Name extends string> = TrimTaskNameStart<
    TrimTaskNameEnd<Name>
>;

/**
 * Per-task execution settings stored on the task; the SDK never interprets them.
 */
export interface TaskConfig {
    /**
     * Optional timeout in milliseconds; stored but not enforced by the SDK.
     */
    timeout_ms?: number;
    /**
     * Additional application-specific settings, stored as-is.
     */
    [key: string]: unknown;
}

/**
 * Input accepted by `task()` after the task name.
 */
export interface TaskParamInput<Fn extends AnyTaskFn = TaskFn> {
    /**
     * Task callback, invoked with a task context.
     */
    fn: Fn;
    /**
     * Optional human-readable description.
     */
    description?: string;
    /**
     * Optional per-task settings; stored but not interpreted by the SDK.
     */
    config?: TaskConfig;
    /**
     * When the task becomes ready; defaults to "all_success".
     */
    triggerRule?: TriggerRule;
}

/**
 * A task definition; ids are assigned to registered `DAGTask` handles.
 */
export interface TaskParamOutput<
    TaskName extends string,
    Fn extends AnyTaskFn = TaskFn<TaskName>,
> extends TaskParamInput<Fn> {
    /**
     * Unique name within the owning DAG.
     */
    name: TaskName;
    /**
     * Normalized trigger rule; always present on a definition.
     */
    triggerRule: TriggerRule;
}

/**
 * Call signature of `task()`.
 *
 * The name is trimmed; the returned definition has a normalized
 * `triggerRule` and no task ID.
 */
export type CreateTask = <
    const TaskName extends string,
    Fn extends TaskFn<TrimTaskName<TaskName>>,
>(
    name: TaskName,
    params: TaskParamInput<Fn>
) => TaskParamOutput<TrimTaskName<TaskName>, Fn>;
