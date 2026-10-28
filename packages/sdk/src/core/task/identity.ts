import { TASK_KIND_ENUM } from "./kind";
import type { AnyTaskDefinition } from "./types";

/**
 * The behavior source of a task definition: the half of its identity that is
 * not the name.
 *
 * Callable kinds contribute their behavior callback source; declarative kinds
 * contribute their behavior-defining fields. Metadata never contributes.
 */
export function taskBehaviorSource(definition: AnyTaskDefinition): string {
    switch (definition.kind) {
        case TASK_KIND_ENUM.Task: {
            return `${definition.kind}:${definition.fn.toString()}`;
        }

        case TASK_KIND_ENUM.Sensor: {
            return `${definition.kind}:${definition.predicate.toString()}`;
        }

        case TASK_KIND_ENUM.Delay: {
            return `${definition.kind}:${definition.durationMs}`;
        }

        case TASK_KIND_ENUM.Branch: {
            return `${definition.kind}:${JSON.stringify([
                definition.branches,
                definition.choose.toString(),
            ])}`;
        }

        case TASK_KIND_ENUM.ShortCircuit: {
            return `${definition.kind}:${definition.condition.toString()}`;
        }

        case TASK_KIND_ENUM.Trigger: {
            return `${definition.kind}:${JSON.stringify([
                definition.dagName,
                definition.waitForCompletion,
            ])}`;
        }

        default: {
            const exhaustiveCheck: never = definition;

            return exhaustiveCheck;
        }
    }
}
