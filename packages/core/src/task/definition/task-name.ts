import type { TrimTaskName } from "../types/base";

/** Task names are alphanumeric words joined by single dashes or underscores. */
const TASK_NAME_PATTERN = /^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u;

/** Whether an already-trimmed name is a valid task name. */
export function isTaskName(name: string): boolean {
    return TASK_NAME_PATTERN.test(name);
}

/** Validate an already-trimmed task name. */
export function assertTaskName(name: string): void {
    if (!isTaskName(name)) {
        throw new Error(
            `Task name "${name}" must use letters or numbers separated by "-" or "_"`
        );
    }
}

/**
 * Trim surrounding whitespace and validate a task name.
 *
 * Internal whitespace and other punctuation are rejected; words may be joined
 * with a dash or underscore.
 */
export function normalizeTaskName<Name extends string>(
    name: Name
): TrimTaskName<Name> {
    const trimmed = name.trim();

    if (!trimmed) {
        throw new Error("Task name cannot be empty");
    }

    assertTaskName(trimmed);

    // SAFETY: trim() removes the whitespace represented by TrimTaskName.
    return trimmed as TrimTaskName<Name>;
}
