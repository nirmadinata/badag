import type { TASK_KIND_ENUM } from "../kind";
import type {
    AnySchema,
    AnyTaskFn,
    TaskDefinitionBase,
    TaskFn,
    TaskMetadata,
    TaskPayloadOf,
    TaskProducedOf,
    TaskSchemas,
    TrimTaskName,
} from "./base";

/**
 * Input to the regular task factory after the name.
 */
export interface TaskParamInput<
    Fn extends AnyTaskFn = AnyTaskFn,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Task callback, invoked with a task context.
     */
    readonly fn: Fn;
}

/**
 * A regular task definition; ids are assigned to registered `DAGTask` handles.
 */
export interface TaskParamOutput<
    Name extends string,
    Fn extends AnyTaskFn = TaskFn<Name>,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> extends TaskDefinitionBase<Name, typeof TASK_KIND_ENUM.Task, Input, Output> {
    /**
     * Task callback, invoked with a task context.
     */
    readonly fn: Fn;
}

/**
 * Call signature of `task()`.
 *
 * The name is trimmed; the returned definition has a normalized
 * `triggerRule` and no task ID. `ctx.payload` is typed from `input`, and the
 * callback result is checked against `output`.
 */
export type CreateTask = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
    Fn extends TaskFn<
        TrimTaskName<Name>,
        TaskPayloadOf<Input>,
        TaskProducedOf<Output>
    > = TaskFn<
        TrimTaskName<Name>,
        TaskPayloadOf<Input>,
        TaskProducedOf<Output>
    >,
>(
    name: Name,
    params: TaskParamInput<Fn, Input, Output>
) => TaskParamOutput<TrimTaskName<Name>, Fn, Input, Output>;
