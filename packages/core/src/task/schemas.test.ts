import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as v from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";

import { createDAG } from "@/dag/dag";

import { branch } from "./branch";
import { delay } from "./delay";
import { taskBehaviorSource } from "./identity";
import { sensor } from "./sensor";
import { shortCircuit } from "./short-circuit";
import { task } from "./task";
import { trigger } from "./trigger";
import type {
    DelayTaskDefinition,
    SensorTaskDefinition,
    ShortCircuitTaskDefinition,
    TaskProducedOf,
    TriggerTaskDefinition,
} from "./types";

const warehouseInput = v.object({
    warehouseId: v.string(),
    rows: v.number(),
});

const warehouseOutput = v.object({
    warehouseId: v.string(),
    rows: v.number(),
});

describe("input and output schemas", () => {
    it("types ctx.payload from an input schema", () => {
        const definition = task("sync", {
            fn: (ctx) => ctx.payload.rows * 2,
            input: warehouseInput,
        });

        expectTypeOf(definition.fn).toEqualTypeOf<
            (ctx: {
                readonly id: string;
                readonly name: "sync";
                readonly payload: { warehouseId: string; rows: number };
            }) => number
        >();
        expect(
            definition.fn({
                id: "sync-id",
                name: "sync",
                payload: { warehouseId: "w1", rows: 21 },
            })
        ).toBe(42);
    });

    it("defaults the payload to undefined without an input schema", () => {
        const definition = task("plain", { fn: (ctx) => ctx.payload });

        expectTypeOf(definition.fn).toEqualTypeOf<
            (ctx: {
                readonly id: string;
                readonly name: "plain";
                readonly payload: undefined;
            }) => undefined
        >();
        expect(
            definition.fn({ id: "plain-id", name: "plain", payload: undefined })
        ).toBeUndefined();
    });

    it("constrains the returned value with an output schema", () => {
        const definition = task("count", {
            fn: () => "42",
            output: v.string(),
        });

        expectTypeOf(definition.fn).returns.toEqualTypeOf<string>();
        expect(() =>
            task("bad", {
                // @ts-expect-error - the output schema requires a string
                fn: () => 42,
                output: v.string(),
            })
        ).not.toThrow();
    });

    it("stores the declared schemas on the definition", () => {
        const definition = task("sync", {
            fn: () => "ok",
            input: warehouseInput,
            output: v.string(),
        });

        expect(definition.input).toBe(warehouseInput);
        expect(definition.output).toBeDefined();
        expect(definition.output?.["~standard"].validate("ok")).toStrictEqual({
            value: "ok",
            typed: true,
        });
    });

    it("omits schema properties when none are declared", () => {
        const definition = task("plain", { fn: () => 0 });

        expect("input" in definition).toBeFalsy();
        expect("output" in definition).toBeFalsy();
    });

    it("keeps only the declared schema", () => {
        const onlyInput = task("in-only", {
            fn: () => 0,
            input: warehouseInput,
        });

        const onlyOutput = task("out-only", {
            fn: () => 0,
            output: v.number(),
        });

        expect("input" in onlyInput).toBeTruthy();
        expect("output" in onlyInput).toBeFalsy();
        expect("input" in onlyOutput).toBeFalsy();
        expect("output" in onlyOutput).toBeTruthy();
    });

    it("types payloads on every callback kind", () => {
        const sensorDefinition = sensor("ready", {
            predicate: (ctx) => ctx.payload.rows > 0,
            input: warehouseInput,
        });

        const branchDefinition = branch("route", {
            choose: (ctx) => (ctx.payload.rows > 0 ? "big" : "small"),
            input: warehouseInput,
        });

        const gateDefinition = shortCircuit("gate", {
            condition: (ctx) => ctx.payload.rows > 0,
            input: warehouseInput,
        });

        expect(
            sensorDefinition.predicate({
                id: "ready-id",
                name: "ready",
                payload: { warehouseId: "w1", rows: 3 },
            })
        ).toBeTruthy();
        expect(
            branchDefinition.choose({
                id: "route-id",
                name: "route",
                payload: { warehouseId: "w1", rows: 0 },
            })
        ).toBe("small");
        expect(
            gateDefinition.condition({
                id: "gate-id",
                name: "gate",
                payload: { warehouseId: "w1", rows: 1 },
            })
        ).toBeTruthy();
    });

    it("defaults declarative kinds to no schemas", () => {
        const delayed = delay("wait", { durationMs: 5 });
        const started = trigger("start", { dagName: "child" });

        expect("input" in delayed).toBeFalsy();
        expect("output" in delayed).toBeFalsy();
        expect("input" in started).toBeFalsy();
        expect("output" in started).toBeFalsy();
    });

    it("accepts schemas on declarative kinds", () => {
        const delayed = delay("wait", {
            durationMs: 5,
            input: warehouseInput,
            output: v.string(),
        });

        const started = trigger("start", {
            dagName: "child",
            input: warehouseInput,
        });

        expect(delayed.input).toBe(warehouseInput);
        expect(started.input).toBe(warehouseInput);
    });
});

