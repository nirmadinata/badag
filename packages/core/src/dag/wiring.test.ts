import { describe, expect, it } from "vitest";

import { branch } from "../task/branch";
import { delay } from "../task/delay";
import { TASK_KIND_ENUM } from "../task/kind";
import { sensor } from "../task/sensor";
import { shortCircuit } from "../task/short-circuit";
import { task as createTask } from "../task/task";
import { trigger } from "../task/trigger";
import { TRIGGER_RULE_ENUM } from "../trigger-rule";
import { createDAG } from "./dag";
import type { DAG } from "./dag";
import type { DAGTask, TaskLike } from "./dag-task";
import { parseWiringExpression } from "./wiring";
import type { WiringOperand } from "./wiring";

// Callback identity is reference-based, so duplicate definitions must share it.
const rawFn = (): string => "raw";

// Captures its argument, so every call produces the same callback source text.
const syncTableFn = (table: string) => () => table;

function downstreamNames(dag: DAG): Record<string, string[]> {
    return Object.fromEntries(
        [...dag.tasks.values()].map((task) => [
            task.name,
            [...task.downstream]
                .map((downstream) => downstream.name)
                .toSorted(),
        ])
    );
}

function namesOf(dag: DAG): string[] {
    return dag.topologicalSort().map((task) => task.name);
}

function requireTask(dag: DAG, name: string): DAGTask<string> {
    const task = dag.getTask(name);

    if (task === undefined) {
        throw new Error(`Task "${name}" was not registered`);
    }

    return task;
}

function buildChain() {
    const a = createTask("a", { fn: () => "a" });
    const b = createTask("b", { fn: () => "b" });
    const c = createTask("c", { fn: () => "c" });
    const dag = createDAG("etl").parse`${a} >> ${b} >> ${c}`;

    return {
        a: requireTask(dag, "a"),
        b: requireTask(dag, "b"),
        c: requireTask(dag, "c"),
        dag,
    };
}

const parse = (
    segments: TemplateStringsArray,
    ...operands: readonly WiringOperand[]
) => parseWiringExpression("etl", segments, operands);

const named = (
    segments: TemplateStringsArray,
    ...operands: readonly WiringOperand[]
) => parseWiringExpression("analytics-nightly", segments, operands);

/**
 * Build the segment array a tagged template would supply.
 *
 * Operator probes need text that cannot be written as an interpolation, since
 * an interpolated value becomes an operand rather than a segment.
 */
function templateSegments(parts: readonly string[]): TemplateStringsArray {
    const segments = [...parts];

    // SAFETY: a tagged template supplies exactly a string array plus a `raw`
    // string array; the parser reads neither `raw` nor any other property.
    return Object.assign(segments, { raw: segments }) as TemplateStringsArray;
}

