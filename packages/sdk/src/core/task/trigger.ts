import { TASK_KIND_ENUM } from "./kind";
import { taskMetadata } from "./metadata";
import { taskSchemas } from "./schemas";
import { normalizeTaskName } from "./task-name";
import type {
    AnySchema,
    TriggerTaskDefinition,
    TriggerTaskInput,
    TrimTaskName,
} from "./types";

/**
 * Build a trigger task definition.
 *
 * The stored callback returns the trigger request for a scheduler to execute:
 * the target DAG name and whether to wait for completion. The SDK does not
 * start the target DAG itself.
 */
export function trigger<
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>(
    name: Name,
    input: TriggerTaskInput<Input, Output>
): TriggerTaskDefinition<TrimTaskName<Name>, Input, Output> {
    if (!input.dagName.trim()) {
        throw new Error("Trigger DAG name cannot be empty");
    }

    const normalized = normalizeTaskName(name);
    const waitForCompletion = input.waitForCompletion ?? false;

    const definition = {
        kind: TASK_KIND_ENUM.Trigger,
        name: normalized,
        dagName: input.dagName,
        waitForCompletion,
        ...taskMetadata(input),
        ...taskSchemas(input),
    } satisfies TriggerTaskDefinition<TrimTaskName<Name>, Input, Output>;

    return definition;
}
