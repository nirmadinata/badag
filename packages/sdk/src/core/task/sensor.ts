import { TASK_KIND_ENUM } from "./kind";
import { taskMetadata } from "./metadata";
import { taskSchemas } from "./schemas";
import { normalizeTaskName } from "./task-name";
import type {
    AnySchema,
    SchemaOf,
    SensorTaskDefinition,
    SensorTaskInput,
    TrimTaskName,
} from "./types";
import { assertPositiveDuration } from "./validation";

/**
 * Build a sensor task definition.
 *
 * The definition stores the predicate and an optional polling interval. The
 * SDK does not poll or wait; a scheduler decides when to evaluate the
 * predicate.
 */
export function sensor<
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
>(
    name: Name,
    input: SensorTaskInput<TrimTaskName<Name>, Input, Output>
): SensorTaskDefinition<TrimTaskName<Name>, Input, Output> {
    const normalized = normalizeTaskName(name);
    const { pokeIntervalMs } = input;

    if (pokeIntervalMs !== undefined) {
        assertPositiveDuration("pokeIntervalMs", pokeIntervalMs);
    }

    const definition = {
        kind: TASK_KIND_ENUM.Sensor,
        name: normalized,
        predicate: input.predicate,
        ...taskMetadata(input),
        ...taskSchemas(input),
    } satisfies SensorTaskDefinition<TrimTaskName<Name>, Input, Output>;

    return pokeIntervalMs === undefined
        ? definition
        : { ...definition, pokeIntervalMs };
}
