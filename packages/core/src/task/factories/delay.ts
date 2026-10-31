import { assertNonNegativeDuration } from "../definition/duration";
import { taskMetadata } from "../definition/metadata";
import { taskSchemas } from "../definition/schemas";
import { normalizeTaskName } from "../definition/task-name";
import { TASK_KIND_ENUM } from "../kind";
import type { AnySchema, TrimTaskName } from "../types/base";
import type { DelayTaskDefinition, DelayTaskInput } from "../types/delay";

/**
 * Build a delay task definition.
 *
 * The definition stores its duration. The SDK does not wait; a scheduler is
 * responsible for honoring `durationMs`.
 */
export function delay<
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>(
    name: Name,
    input: DelayTaskInput<Input, Output>
): DelayTaskDefinition<TrimTaskName<Name>, Input, Output> {
    assertNonNegativeDuration("durationMs", input.durationMs);

    const definition = {
        kind: TASK_KIND_ENUM.Delay,
        name: normalizeTaskName(name),
        durationMs: input.durationMs,
        ...taskMetadata(input),
        ...taskSchemas(input),
    } satisfies DelayTaskDefinition<TrimTaskName<Name>, Input, Output>;

    return definition;
}