describe("wiring expression parser", () => {
    const a = createTask("a", { fn: () => "a" });
    const b = createTask("b", { fn: () => "b" });
    const c = createTask("c", { fn: () => "c" });

    it("reads >> as left to right", () => {
        const { steps } = parse`${a} >> ${b} >> ${c}`;

        expect(steps).toStrictEqual([
            [[a], [b]],
            [[b], [c]],
        ]);
    });

    it("reads << as right to left", () => {
        const { steps } = parse`${a} << ${b} << ${c}`;

        expect(steps).toStrictEqual([
            [[b], [a]],
            [[c], [b]],
        ]);
    });

    it("composes mixed operators left to right", () => {
        const mixed = parse`${a} >> ${b} << ${c}`;
        const sets = parse`${[a, c]} >> ${b}`;

        expect(mixed.steps).toStrictEqual([
            [[a], [b]],
            [[c], [b]],
        ]);
        expect(sets.steps).toStrictEqual([[[a, c], [b]]]);
    });

    it("flattens a wiring set into one side of a step", () => {
        const { steps, tasks } = parse`${[a, b]} >> ${[c]}`;

        expect(steps).toStrictEqual([[[a, b], [c]]]);
        expect(tasks).toStrictEqual([a, b, c]);
    });

    it("returns no steps for a single operand", () => {
        const { steps, tasks } = parse`${a}`;

        expect(steps).toStrictEqual([]);
        expect(tasks).toStrictEqual([a]);
    });

    it("allows whitespace around an operator", () => {
        expect(parse`${a}>>${b}`.steps).toStrictEqual([[[a], [b]]]);
        expect(parse`${a}   >>   ${b}`.steps).toStrictEqual([[[a], [b]]]);
    });

    it("rejects an empty expression", () => {
        expect(() => parse``).toThrow(
            'Wiring expression in DAG "etl" needs at least one task'
        );
    });

    it("rejects text before the first operand", () => {
        expect(() => parse`a ${a} >> ${b}`).toThrow(
            'Unexpected "a " before the first task in DAG "etl"'
        );
    });

    it("rejects text after the last operand", () => {
        expect(() => parse`${a} >> ${b} b`).toThrow(
            'Unexpected " b" after the last task in DAG "etl"'
        );
    });

    it("rejects adjacent operands without an operator", () => {
        expect(() => parse`${a} ${b}`).toThrow(
            /Unrecognized wiring syntax " " in DAG "etl"; expected ">>" or "<<" between tasks/u
        );
    });

    it("rejects an unknown operator", () => {
        expect(() => parse`${a} & ${b}`).toThrow(
            /Unrecognized wiring syntax " & " in DAG "etl"/u
        );
    });

    it("rejects a doubled operator", () => {
        expect(() => parse`${a} >> >> ${b}`).toThrow(
            /Unrecognized wiring syntax/u
        );
    });

    it("rejects a multiline expression", () => {
        expect(
            () => parse`${a} >> ${b}
${c} >> ${a}`
        ).toThrow(
            'Wiring expression in DAG "etl" spans multiple lines; call parse once per expression'
        );
    });

    it("rejects nested task lists", () => {
        expect(
            () =>
                // @ts-expect-error - deliberately malformed for the runtime guard
                parse`${[a, [b]]} >> ${c}`
        ).toThrow('Wiring expression in DAG "etl" cannot nest task lists');
    });

    it("rejects an empty task list", () => {
        expect(() => parse`${a} >> ${[]}`).toThrow(
            'Wiring expression in DAG "etl" cannot use an empty task list'
        );
    });

    it("rejects a non-task operand", () => {
        expect(
            () =>
                // @ts-expect-error - deliberately malformed for the runtime guard
                parse`${"task"} >> ${b}`
        ).toThrow(
            'Wiring expression in DAG "etl" expects tasks; received "task"'
        );
    });

    it("rejects a non-task entry inside a task list", () => {
        expect(
            () =>
                // @ts-expect-error - deliberately malformed for the runtime guard
                parse`${[a, 3]} >> ${b}`
        ).toThrow('Wiring expression in DAG "etl" expects tasks; received 3');
    });

    it("rejects the remaining unknown operators", () => {
        for (const operator of [
            " & ",
            " | ",
            " + ",
            " -> ",
            " >>> ",
            " <<< ",
            " = ",
            " !== ",
        ]) {
            expect(() =>
                parseWiringExpression(
                    "etl",
                    templateSegments(["", operator, ""]),
                    [a, b]
                )
            ).toThrow(/Unrecognized wiring syntax/u);
        }
    });

    it("rejects a single-character fragment of an operator", () => {
        expect(() => parse`${a} > ${b}`).toThrow(
            'Unrecognized wiring syntax " > " in DAG "etl"; expected ">>" or "<<" between tasks'
        );
        expect(() => parse`${a} < ${b}`).toThrow(
            'Unrecognized wiring syntax " < " in DAG "etl"; expected ">>" or "<<" between tasks'
        );
    });

    it("rejects a dangling trailing operator", () => {
        expect(() => parse`${a} >> ${b} >>`).toThrow(
            'Unexpected " >>" after the last task in DAG "etl"'
        );
        expect(() => parse`${a} >> ${b} >> >>`).toThrow(
            'Unexpected " >> >>" after the last task in DAG "etl"'
        );
    });

    it("rejects a newline around or between operands", () => {
        const message =
            'Wiring expression in DAG "etl" spans multiple lines; call parse once per expression';

        expect(() => parse`${a}\n>> ${b}`).toThrow(message);
        expect(() => parse`${a} >>\n${b}`).toThrow(message);
        expect(() => parse`\n${a} >> ${b}`).toThrow(message);
        expect(() => parse`${a} >> ${b}\r\n`).toThrow(message);
    });

    it("rejects a template that wraps one expression over several lines", () => {
        const message =
            'Wiring expression in DAG "etl" spans multiple lines; call parse once per expression';

        expect(() => parse`${a}\n>>\n${b}`).toThrow(message);
        expect(
            () => parse`${a} >> ${b}
${c} >> ${a}`
        ).toThrow(message);
    });

    it("accepts a tab between an operator and an operand", () => {
        expect(parse`${a}\t>>\t${b}`.steps).toStrictEqual([[[a], [b]]]);
    });

    it("keeps a repeated operand in the task list", () => {
        const { steps, tasks } = parse`${a} >> ${a}`;

        expect(steps).toStrictEqual([[[a], [a]]]);
        expect(tasks).toStrictEqual([a, a]);
    });

    it("keeps duplicates inside one wiring set", () => {
        const { steps } = parse`${[a, a]} >> ${b}`;

        expect(steps).toStrictEqual([[[a, a], [b]]]);
    });

    it("preserves operand order across the flattened task list", () => {
        const { tasks } = parse`${[b, a]} >> ${c}`;

        expect(tasks).toStrictEqual([b, a, c]);
    });

    it("returns one step per operator for a long chain", () => {
        const d = createTask("d", { fn: () => "d" });
        const e = createTask("e", { fn: () => "e" });
        const { steps } = parse`${a} >> ${b} >> ${c} >> ${d} >> ${e}`;

        expect(steps).toStrictEqual([
            [[a], [b]],
            [[b], [c]],
            [[c], [d]],
            [[d], [e]],
        ]);
    });

    it("produces the same edges as the mirrored >> expression", () => {
        const leftward = parse`${a} << ${b} << ${c}`;
        const rightward = parse`${c} >> ${b} >> ${a}`;

        expect(leftward.steps).toStrictEqual([
            [[b], [a]],
            [[c], [b]],
        ]);
        expect(leftward.steps.toReversed()).toStrictEqual(rightward.steps);
    });

    it("includes the DAG name in every message", () => {
        expect(() => named`${a} & ${b}`).toThrow(/"analytics-nightly"/u);
        expect(() => named`${a} >> ${[]}`).toThrow(/"analytics-nightly"/u);
        expect(() => named``).toThrow(/"analytics-nightly"/u);
    });

    it("rejects a null operand", () => {
        expect(
            () =>
                // @ts-expect-error - deliberately malformed for the runtime guard
                parse`${null} >> ${b}`
        ).toThrow(
            'Wiring expression in DAG "etl" expects tasks; received null'
        );
    });

    it("rejects an object that is not a task definition", () => {
        expect(
            () =>
                // @ts-expect-error - deliberately malformed for the runtime guard
                parse`${{ name: "n" }} >> ${b}`
        ).toThrow(/expects tasks; received/u);
    });
});

