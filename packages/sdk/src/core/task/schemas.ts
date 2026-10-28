import type { AnySchema, TaskSchemas } from "./types";

/**
 * Normalize the schemas declared by a task factory.
 *
 * Absent schemas are omitted rather than written as `undefined`, matching
 * `taskMetadata`, so definitions stay compact. The declared schema types are
 * preserved so a definition keeps its inferred payload and result.
 */
export function taskSchemas<Input extends AnySchema, Output extends AnySchema>(
    schemas: TaskSchemas<Input, Output>
): TaskSchemas<Input, Output> {
    const { input, output } = schemas;

    if (input !== undefined && output !== undefined) {
        return { input, output };
    }

    if (input !== undefined) {
        return { input };
    }

    if (output !== undefined) {
        return { output };
    }

    return {};
}
