import type { TriggerRule } from "../trigger-rule";
import { DEFAULT_TRIGGER_RULE } from "../trigger-rule";
import type { TaskMetadata } from "../types/base";

/**
 * Normalize the metadata shared by every task factory.
 *
 * Optional fields are omitted rather than written as `undefined`, so
 * definition and JSON snapshots stay compact.
 */
export function taskMetadata(
    metadata: Pick<TaskMetadata, "description" | "config" | "triggerRule">
): TaskMetadata & { readonly triggerRule: TriggerRule } {
    const base = {
        triggerRule: metadata.triggerRule ?? DEFAULT_TRIGGER_RULE,
    };

    if (metadata.description !== undefined && metadata.config !== undefined) {
        return {
            ...base,
            description: metadata.description,
            config: metadata.config,
        };
    }

    if (metadata.description !== undefined) {
        return { ...base, description: metadata.description };
    }

    if (metadata.config !== undefined) {
        return { ...base, config: metadata.config };
    }

    return base;
}
