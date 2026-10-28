import { describe, expect, expectTypeOf, it } from "vitest";

import { createDAG } from "@/core/dag/dag";
import { TRIGGER_RULE_ENUM } from "@/core/trigger-rule";

import { branch } from "./branch";
import { delay } from "./delay";
import { TASK_KIND_ENUM } from "./kind";
import { sensor } from "./sensor";
import { shortCircuit } from "./short-circuit";
import { task } from "./task";
import { trigger } from "./trigger";
import type {
    BranchChoice,
    SchemaOf,
    DelayTaskDefinition,
    SensorTaskDefinition,
    ShortCircuitTaskDefinition,
    TriggerTaskDefinition,
} from "./types";

const context = <Name extends string, Payload = undefined>(
    name: Name,
    payload?: Payload
) => ({
    id: `${name}-id`,
    name,
    // SAFETY: callers pass the payload their definition's schema produced;
    // the helper only threads it through unchanged.
    payload: payload as Payload,
});

describe("sensor tasks", () => {
    it("evaluates the predicate with a task context", async () => {
        let calls = 0;

        const definition = sensor("ready", {
            predicate: async () => {
                calls += 1;

                return true;
            },
            pokeIntervalMs: 10,
        });

        expectTypeOf(definition).toEqualTypeOf<SensorTaskDefinition<"ready">>();
        expect(definition.kind).toBe(TASK_KIND_ENUM.Sensor);
        expect(definition.pokeIntervalMs).toBe(10);
        await expect(
            definition.predicate(context("ready"))
        ).resolves.toBeTruthy();
        expect(calls).toBe(1);
    });

    it("keeps the optional poke interval and metadata", () => {
        const definition = sensor("  ready  ", {
            predicate: () => true,
            description: "Wait for readiness",
            config: { timeout_ms: 500 },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });

        expectTypeOf(definition).toEqualTypeOf<SensorTaskDefinition<"ready">>();
        expect(definition).toMatchObject({
            name: "ready",
            kind: TASK_KIND_ENUM.Sensor,
            description: "Wait for readiness",
            config: { timeout_ms: 500 },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });
        expect(definition.pokeIntervalMs).toBeUndefined();
    });

    it("rejects non-positive poke intervals", () => {
        expect(() =>
            sensor("ready", { predicate: () => true, pokeIntervalMs: 0 })
        ).toThrow("pokeIntervalMs must be greater than 0");
        expect(() =>
            sensor("ready", { predicate: () => true, pokeIntervalMs: -1 })
        ).toThrow("pokeIntervalMs must be greater than 0");
    });

    it("passes the literal task name to the predicate", () => {
        const definition = sensor("  ready  ", {
            predicate: (ctx) => ctx.name === "ready",
        });

        expectTypeOf(definition).toEqualTypeOf<SensorTaskDefinition<"ready">>();
        expect(definition.predicate(context("ready"))).toBeTruthy();
    });

    it("returns false while the predicate is unsatisfied", () => {
        const definition = sensor("ready", { predicate: () => false });

        expect(definition.predicate(context("ready"))).toBeFalsy();
    });

    it("omits the poke interval key when the input omits it", () => {
        const omitted = sensor("ready", { predicate: () => true });

        const explicitUndefined = sensor("ready", {
            predicate: () => true,
            pokeIntervalMs: undefined,
        });

        expect(Object.hasOwn(omitted, "pokeIntervalMs")).toBeFalsy();
        expect(Object.hasOwn(explicitUndefined, "pokeIntervalMs")).toBeFalsy();
    });

    it("accepts a fractional poke interval", () => {
        const definition = sensor("ready", {
            predicate: () => true,
            pokeIntervalMs: 0.5,
        });

        expect(definition.pokeIntervalMs).toBe(0.5);
    });

    it("rejects non-finite poke intervals", () => {
        for (const pokeIntervalMs of [
            Number.NaN,
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
        ]) {
            expect(() =>
                sensor("ready", { predicate: () => true, pokeIntervalMs })
            ).toThrow(TypeError);
        }
    });

    // The polling interval is metadata, so it does not affect the task ID.
    it("reuses a same-name sensor whose interval differs, keeping the first", () => {
        const dag = createDAG("kinds")
            .chain(
                sensor("ready", { predicate: () => true, pokeIntervalMs: 10 })
            )
            .chain(
                sensor("ready", { predicate: () => true, pokeIntervalMs: 20 })
            );

        const registered = dag.getTask("ready");

        expect(dag.tasks.size).toBe(1);

        if (registered?.definition.kind !== TASK_KIND_ENUM.Sensor) {
            throw new Error("Expected a sensor definition");
        }

        expect(registered.definition.pokeIntervalMs).toBe(10);
    });
});