describe("DAG.parse", () => {
    it("wires a left-to-right chain", () => {
        const { dag } = buildChain();

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b"],
            b: ["c"],
            c: [],
        });
        expect(namesOf(dag)).toStrictEqual(["a", "b", "c"]);
    });

    it("wires a diamond from one expression", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });
        const d = createTask("d", { fn: () => "d" });

        const dag = createDAG("etl").parse`${a} >> ${[b, c]} >> ${d}`;

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b", "c"],
            b: ["d"],
            c: ["d"],
            d: [],
        });
    });

    it("treats a >> b << c as [a, c] >> b", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });

        const mixed = createDAG("mixed").parse`${a} >> ${b} << ${c}`;
        const sets = createDAG("sets").parse`${[a, c]} >> ${b}`;

        expect(downstreamNames(mixed)).toStrictEqual(downstreamNames(sets));
        expect(downstreamNames(mixed)).toStrictEqual({
            a: ["b"],
            b: [],
            c: ["b"],
        });
    });

    it("registers a task from a single operand without wiring it", () => {
        const lonely = createTask("lonely", { fn: () => "lonely" });
        const dag = createDAG("etl").parse`${lonely}`;

        expect([...dag.tasks.keys()]).toStrictEqual(["lonely"]);
        expect(downstreamNames(dag)).toStrictEqual({ lonely: [] });
    });

    it("accepts handles and definitions together", () => {
        const { a, dag } = buildChain();
        const d = createTask("d", { fn: () => "d" });

        expect(dag.parse`${a} >> ${d}`).toBe(dag);
        expect(downstreamNames(dag).a).toStrictEqual(["b", "d"]);
    });

    it("accepts an already registered handle", () => {
        const first = createTask("first", { fn: () => "first" });
        const second = createTask("second", { fn: () => "second" });
        const dag = createDAG("etl").parse`${first} >> ${second}`;

        expect(
            dag.parse`${requireTask(dag, "first")} >> ${requireTask(dag, "second")}`
        ).toBe(dag);
        expect(downstreamNames(dag)).toStrictEqual({
            first: ["second"],
            second: [],
        });
    });

    it("returns the same instance so calls keep chaining", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });
        const dag = createDAG("etl");

        const chained = dag.parse`${a} >> ${b}`.parse`${b} >> ${c}`;

        expect(chained).toBe(dag);
        expect(namesOf(dag)).toStrictEqual(["a", "b", "c"]);
    });

    it("rejects a self-edge", () => {
        const { a, dag } = buildChain();

        expect(() => dag.parse`${a} >> ${a}`).toThrow(
            "A task cannot depend on itself"
        );
    });

    it("rejects a cycle closed by a later parse call", () => {
        const { a, b, dag } = buildChain();

        expect(() => dag.parse`${b} >> ${a}`).toThrow(
            'Dependency "b" -> "a" creates a cycle'
        );
    });

    it("rejects a cycle inside one expression", () => {
        const { a, b, c, dag } = buildChain();

        expect(() => dag.parse`${c} >> ${a} >> ${b}`).toThrow(
            'Dependency "c" -> "a" creates a cycle'
        );
    });

    it("rejects a cycle inside one wiring set", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const dag = createDAG("etl").parse`${a} >> ${b}`;

        expect(() => dag.parse`${[a, b]} >> ${[a, b]}`).toThrow(
            "A task cannot depend on itself"
        );
    });

    it("rejects a handle from another DAG", () => {
        const other = createDAG("other")
            .parse`${createTask("x", { fn: () => "x" })}`;

        const foreign = requireTask(other, "x");
        const { dag } = buildChain();

        expect(() => dag.parse`${foreign} >> ${requireTask(dag, "a")}`).toThrow(
            "Both tasks must belong to this DAG"
        );
    });

    it("rolls back tasks and edges when a step is rejected", () => {
        const { dag } = buildChain();
        const fresh = createTask("fresh", { fn: () => "fresh" });
        const cycle = requireTask(dag, "a");

        expect(() => dag.parse`${fresh} >> ${cycle} >> ${fresh}`).toThrow(
            /creates a cycle/u
        );
        expect(dag.getTask("fresh")).toBeUndefined();
        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b"],
            b: ["c"],
            c: [],
        });
    });

    it("leaves the graph unchanged when the notation is malformed", () => {
        const { a, dag } = buildChain();
        const fresh = createTask("fresh", { fn: () => "fresh" });

        expect(() => dag.parse`${fresh} & ${a}`).toThrow(
            /Unrecognized wiring syntax/u
        );
        expect(dag.getTask("fresh")).toBeUndefined();
    });

    it("rejects a task name collision without registering", () => {
        const { dag } = buildChain();
        const collision = createTask("a", { fn: () => "other" });

        expect(
            () => dag.parse`${collision} >> ${createTask("z", { fn: () => 0 })}`
        ).toThrow('Task "a" already exists in DAG "etl"');
        expect(dag.getTask("z")).toBeUndefined();
    });

    it("is idempotent for an expression repeated in full", () => {
        const { a, b, dag } = buildChain();

        expect(dag.parse`${a} >> ${b}`).toBe(dag);
        expect(downstreamNames(dag).a).toStrictEqual(["b"]);
    });

    it("enforces declared branch wiring", () => {
        const empty = branch("empty", {
            branches: [],
            choose: () => [],
        });

        const us = createTask("us", { fn: () => "us" });
        const eu = createTask("eu", { fn: () => "eu" });

        const dag = createDAG("etl");

        // A branch that declares no `branches` at all stays unconstrained.
        const route = branch("route", { choose: () => "us" as const });

        expect(dag.parse`${route} >> ${us}`).toBe(dag);
        expect(downstreamNames(dag).route).toStrictEqual(["us"]);

        expect(() => dag.parse`${empty} >> ${us}`).toThrow(
            'Branch "empty" cannot route to "us"; it declares no branches'
        );

        const declared = branch("declared", {
            branches: ["us", "eu"],
            choose: () => "us" as const,
        });

        expect(dag.parse`${declared} >> ${[us, eu]}`).toBe(dag);
        expect(downstreamNames(dag).declared).toStrictEqual(["eu", "us"]);
    });

    it("wires many-to-many sets", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });
        const d = createTask("d", { fn: () => "d" });
        const dag = createDAG("etl").parse`${[a, b]} >> ${[c, d]}`;

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["c", "d"],
            b: ["c", "d"],
            c: [],
            d: [],
        });
    });

    it("builds one graph across parse and chain calls", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });
        const d = createTask("d", { fn: () => "d" });

        const dag = createDAG("etl").chain(a, b).parse`${b} >> ${[c, d]}`;

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b"],
            b: ["c", "d"],
            c: [],
            d: [],
        });
        expect(namesOf(dag)).toStrictEqual(["a", "b", "c", "d"]);
    });

    it("continues a parse-built graph through chain", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });

        const dag = createDAG("etl").parse`${a} >> ${b}`.chain(b, c);

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b"],
            b: ["c"],
            c: [],
        });
    });

    it("keeps the source order of independent wiring", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });

        const dag = createDAG("etl").parse`${a}`.parse`${b}`;

        expect([...dag.tasks.keys()]).toStrictEqual(["a", "b"]);
    });

    it("preserves definition metadata registered through parse", () => {
        const extract = createTask("extract", {
            fn: () => "raw",
            description: "Read source data",
            config: { timeout_ms: 500 },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });

        const dag = createDAG("etl")
            .parse`${extract} >> ${createTask("load", { fn: () => "stored" })}`;

        const handle = requireTask(dag, "extract");

        expect(handle.description).toBe("Read source data");
        expect(handle.config).toStrictEqual({ timeout_ms: 500 });
        expect(handle.triggerRule).toBe(TRIGGER_RULE_ENUM.AllDone);
        expect(handle.definition).toBe(extract);
    });

    it("assigns the same task ID as chain for the same definition", () => {
        const definition = createTask("extract", { fn: () => "raw" });

        const viaParse = requireTask(
            createDAG("parse").parse`${definition}`,
            "extract"
        );

        const viaChain = requireTask(
            createDAG("chain").chain(definition),
            "extract"
        );

        expect(viaParse.id).toBe(viaChain.id);
    });

    it("registers every task kind through the notation", () => {
        const regular = createTask("regular", { fn: () => 0 });
        const ready = sensor("ready", { predicate: () => true });
        const settle = delay("settle", { durationMs: 1000 });
        const route = shortCircuit("gate", { condition: () => false });
        const start = trigger("start-child", { dagName: "child" });

        const dag = createDAG("kinds")
            .parse`${regular} >> ${ready} >> ${settle} >> ${route} >> ${start}`;

        expect(dag.topologicalSort().map((task) => task.kind)).toStrictEqual([
            TASK_KIND_ENUM.Task,
            TASK_KIND_ENUM.Sensor,
            TASK_KIND_ENUM.Delay,
            TASK_KIND_ENUM.ShortCircuit,
            TASK_KIND_ENUM.Trigger,
        ]);
    });

    it("serializes upstream and downstream names after parse", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });

        const json = createDAG("etl").parse`${a} >> ${b} << ${c}`.toJSON();

        expect(
            json.tasks.map((task) => [
                task.name,
                task.upstream,
                task.downstream,
            ])
        ).toStrictEqual([
            ["a", [], ["b"]],
            ["b", ["a", "c"], []],
            ["c", [], ["b"]],
        ]);
    });

    it("routes a declared branch set with a left-shift operator", () => {
        const declared = branch("declared", {
            branches: ["us", "eu"],
            choose: () => "us" as const,
        });

        const us = createTask("us", { fn: () => "us" });
        const eu = createTask("eu", { fn: () => "eu" });

        const dag = createDAG("etl").parse`${[us, eu]} << ${declared}`;

        expect(downstreamNames(dag).declared).toStrictEqual(["eu", "us"]);
    });

    it("accepts readonly operand tuples", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });

        const pair = [a, b] as const;
        const dag = createDAG("etl").parse`${pair} >> ${c}`;

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["c"],
            b: ["c"],
            c: [],
        });
    });

    it("accepts dashed and unicode task names", () => {
        const first = createTask("extract-daily", { fn: () => 0 });
        const second = createTask("ünïcode_task", { fn: () => 0 });
        const dag = createDAG("etl").parse`${first} >> ${second}`;

        expect([...dag.tasks.keys()]).toStrictEqual([
            "extract-daily",
            "ünïcode_task",
        ]);
        expect(downstreamNames(dag)["extract-daily"]).toStrictEqual([
            "ünïcode_task",
        ]);
    });

    it("keeps a duplicate definition's metadata from the first registration", () => {
        const first = createTask("extract", {
            fn: rawFn,
            description: "first",
        });

        const duplicate = createTask("extract", {
            fn: rawFn,
            description: "second",
        });

        const dag = createDAG("etl").parse`${first}`;

        expect(dag.parse`${duplicate}`).toBe(dag);
        expect(requireTask(dag, "extract").description).toBe("first");
        expect(dag.tasks.size).toBe(1);
    });

    it("rejects a capture-only duplicate in a wiring expression", () => {
        const customers = createTask("sync", {
            fn: syncTableFn("customers"),
        });

        const dag = createDAG("etl").parse`${customers}`;

        expect(
            () =>
                dag.parse`${createTask("sync", { fn: syncTableFn("orders") })}`
        ).toThrow(/different callback instance/u);
        expect(dag.tasks.size).toBe(1);
    });

    it("rejects a self edge created across two wiring sets", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const c = createTask("c", { fn: () => "c" });
        const dag = createDAG("etl").parse`${a} >> ${b}`;

        expect(() => dag.parse`${[a, b]} >> ${[b, c]}`).toThrow(
            "A task cannot depend on itself"
        );
    });

    it("rejects a cycle across mixed operators", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const dag = createDAG("etl").parse`${a} >> ${b}`;

        expect(() => dag.parse`${a} << ${b}`).toThrow(
            'Dependency "b" -> "a" creates a cycle'
        );
    });

    it("rejects a foreign handle inside a wiring set", () => {
        const other = createDAG("other")
            .parse`${createTask("x", { fn: () => "x" })}`;

        const foreign = requireTask(other, "x");
        const local = createTask("local", { fn: () => 0 });

        const dag = createDAG("etl");

        expect(
            () =>
                dag.parse`${[local, foreign]} >> ${createTask("sink", { fn: () => 0 })}`
        ).toThrow("Both tasks must belong to this DAG");
        expect(dag.tasks.size).toBe(0);
    });

    it("stays usable after a rejected expression", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const dag = createDAG("etl").parse`${a} >> ${b}`;

        expect(() => dag.parse`${b} >> ${a}`).toThrow(/creates a cycle/u);

        expect(dag.parse`${a} >> ${createTask("c", { fn: () => "c" })}`).toBe(
            dag
        );
        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b", "c"],
            b: [],
            c: [],
        });
    });

    it("rejects a name collision with a task registered by parse", () => {
        const a = createTask("a", { fn: () => "a" });
        const b = createTask("b", { fn: () => "b" });
        const dag = createDAG("etl").parse`${a}`;

        expect(
            () => dag.parse`${b} >> ${createTask("a", { fn: () => "other" })}`
        ).toThrow('Task "a" already exists in DAG "etl"');
        expect(dag.getTask("b")).toBeUndefined();
    });

    it("rejects an empty wiring set on either side", () => {
        const a = createTask("a", { fn: () => "a" });
        const dag = createDAG("etl");

        expect(() => dag.parse`${[]} >> ${a}`).toThrow(
            'Wiring expression in DAG "etl" cannot use an empty task list'
        );
        expect(() => dag.parse`${a} >> ${[]}`).toThrow(
            'Wiring expression in DAG "etl" cannot use an empty task list'
        );
        expect(dag.tasks.size).toBe(0);
    });

    it("registers a wiring set longer than the static check limit", () => {
        const definitions = Array.from({ length: 42 }, (_, index) =>
            createTask(`t${String(index).padStart(2, "0")}`, {
                fn: () => index,
            })
        );

        const dag = createDAG("long").parse`${definitions}`;

        expect(dag.tasks.size).toBe(42);
        expect(dag.topologicalSort()).toHaveLength(42);
    });

    it("wires a chain longer than the static check limit", () => {
        const definitions = Array.from({ length: 42 }, (_, index) =>
            createTask(`t${String(index).padStart(2, "0")}`, {
                fn: () => index,
            })
        );

        const segments: string[] = [];
        const operands: TaskLike[] = [];

        for (const [index, definition] of definitions.entries()) {
            if (index > 0) {
                segments.push(" >> ");
            }

            operands.push(definition);
        }

        const dag = createDAG("long").parse(
            templateSegments(["", ...segments, ""]),
            ...operands
        );

        expect(dag.tasks.size).toBe(42);
        expect(namesOf(dag)).toStrictEqual(
            definitions.map((definition) => definition.name)
        );
    });

    it("requires a declared branch set to be routed completely", () => {
        const declared = branch("declared", {
            branches: ["us", "eu"],
            choose: () => "us" as const,
        });

        const us = createTask("us", { fn: () => "us" });

        const dag = createDAG("etl");

        expect(() => dag.parse`${declared} >> ${us}`).toThrow(
            'Branch "declared" must route to declared branch "eu"'
        );
        expect(dag.tasks.size).toBe(0);
    });
});
