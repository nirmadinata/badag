import { TASK_KIND_ENUM } from "./kind";
import type { AnyTaskDefinition } from "./types";

/**
 * The behavior callback of a callable kind, or `undefined` for a declarative
 * kind.
 *
 * Two definitions with the same task ID share a behavior source. For callable
 * kinds a shared source does not prove a shared closure, so registration
 * compares these references before treating one definition as a duplicate of
 * the other. Declarative kinds carry every behavior-defining value in their
 * source text, so a matching source is enough.
 */
export function taskBehaviorCallback(definition: AnyTaskDefinition): unknown {
    switch (definition.kind) {
        case TASK_KIND_ENUM.Task: {
            return definition.fn;
        }

        case TASK_KIND_ENUM.Sensor: {
            return definition.predicate;
        }

        case TASK_KIND_ENUM.Branch: {
            return definition.choose;
        }

        case TASK_KIND_ENUM.ShortCircuit: {
            return definition.condition;
        }

        case TASK_KIND_ENUM.Delay:
        case TASK_KIND_ENUM.Trigger: {
            return undefined;
        }

        default: {
            const exhaustiveCheck: never = definition;

            return exhaustiveCheck;
        }
    }
}

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