describe("delay tasks", () => {
    it("stores the duration", () => {
        const definition = delay("wait", { durationMs: 25 });

        expectTypeOf(definition).toEqualTypeOf<DelayTaskDefinition<"wait">>();
        expect(definition.kind).toBe(TASK_KIND_ENUM.Delay);
        expect(definition.durationMs).toBe(25);
    });

    it("rejects negative or non-finite durations", () => {
        expect(() => delay("wait", { durationMs: -1 })).toThrow(
            "durationMs must be greater than or equal to 0"
        );
        expect(() => delay("wait", { durationMs: Number.NaN })).toThrow(
            "durationMs must be a finite number"
        );
    });

    it("trims the name", () => {
        const definition = delay("  wait  ", { durationMs: 0 });

        expectTypeOf(definition).toEqualTypeOf<DelayTaskDefinition<"wait">>();
        expect(definition.name).toBe("wait");
    });

    it("accepts a zero duration", () => {
        const definition = delay("wait", { durationMs: 0 });

        expect(definition.durationMs).toBe(0);
        expect(Object.is(definition.durationMs, -0)).toBeFalsy();
    });

    it("preserves a negative zero duration", () => {
        const definition = delay("wait", { durationMs: -0 });

        expect(Object.is(definition.durationMs, -0)).toBeTruthy();
        expect(definition.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("keeps a fractional duration", () => {
        expect(delay("wait", { durationMs: 12.5 }).durationMs).toBe(12.5);
    });

    it("accepts the largest safe integer duration", () => {
        expect(
            delay("wait", { durationMs: Number.MAX_SAFE_INTEGER }).durationMs
        ).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("rejects an infinite duration", () => {
        for (const durationMs of [
            Number.POSITIVE_INFINITY,
            Number.NEGATIVE_INFINITY,
        ]) {
            expect(() => delay("wait", { durationMs })).toThrow(
                "durationMs must be a finite number"
            );
        }
    });

    it("keeps the task's own metadata", () => {
        const definition = delay("wait", {
            durationMs: 100,
            description: "Pause before publishing",
            config: { timeout_ms: 250 },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });

        expect(definition).toMatchObject({
            kind: TASK_KIND_ENUM.Delay,
            name: "wait",
            durationMs: 100,
            description: "Pause before publishing",
            config: { timeout_ms: 250 },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });
    });

    // The duration is part of the behavior source, so it separates identities.
    it("rejects a same-name delay with a different duration", () => {
        const dag = createDAG("kinds").chain(delay("wait", { durationMs: 10 }));

        expect(() => dag.chain(delay("wait", { durationMs: 20 }))).toThrow(
            'Task "wait" already exists in DAG "kinds"'
        );
        expect(dag.tasks.size).toBe(1);
    });

    it("accepts a same-name delay with an identical duration", () => {
        const dag = createDAG("kinds")
            .chain(delay("wait", { durationMs: 10 }))
            .chain(delay("wait", { durationMs: 10 }));

        expect(dag.tasks.size).toBe(1);
    });
});

describe("branch tasks", () => {
    it("returns the chosen branch or branches", async () => {
        const definition = branch("route", {
            choose: async (ctx) =>
                ctx.name === "route" ? (["left", "right"] as const) : "left",
        });

        expectTypeOf(definition.name).toEqualTypeOf<"route">();
        expectTypeOf(definition.branches).toEqualTypeOf<
            readonly string[] | undefined
        >();
        expectTypeOf(definition.output).toEqualTypeOf<
            SchemaOf<BranchChoice<string>> | undefined
        >();
        expect(definition.kind).toBe(TASK_KIND_ENUM.Branch);
        await expect(
            definition.choose(context("route"))
        ).resolves.toStrictEqual(["left", "right"]);
    });

    it("returns a single branch name without wrapping it", () => {
        const definition = branch("route", { choose: () => "left" });

        expect(definition.choose(context("route"))).toBe("left");
    });

    it("passes the literal task name to the chooser", () => {
        const definition = branch("  route  ", {
            choose: (ctx) => (ctx.name === "route" ? "left" : "right"),
        });

        expectTypeOf(definition.name).toEqualTypeOf<"route">();
        expect(definition.name).toBe("route");
        expect(definition.choose(context("route"))).toBe("left");
    });

    it("passes the chosen set through unchanged, including an empty set", () => {
        const definition = branch("route", { choose: () => [] as const });

        expect(definition.choose(context("route"))).toStrictEqual([]);
    });

    it("propagates a rejection from an async chooser", async () => {
        const failure = new Error("chooser failed");

        const definition = branch("route", {
            choose: async () => {
                throw failure;
            },
        });

        await expect(definition.choose(context("route"))).rejects.toBe(failure);
    });

    it("keeps metadata and trims the name", () => {
        const definition = branch("  route  ", {
            choose: () => "left",
            description: "Pick a path",
            config: { strategy: "weighted" },
            triggerRule: TRIGGER_RULE_ENUM.OneSuccess,
        });

        expect(definition).toMatchObject({
            kind: TASK_KIND_ENUM.Branch,
            name: "route",
            description: "Pick a path",
            config: { strategy: "weighted" },
            triggerRule: TRIGGER_RULE_ENUM.OneSuccess,
        });
    });

    it("rejects a same-name branch whose chooser source differs", () => {
        const dag = createDAG("kinds").chain(
            branch("route", { choose: () => "left" })
        );

        expect(() =>
            dag.chain(branch("route", { choose: () => "right" }))
        ).toThrow('Task "route" already exists in DAG "kinds"');
        expect(dag.tasks.size).toBe(1);
    });

    it("includes the task kind in the identity of a same-named task", () => {
        const dag = createDAG("kinds").chain(
            task("route", { fn: () => "raw" })
        );

        expect(() =>
            dag.chain(branch("route", { choose: () => "left" }))
        ).toThrow('Task "route" already exists in DAG "kinds"');
        expect(dag.tasks.size).toBe(1);
    });
});

describe("short-circuit tasks", () => {
    it("returns the condition result", async () => {
        const definition = shortCircuit("gate", {
            condition: async (ctx) => ctx.name === "gate",
        });

        expectTypeOf(definition).toEqualTypeOf<
            ShortCircuitTaskDefinition<"gate", undefined, SchemaOf<boolean>>
        >();
        expect(definition.kind).toBe(TASK_KIND_ENUM.ShortCircuit);
        await expect(
            definition.condition(context("gate"))
        ).resolves.toBeTruthy();
    });

    it("returns false when the condition is unsatisfied", () => {
        const definition = shortCircuit("gate", { condition: () => false });

        expect(definition.condition(context("gate"))).toBeFalsy();
    });

    it("passes the literal task name to the condition", () => {
        const definition = shortCircuit("  gate  ", {
            condition: (ctx) => ctx.name === "gate",
        });

        expectTypeOf(definition).toEqualTypeOf<
            ShortCircuitTaskDefinition<"gate", undefined, SchemaOf<boolean>>
        >();
        expect(definition.name).toBe("gate");
    });

    it("propagates a rejection from an async condition", async () => {
        const failure = new Error("condition failed");

        const definition = shortCircuit("gate", {
            condition: async () => {
                throw failure;
            },
        });

        await expect(definition.condition(context("gate"))).rejects.toBe(
            failure
        );
    });

    it("keeps metadata", () => {
        const definition = shortCircuit("gate", {
            condition: () => true,
            description: "Stop when empty",
            config: { on_skip: "prune" },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });

        expect(definition).toMatchObject({
            kind: TASK_KIND_ENUM.ShortCircuit,
            name: "gate",
            description: "Stop when empty",
            config: { on_skip: "prune" },
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });
    });

    it("rejects a same-name gate whose condition source differs", () => {
        const dag = createDAG("kinds").chain(
            shortCircuit("gate", { condition: () => true })
        );

        expect(() =>
            dag.chain(shortCircuit("gate", { condition: () => false }))
        ).toThrow('Task "gate" already exists in DAG "kinds"');
        expect(dag.tasks.size).toBe(1);
    });
});

describe("trigger tasks", () => {
    it("defaults waitForCompletion", () => {
        const definition = trigger("start", { dagName: "child" });

        expectTypeOf(definition).toEqualTypeOf<
            TriggerTaskDefinition<"start">
        >();
        expect(definition.kind).toBe(TASK_KIND_ENUM.Trigger);
        expect(definition.dagName).toBe("child");
        expect(definition.waitForCompletion).toBeFalsy();
    });

    it("supports waiting for the target DAG", () => {
        const definition = trigger("start", {
            dagName: "child",
            waitForCompletion: true,
        });

        expect(definition.waitForCompletion).toBeTruthy();
    });

    it("rejects an empty target DAG name", () => {
        expect(() => trigger("start", { dagName: "   " })).toThrow(
            "Trigger DAG name cannot be empty"
        );
    });

    it("rejects an empty target DAG name before validating the task name", () => {
        expect(() => trigger("bad name", { dagName: "" })).toThrow(
            "Trigger DAG name cannot be empty"
        );
    });

    it("keeps the target DAG name verbatim", () => {
        expect(trigger("start", { dagName: "  child  " }).dagName).toBe(
            "  child  "
        );
    });

    it("records an explicit false wait flag", () => {
        const definition = trigger("start", {
            dagName: "child",
            waitForCompletion: false,
        });

        expect(definition.waitForCompletion).toBeFalsy();
    });

    it("keeps metadata and trims the task name", () => {
        const definition = trigger("  start  ", {
            dagName: "child",
            description: "Kick off the child DAG",
            config: { retries: 2 },
            triggerRule: TRIGGER_RULE_ENUM.OneFailed,
        });

        expect(definition).toMatchObject({
            kind: TASK_KIND_ENUM.Trigger,
            name: "start",
            dagName: "child",
            waitForCompletion: false,
            description: "Kick off the child DAG",
            config: { retries: 2 },
            triggerRule: TRIGGER_RULE_ENUM.OneFailed,
        });
    });

    it("rejects a same-name trigger targeting a different DAG", () => {
        const dag = createDAG("kinds").chain(
            trigger("start", { dagName: "a" })
        );

        expect(() => dag.chain(trigger("start", { dagName: "b" }))).toThrow(
            'Task "start" already exists in DAG "kinds"'
        );
        expect(dag.tasks.size).toBe(1);
    });

    it("rejects a same-name trigger whose wait flag differs", () => {
        const dag = createDAG("kinds").chain(
            trigger("start", { dagName: "a" })
        );

        expect(() =>
            dag.chain(
                trigger("start", { dagName: "a", waitForCompletion: true })
            )
        ).toThrow('Task "start" already exists in DAG "kinds"');
        expect(dag.tasks.size).toBe(1);
    });

    it("accepts a same-name trigger with identical target and wait flag", () => {
        const dag = createDAG("kinds")
            .chain(trigger("start", { dagName: "a" }))
            .chain(
                trigger("start", { dagName: "a", waitForCompletion: false })
            );

        expect(dag.tasks.size).toBe(1);
    });
});

const kindDefinitions = () => [
    task("extract", { fn: () => 0 }),
    sensor("ready", { predicate: () => true }),
    delay("wait", { durationMs: 1 }),
    branch("route", { choose: () => "left" }),
    shortCircuit("gate", { condition: () => true }),
    trigger("start", { dagName: "child" }),
];

describe("shared metadata", () => {
    it("omits absent optional metadata keys from every kind", () => {
        for (const definition of kindDefinitions()) {
            expect(Object.hasOwn(definition, "description")).toBeFalsy();
            expect(Object.hasOwn(definition, "config")).toBeFalsy();
            expect(definition.triggerRule).toBe(TRIGGER_RULE_ENUM.AllSuccess);
        }
    });

    it("keeps metadata absent rather than undefined in JSON", () => {
        const dag = createDAG("kinds").chain(kindDefinitions());

        for (const taskJson of dag.toJSON().tasks) {
            expect(Object.hasOwn(taskJson, "description")).toBeFalsy();
            expect(Object.hasOwn(taskJson, "config")).toBeFalsy();
        }
    });

    // Metadata is excluded from the behavior source, so it never forks identity.
    it("ignores metadata differences when matching a registered task", () => {
        const dag = createDAG("kinds");

        for (const definition of kindDefinitions()) {
            dag.chain(definition);
        }

        const withMetadata = createDAG("kinds");

        for (const definition of kindDefinitions()) {
            expect(dag.getTask(definition.name)?.id).toBe(
                withMetadata
                    .chain({
                        ...definition,
                        description: "extra",
                        config: { retries: 1 },
                        triggerRule: TRIGGER_RULE_ENUM.OneFailed,
                    })
                    .getTask(definition.name)?.id
            );
        }

        dag.chain(
            sensor("ready", {
                predicate: () => true,
                description: "changed",
                triggerRule: TRIGGER_RULE_ENUM.AllDone,
            })
        );

        expect(dag.tasks.size).toBe(6);
        expect(dag.getTask("ready")?.description).toBeUndefined();
        expect(dag.getTask("ready")?.triggerRule).toBe(
            TRIGGER_RULE_ENUM.AllSuccess
        );
    });

    // `toJSON()` copies config by reference; only stringification can fail.
    it("defers non-serializable config failures to JSON.stringify", () => {
        const cyclic = {
            retries: 1,
            get self() {
                return cyclic;
            },
        };

        const dag = createDAG("kinds").chain(
            task("extract", { fn: () => 0, config: cyclic })
        );

        expect(() => dag.toJSON()).not.toThrow();
        expect(() => JSON.stringify(dag)).toThrow(TypeError);

        const bigint = createDAG("kinds").chain(
            task("extract", { fn: () => 0, config: { retries: 1n } })
        );

        expect(() => bigint.toJSON()).not.toThrow();
        expect(() => JSON.stringify(bigint)).toThrow(TypeError);
    });
});

describe("DAG integration", () => {
    it("registers every task kind and serializes its metadata", () => {
        const dag = createDAG("kinds").chain(
            task("extract", { fn: () => "raw" }),
            sensor("ready", { predicate: () => true, pokeIntervalMs: 5000 }),
            delay("wait", { durationMs: 25 }),
            branch("route", { choose: () => "left" }),
            shortCircuit("gate", { condition: () => true }),
            trigger("start", { dagName: "child", waitForCompletion: true })
        );

        expect(
            dag.topologicalSort().map((registered) => registered.kind)
        ).toStrictEqual([
            TASK_KIND_ENUM.Task,
            TASK_KIND_ENUM.Sensor,
            TASK_KIND_ENUM.Delay,
            TASK_KIND_ENUM.Branch,
            TASK_KIND_ENUM.ShortCircuit,
            TASK_KIND_ENUM.Trigger,
        ]);

        expect(dag.toJSON().tasks).toStrictEqual([
            expect.objectContaining({
                kind: TASK_KIND_ENUM.Task,
                name: "extract",
            }),
            expect.objectContaining({
                kind: TASK_KIND_ENUM.Sensor,
                name: "ready",
                pokeIntervalMs: 5000,
            }),
            expect.objectContaining({
                kind: TASK_KIND_ENUM.Delay,
                name: "wait",
                durationMs: 25,
            }),
            expect.objectContaining({
                kind: TASK_KIND_ENUM.Branch,
                name: "route",
            }),
            expect.objectContaining({
                kind: TASK_KIND_ENUM.ShortCircuit,
                name: "gate",
            }),
            expect.objectContaining({
                kind: TASK_KIND_ENUM.Trigger,
                name: "start",
                dagName: "child",
                waitForCompletion: true,
            }),
        ]);

        const encoded = JSON.stringify(dag);

        expect(encoded).not.toContain('"predicate"');
        expect(encoded).not.toContain('"choose"');
        expect(encoded).not.toContain('"condition"');
    });

    it("omits an absent sensor interval from JSON", () => {
        const dag = createDAG("kinds").chain(
            sensor("ready", { predicate: () => true })
        );

        expect(dag.toJSON().tasks[0]).not.toHaveProperty("pokeIntervalMs");
    });

    it("gives every kind a distinct task ID for the same name", () => {
        const definitions = [
            task("shared", { fn: () => 0 }),
            sensor("shared", { predicate: () => true }),
            delay("shared", { durationMs: 1 }),
            branch("shared", { choose: () => "left" }),
            shortCircuit("shared", { condition: () => true }),
            trigger("shared", { dagName: "child" }),
        ];

        const ids = definitions.map(
            (definition) =>
                createDAG("ids").chain(definition).getTask("shared")?.id
        );

        expect(ids).toHaveLength(6);
        expect(new Set(ids).size).toBe(6);
    });

    // Identity is scoped to name plus behavior source, not to the DAG.
    it("reuses one definition's task ID across DAGs for every kind", () => {
        const definitions = [
            task("extract", { fn: () => 0 }),
            sensor("ready", { predicate: () => true }),
            delay("wait", { durationMs: 1 }),
            branch("route", { choose: () => "left" }),
            shortCircuit("gate", { condition: () => true }),
            trigger("start", { dagName: "child" }),
        ];

        const first = createDAG("first").chain(definitions);
        const second = createDAG("second").chain(definitions);

        expect(first.tasks.size).toBe(6);
        expect(second.tasks.size).toBe(6);

        for (const { name } of definitions) {
            expect(first.getTask(name)?.id).toBe(second.getTask(name)?.id);
        }
    });

    it("chains mixed kinds and records kind-agnostic edges", () => {
        const dag = createDAG("mixed").chain(
            task("extract", { fn: () => "raw" }),
            sensor("ready", { predicate: () => true }),
            delay("wait", { durationMs: 25 }),
            shortCircuit("gate", { condition: () => true }),
            trigger("start", { dagName: "child" })
        );

        expect(dag.topologicalSort().map(({ name }) => name)).toStrictEqual([
            "extract",
            "ready",
            "wait",
            "gate",
            "start",
        ]);

        expect(
            dag.toJSON().tasks.map(({ upstream }) => upstream)
        ).toStrictEqual([[], ["extract"], ["ready"], ["wait"], ["gate"]]);
    });

    it("wires a fan-out and fan-in across different kinds", () => {
        const gate = shortCircuit("gate", { condition: () => true });
        const route = branch("route", { choose: () => "left" });
        const start = trigger("start", { dagName: "child" });

        const dag = createDAG("fan").chain(
            task("extract", { fn: () => 0 }),
            [gate, route],
            start
        );

        const extract = dag.getTask("extract");

        const downstream = [...(extract?.downstream ?? [])].map(
            ({ name }) => name
        );

        expect(downstream).toStrictEqual(["gate", "route"]);
        expect(
            [...(dag.getTask("start")?.upstream ?? [])].map(({ name }) => name)
        ).toStrictEqual(["gate", "route"]);
    });
});
