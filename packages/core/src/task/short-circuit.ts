import { TASK_KIND_ENUM } from "./kind";
import { taskMetadata } from "./metadata";
import { taskSchemas } from "./schemas";
import { normalizeTaskName } from "./task-name";
import type {
    AnySchema,
    SchemaOf,
    ShortCircuitTaskDefinition,
    ShortCircuitTaskInput,
    TrimTaskName,
} from "./types";

/**
 * Build a short-circuit task definition.
 *
 * `condition` is stored on the definition and invoked by the task callback
 * with the task context. The returned boolean tells the scheduler whether
 * downstream tasks should run; the SDK itself does not prune edges.
 */
export function shortCircuit<
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
>(
    name: Name,
    input: ShortCircuitTaskInput<TrimTaskName<Name>, Input, Output>
): ShortCircuitTaskDefinition<TrimTaskName<Name>, Input, Output> {
    const normalized = normalizeTaskName(name);

    const definition = {
        kind: TASK_KIND_ENUM.ShortCircuit,
        name: normalized,
        condition: input.condition,
        ...taskMetadata(input),
        ...taskSchemas(input),
    } satisfies ShortCircuitTaskDefinition<TrimTaskName<Name>, Input, Output>;

    return definition;
}