describe("kind-specific produced values", () => {
    it("infers branch names from the branches tuple", () => {
        const definition = branch("route", {
            branches: ["left", "right"],
            choose: () => "left",
        });

        expectTypeOf(definition.branches).toEqualTypeOf<
            readonly ["left", "right"] | undefined
        >();
        expect(definition.branches).toStrictEqual(["left", "right"]);
    });

    it("rejects a chosen branch outside the branches tuple", () => {
        expect(() =>
            branch("route", {
                branches: ["left", "right"],
                // @ts-expect-error - "middle" is not a declared branch
                choose: () => "middle",
            })
        ).not.toThrow();
    });

    it("defaults a branch output to its chosen names", () => {
        const definition = branch("route", {
            branches: ["left", "right"],
            choose: () => "left",
        });

        expectTypeOf(definition.output).toEqualTypeOf<
            | StandardSchemaV1<
                  "left" | "right" | readonly ("left" | "right")[],
                  "left" | "right" | readonly ("left" | "right")[]
              >
            | undefined
        >();
    });

    it("defaults a sensor output to boolean", () => {
        const definition = sensor("ready", { predicate: () => true });

        expectTypeOf(definition).toEqualTypeOf<
            SensorTaskDefinition<"ready", undefined, StandardSchemaV1<boolean>>
        >();
    });

    it("defaults a short-circuit output to boolean", () => {
        const definition = shortCircuit("gate", { condition: () => true });

        expectTypeOf(definition).toEqualTypeOf<
            ShortCircuitTaskDefinition<
                "gate",
                undefined,
                StandardSchemaV1<boolean>
            >
        >();
    });

    it("reads the produced value back from a declared output schema", () => {
        const definition = task("sync", {
            fn: () => ({ warehouseId: "w1", rows: 1 }),
            output: warehouseOutput,
        });

        // `output` is an optional property, so its type is
        // `Schema | undefined`. Reading it back must not collapse to
        // `unknown` through the absent-schema branch.
        expectTypeOf<TaskProducedOf<typeof definition.output>>().toEqualTypeOf<{
            warehouseId: string;
            rows: number;
        }>();
    });

    it("reads the produced value back from a kind default", () => {
        const ready = sensor("ready", { predicate: () => true });
        const gate = shortCircuit("gate", { condition: () => true });

        expectTypeOf<
            TaskProducedOf<typeof ready.output>
        >().toEqualTypeOf<boolean>();
        expectTypeOf<
            TaskProducedOf<typeof gate.output>
        >().toEqualTypeOf<boolean>();
    });

    it("keeps the produced value unknown without an output schema", () => {
        const definition = task("sync", { fn: () => "ok" });

        expectTypeOf<
            TaskProducedOf<typeof definition.output>
        >().toEqualTypeOf<unknown>();
    });

    it("keeps declarative kinds schema-free by default", () => {
        expectTypeOf(delay("wait", { durationMs: 1 })).toEqualTypeOf<
            DelayTaskDefinition<"wait">
        >();
        expectTypeOf(trigger("start", { dagName: "x" })).toEqualTypeOf<
            TriggerTaskDefinition<"start">
        >();
    });
});

describe("branch identity", () => {
    it("treats a different branches set as a different behavior source", () => {
        const wide = branch("route", {
            branches: ["us", "eu"],
            choose: () => "us",
        });

        const narrow = branch("route", {
            branches: ["us"],
            choose: () => "us",
        });

        expect(taskBehaviorSource(wide)).not.toBe(taskBehaviorSource(narrow));

        // Same name, different behavior: registration must reject it rather
        // than silently keeping the first definition.
        expect(() =>
            createDAG("branches")
                .chain(wide)
                .chain(
                    // @ts-expect-error - same name, different declared branches
                    branch("route", {
                        branches: ["us", "eu", "apac"],
                        choose: () => "us",
                    })
                )
        ).toThrow('Task "route" already exists in DAG "branches"');
    });

    it("rejects a reordered branches set as a name collision", () => {
        const base = createDAG("reorder").chain(
            branch("route", {
                branches: ["us", "eu"],
                choose: () => "us",
            })
        );

        expect(() =>
            base.chain(
                // @ts-expect-error - reordered branches are a different behavior source
                branch("route", {
                    branches: ["eu", "us"],
                    choose: () => "us",
                })
            )
        ).toThrow('Task "route" already exists in DAG "reorder"');
    });

    it("reuses an identical branches set and chooser", () => {
        const first = branch("route", {
            branches: ["us", "eu"],
            choose: () => "us",
        });

        const second = branch("route", {
            branches: ["us", "eu"],
            choose: () => "us",
        });

        expect(taskBehaviorSource(first)).toBe(taskBehaviorSource(second));
    });
});

describe("schemas and task identity", () => {
    it("does not let schemas change the serialized snapshot", () => {
        const withoutSchema = createDAG("snapshot").chain(
            task("sync", { fn: () => "ok" })
        );

        const withSchema = createDAG("snapshot").chain(
            task("sync", {
                fn: () => "ok",
                input: warehouseInput,
                output: v.string(),
            })
        );

        expect(withSchema.toJSON()).toStrictEqual(withoutSchema.toJSON());
    });

    it("leaves the task ID unchanged when a schema is declared", () => {
        const plain = createDAG("ids").chain(task("sync", { fn: () => "ok" }));

        const withSchema = createDAG("ids").chain(
            task("sync", { fn: () => "ok", input: warehouseInput })
        );

        const plainId = plain.getTask("sync")?.id;
        const schemaId = withSchema.getTask("sync")?.id;

        // Schemas are metadata: the behavior source is the callback alone, so
        // declaring an input schema does not change the task ID.
        expect(plainId).toBe(schemaId);
    });
});
