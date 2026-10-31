import type { TASK_KIND_ENUM } from "../kind";
import type {
    AnySchema,
    TaskDefinitionBase,
    TaskMetadata,
    TaskSchemas,
    TrimTaskName,
} from "./base";

/**
 * Input to the trigger factory after the name.
 */
export interface TriggerTaskInput<
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Name of the DAG to trigger.
     */
    readonly dagName: string;
    /**
     * Whether the trigger waits for the target DAG to finish; defaults to false.
     */
    readonly waitForCompletion?: boolean;
}

/**
 * A trigger task definition.
 */
export interface TriggerTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> extends TaskDefinitionBase<
    Name,
    typeof TASK_KIND_ENUM.Trigger,
    Input,
    Output
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
 * Call signature of `trigger()`.
 */
export type CreateTrigger = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>(
    name: Name,
    input: TriggerTaskInput<Input, Output>
) => TriggerTaskDefinition<TrimTaskName<Name>, Input, Output>;
