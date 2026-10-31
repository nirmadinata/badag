import type { TASK_KIND_ENUM } from "../kind";
import type {
    AnySchema,
    MaybePromise,
    SchemaOf,
    TaskContext,
    TaskDefinitionBase,
    TaskMetadata,
    TaskPayloadOf,
    TaskSchemas,
    TrimTaskName,
} from "./base";

/**
 * Condition evaluated by a short-circuit task.
 */
export type ShortCircuitCondition<
    Name extends string = string,
    Payload = undefined,
> = (ctx: TaskContext<Name, Payload>) => MaybePromise<boolean>;

/**
 * Input to the short-circuit factory after the name.
 */
export interface ShortCircuitTaskInput<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Condition that controls whether downstream tasks run.
     */
    readonly condition: ShortCircuitCondition<Name, TaskPayloadOf<Input>>;
}

/**
 * A short-circuit task definition.
 *
 * A short-circuit produces a boolean when no output schema is declared, since
 * its result is whether downstream tasks should run.
 */
export interface ShortCircuitTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
> extends TaskDefinitionBase<
    Name,
    typeof TASK_KIND_ENUM.ShortCircuit,
    Input,
    Output
> {
    /**
     * Condition that controls whether downstream tasks run.
     */
    readonly condition: ShortCircuitCondition<Name, TaskPayloadOf<Input>>;
}

/**
 * Call signature of `shortCircuit()`.
 */
export type CreateShortCircuit = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
>(
    name: Name,
    input: ShortCircuitTaskInput<TrimTaskName<Name>, Input, Output>
) => ShortCircuitTaskDefinition<TrimTaskName<Name>, Input, Output>;
