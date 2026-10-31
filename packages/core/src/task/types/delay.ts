import type { TASK_KIND_ENUM } from "../kind";
import type {
    AnySchema,
    TaskDefinitionBase,
    TaskMetadata,
    TaskSchemas,
    TrimTaskName,
} from "./base";

/**
 * Input to the delay factory after the name.
 */
export interface DelayTaskInput<
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Delay duration in milliseconds.
     */
    readonly durationMs: number;
}

/**
 * A delay task definition.
 *
 * A delay declares no schemas by default; it produces no value of its own.
 */
export interface DelayTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> extends TaskDefinitionBase<Name, typeof TASK_KIND_ENUM.Delay, Input, Output> {
    /**
     * Delay duration in milliseconds.
     */
    readonly durationMs: number;
}

/**
 * Call signature of `delay()`.
 */
export type CreateDelay = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>(
    name: Name,
    input: DelayTaskInput<Input, Output>
) => DelayTaskDefinition<TrimTaskName<Name>, Input, Output>;
