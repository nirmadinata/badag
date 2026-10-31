/**
 * Airflow-style bitshift notation for wiring tasks.
 *
 * `a >> b` makes `b` downstream of `a`; `a << b` makes `b` upstream of `a`.
 * Operators are evaluated left to right, and the result of one operator is the
 * left-hand side of the next, so `a >> b << c` wires `a -> b` and `c -> b`.
 *
 * Only the interpolated operands are statically typed. TypeScript infers
 * literal values inside a tagged template but not its literal segments, so the
 * operators are readable at runtime only and every graph check stays in the DAG.
 */

import { DAGTask } from "./registered-task";
import type { TaskLike } from "./registered-task";

/** One operand of a wiring expression: a task, or a flat wiring set of tasks. */
export type WiringOperand = TaskLike | readonly TaskLike[];

/** One wiring step: every task on the left is upstream of every task on the right. */
export type WiringStep = readonly [readonly TaskLike[], readonly TaskLike[]];

/** A parsed expression: its edges, and every task it named in notation order. */
export interface ParsedWiring {
    /**
     * Edges in notation order. A single-operand expression has no steps: it
     * registers the task without wiring anything.
     */
    readonly steps: readonly WiringStep[];
    /**
     * Every operand, flattened in notation order, including duplicates. The
     * DAG registers these before resolving the steps.
     */
    readonly tasks: readonly TaskLike[];
}

const RIGHT_SHIFT = ">>";

const LEFT_SHIFT = "<<";

/** Whitespace around a single operator is allowed; anything else is not. */
const OPERATOR_PATTERN = /^\s*(?<operator>>>|<<)\s*$/u;

/**
 * Render an operand for an error message.
 *
 * `JSON.stringify` quotes strings and prints numbers as typed, which is enough
 * to identify a value that reached the parser from untyped JavaScript.
 */
function describeOperand(value: TaskLike): string {
    try {
        return JSON.stringify(value) ?? String(value);
    } catch {
        return String(value);
    }
}

/**
 * Assert that an operand entry is a task handle or a task definition.
 *
 * The template is typed, but JavaScript callers can interpolate anything, so
 * the parser validates before it hands values to DAG registration.
 */
function assertTaskLike(value: TaskLike, dagName: string): void {
    if (value instanceof DAGTask) {
        return;
    }

    if (
        value !== null &&
        Object.hasOwn(value, "kind") &&
        Object.hasOwn(value, "name")
    ) {
        return;
    }

    throw new TypeError(
        `Wiring expression in DAG "${dagName}" expects tasks; received ${describeOperand(value)}`
    );
}

/**
 * Whether an operand is a wiring set rather than a single task.
 *
 * `Array.isArray` alone does not narrow away the readonly array member of
 * `WiringOperand`, so the predicate is spelled out.
 */
function isWiringSet(operand: WiringOperand): operand is readonly TaskLike[] {
    return Array.isArray(operand);
}

/**
 * Resolve one operand to the wiring set it denotes.
 *
 * A bare task is a set of one. A list is flattened as given; nesting and empty
 * lists are rejected because neither has a meaning in the notation.
 */
function operandTasks(
    operand: WiringOperand,
    dagName: string
): readonly TaskLike[] {
    if (!isWiringSet(operand)) {
        assertTaskLike(operand, dagName);

        return [operand];
    }

    const tasks: TaskLike[] = [];

    for (const entry of operand) {
        if (Array.isArray(entry)) {
            throw new TypeError(
                `Wiring expression in DAG "${dagName}" cannot nest task lists`
            );
        }

        assertTaskLike(entry, dagName);
        tasks.push(entry);
    }

    if (tasks.length === 0) {
        throw new TypeError(
            `Wiring expression in DAG "${dagName}" cannot use an empty task list`
        );
    }

    return tasks;
}

/**
 * Turn a tagged template into wiring steps.
 *
 * Exactly one expression is supported per call: the first and last segments
 * must be empty, and every segment between two operands must be a lone `>>` or
 * `<<`. Newlines carry no meaning, so a second expression needs a second call
 * to `DAG.parse`.
 */
export function parseWiringExpression(
    dagName: string,
    segments: TemplateStringsArray,
    operands: readonly WiringOperand[]
): ParsedWiring {
    const [first] = segments;
    const last = segments.at(-1);

    if (operands.length === 0) {
        throw new Error(
            `Wiring expression in DAG "${dagName}" needs at least one task`
        );
    }

    // Newlines are checked before operators because the operator pattern
    // tolerates surrounding whitespace, and a newline is whitespace.
    for (const segment of segments) {
        if (/[\r\n]/u.test(segment)) {
            throw new Error(
                `Wiring expression in DAG "${dagName}" spans multiple lines; call parse once per expression`
            );
        }
    }

    if (first.trim() !== "") {
        throw new Error(
            `Unexpected "${first}" before the first task in DAG "${dagName}"`
        );
    }

    if (last !== undefined && last.trim() !== "") {
        throw new Error(
            `Unexpected "${last}" after the last task in DAG "${dagName}"`
        );
    }

    const groups = operands.map((operand) => operandTasks(operand, dagName));
    const steps: WiringStep[] = [];

    for (let index = 1; index < groups.length; index += 1) {
        const segment = segments[index];
        const operator = OPERATOR_PATTERN.exec(segment)?.groups?.operator;
        const previous = groups[index - 1];
        const current = groups[index];

        if (operator === RIGHT_SHIFT) {
            steps.push([previous, current]);

            continue;
        }

        if (operator === LEFT_SHIFT) {
            steps.push([current, previous]);

            continue;
        }

        throw new Error(
            `Unrecognized wiring syntax "${segment}" in DAG "${dagName}"; expected ">>" or "<<" between tasks`
        );
    }

    return { steps, tasks: groups.flat() };
}
