import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type } from "arktype";
import * as v from "valibot";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";

import { branch } from "./factories/branch";
import { delay } from "./factories/delay";
import { sensor } from "./factories/sensor";
import { shortCircuit } from "./factories/short-circuit";
import { task } from "./factories/task";
import { trigger } from "./factories/trigger";
import type { AnySchema } from "./types/base";

/**
 * The value a schema is asked to validate, taken from the Standard Schema
 * protocol itself rather than restated as `unknown`.
 */
type UnvalidatedValue = Parameters<
    StandardSchemaV1["~standard"]["validate"]
>[0];

/**
 * Validate a value through a schema stored on a task definition.
 *
 * A definition's schema is optional, so an absent one is a test bug rather
 * than a validation failure. Awaiting covers both the synchronous and
 * asynchronous results a schema may return.
 */
const validate = async (
    schema: AnySchema,
    value: UnvalidatedValue
): Promise<StandardSchemaV1.Result<unknown>> => {
    if (schema === undefined) {
        throw new Error("expected the definition to declare a schema");
    }

    return await schema["~standard"].validate(value);
};

/**
 * Narrow a passing result to its validated value.
 */
const valueOf = (result: StandardSchemaV1.Result<unknown>): unknown => {
    if (result.issues !== undefined) {
        throw new Error(
            `expected validation to pass, got: ${result.issues[0]?.message}`
        );
    }

    return result.value;
};

/**
 * Narrow a failing result to its issues.
 */
const issuesOf = (
    result: StandardSchemaV1.Result<unknown>
): readonly StandardSchemaV1.Issue[] => {
    if (result.issues === undefined) {
        throw new Error("expected validation to fail");
    }

    return result.issues;
};

/**
 * The same warehouse payload expressed in three schema libraries.
 *
 * arktype narrows `rows` beyond its declared type so it has a rejection path
 * that is not merely "wrong primitive", exercising validation rather than
 * type conformance.
 */
const warehouseSchemas = {
    arktype: type({ warehouseId: "string", rows: "number>0" }),
    valibot: v.object({ warehouseId: v.string(), rows: v.number() }),
    zod: z.object({ warehouseId: z.string(), rows: z.number() }),
} as const;

const validWarehouse = { warehouseId: "w1", rows: 21 };

describe("cross-library input schema validation", () => {
    it.each(Object.entries(warehouseSchemas))(
        "accepts a matching payload with %s",
        async (_, schema) => {
            const definition = task("sync", {
                fn: (ctx) => ctx.payload.rows * 2,
                input: schema,
            });

            const value = valueOf(
                await validate(definition.input, validWarehouse)
            );

            expect(value).toStrictEqual(validWarehouse);
            expect(
                definition.fn({
                    id: "sync-id",
                    name: "sync",
                    payload: validWarehouse,
                })
            ).toBe(42);
        }
    );

    it.each(Object.entries(warehouseSchemas))(
        "rejects a payload missing a field with %s",
        async (_, schema) => {
            const definition = task("sync", { fn: () => 0, input: schema });

            const issues = issuesOf(
                await validate(definition.input, { warehouseId: "w1" })
            );

            expect(issues).toHaveLength(1);
            expect(issues[0]?.message).toBeTypeOf("string");
        }
    );

    it.each(Object.entries(warehouseSchemas))(
        "rejects a wrongly typed field with %s",
        async (_, schema) => {
            const definition = task("sync", { fn: () => 0, input: schema });

            const issues = issuesOf(
                await validate(definition.input, {
                    rows: "many",
                    warehouseId: "w1",
                })
            );

            expect(issues.length).toBeGreaterThan(0);
        }
    );

    it("reports the failing path for a nested field", async () => {
        const definition = task("sync", {
            fn: () => 0,
            input: z.object({ rows: z.number() }),
        });

        const issues = issuesOf(
            await validate(definition.input, { rows: "many" })
        );

        expect(issues[0]?.path).toStrictEqual(["rows"]);
    });

    it("narrows beyond the declared type at runtime", async () => {
        const definition = task("sync", {
            fn: () => 0,
            input: type({ rows: "number>0" }),
        });

        // The type permits any number; only validation rejects negative rows.
        expect(
            issuesOf(await validate(definition.input, { rows: -1 })).length
        ).toBeGreaterThan(0);
        expect(
            valueOf(await validate(definition.input, { rows: 1 }))
        ).toStrictEqual({ rows: 1 });
    });
});

describe("cross-library output schema validation", () => {
    it.each(Object.entries(warehouseSchemas))(
        "accepts a matching produced value with %s",
        async (_, schema) => {
            const definition = task("produce", {
                fn: () => validWarehouse,
                output: schema,
            });

            const value = valueOf(
                await validate(definition.output, definition.fn())
            );

            expect(value).toStrictEqual(validWarehouse);
        }
    );

    it.each(Object.entries(warehouseSchemas))(
        "rejects a malformed produced value with %s",
        async (_, schema) => {
            const definition = task("produce", {
                // SAFETY: deliberately malformed so validation has something to
                // reject; the declared output type is what the task promises,
                // not what this stub honors.
                fn: () => ({ warehouseId: "w1" }) as typeof validWarehouse,
                output: schema,
            });

            const issues = issuesOf(
                await validate(definition.output, definition.fn())
            );

            expect(issues.length).toBeGreaterThan(0);
        }
    );

    it("constrains the returned value at the type level", () => {
        const definition = task("produce", {
            fn: () => validWarehouse,
            output: z.object({ warehouseId: z.string(), rows: z.number() }),
        });

        expectTypeOf(definition.fn).returns.toEqualTypeOf<{
            warehouseId: string;
            rows: number;
        }>();
        expect(definition.fn()).toStrictEqual(validWarehouse);
    });

    it("rejects a mismatched return type for every library", () => {
        expect(() =>
            task("zod-out", {
                // @ts-expect-error - a number is not the declared string
                fn: () => 42,
                output: z.string(),
            })
        ).not.toThrow();

        expect(() =>
            task("ark-out", {
                // @ts-expect-error - a number is not the declared string
                fn: () => 42,
                output: type("string"),
            })
        ).not.toThrow();

        expect(() =>
            task("vali-out", {
                // @ts-expect-error - a number is not the declared string
                fn: () => 42,
                output: v.string(),
            })
        ).not.toThrow();
    });
});

describe("schema transforms", () => {
    it("types the payload as the schema output, not its input", () => {
        const definition = task("coerce", {
            // `z.coerce.number()` accepts a string and produces a number.
            fn: (ctx) => ctx.payload.rows * 2,
            input: z.object({ rows: z.coerce.number() }),
        });

        expectTypeOf<
            Parameters<typeof definition.fn>[0]["payload"]
        >().toEqualTypeOf<{
            rows: number;
        }>();
        expect(
            definition.fn({
                id: "coerce-id",
                name: "coerce",
                payload: { rows: 21 },
            })
        ).toBe(42);
    });

    it("applies a zod coercion when validating", async () => {
        const definition = task("coerce", {
            fn: () => 0,
            input: z.object({ rows: z.coerce.number() }),
        });

        const value = valueOf(await validate(definition.input, { rows: "21" }));

        expect(value).toStrictEqual({ rows: 21 });
    });

    it("applies a valibot transform when validating", async () => {
        const definition = task("length", {
            fn: () => 0,
            input: v.pipe(
                v.string(),
                v.transform((value) => value.length)
            ),
        });

        const value = valueOf(await validate(definition.input, "abcd"));

        expect(value).toBe(4);
    });

    it("applies an arktype narrow when validating", async () => {
        const definition = task("narrow", {
            fn: () => 0,
            input: type("string>2"),
        });

        expect(valueOf(await validate(definition.input, "abc"))).toBe("abc");
        expect(
            issuesOf(await validate(definition.input, "a")).length
        ).toBeGreaterThan(0);
    });
});

describe("asynchronous schemas", () => {
    it("returns a promise from an async refinement", async () => {
        const definition = task("async", {
            fn: () => 0,
            input: z.string().refine(async (value) => value.length > 2),
        });

        const value = valueOf(await validate(definition.input, "abcd"));

        expect(value).toBe("abcd");
    });

    it("surfaces an async refinement failure", async () => {
        const definition = task("async", {
            fn: () => 0,
            input: z.string().refine(async (value) => value.length > 2),
        });

        const issues = issuesOf(await validate(definition.input, "a"));

        expect(issues.length).toBeGreaterThan(0);
    });
});

describe("schemas on every task kind", () => {
    it("validates a sensor input schema", async () => {
        const definition = sensor("ready", {
            input: z.object({ rows: z.number() }),
            predicate: (ctx) => ctx.payload.rows > 0,
        });

        expect(
            valueOf(await validate(definition.input, { rows: 1 }))
        ).toStrictEqual({ rows: 1 });
        expect(
            issuesOf(await validate(definition.input, {})).length
        ).toBeGreaterThan(0);
        expect(
            definition.predicate({
                id: "ready-id",
                name: "ready",
                payload: { rows: 1 },
            })
        ).toBeTruthy();
    });

    it("validates a branch input schema", async () => {
        const definition = branch("route", {
            branches: ["big", "small"],
            choose: (ctx) => (ctx.payload.rows > 10 ? "big" : "small"),
            input: type({ rows: "number" }),
        });

        expect(
            valueOf(await validate(definition.input, { rows: 21 }))
        ).toStrictEqual({ rows: 21 });
        expect(
            issuesOf(await validate(definition.input, { rows: "x" })).length
        ).toBeGreaterThan(0);
    });

    it("validates a short-circuit input schema", async () => {
        const definition = shortCircuit("gate", {
            condition: (ctx) => ctx.payload.rows > 0,
            input: v.object({ rows: v.number() }),
        });

        expect(
            valueOf(await validate(definition.input, { rows: 1 }))
        ).toStrictEqual({ rows: 1 });
        expect(
            issuesOf(await validate(definition.input, { rows: false })).length
        ).toBeGreaterThan(0);
    });

    it("validates a delay output schema", async () => {
        const definition = delay("wait", { durationMs: 5, output: z.string() });

        expect(valueOf(await validate(definition.output, "done"))).toBe("done");
        expect(
            issuesOf(await validate(definition.output, 1)).length
        ).toBeGreaterThan(0);
    });

    it("validates a trigger output schema", async () => {
        const definition = trigger("start", {
            dagName: "child",
            output: type("boolean"),
        });

        expect(valueOf(await validate(definition.output, true))).toBeTruthy();
        expect(
            issuesOf(await validate(definition.output, "yes")).length
        ).toBeGreaterThan(0);
    });
});

describe("mixed-library definitions", () => {
    it("accepts a zod input and an arktype output on one task", async () => {
        const definition = task("mixed", {
            fn: () => ({ total: 42 }),
            input: z.object({ rows: z.number() }),
            output: type({ total: "number" }),
        });

        expect(
            valueOf(await validate(definition.input, { rows: 1 }))
        ).toStrictEqual({ rows: 1 });
        expect(
            valueOf(await validate(definition.output, definition.fn()))
        ).toStrictEqual({ total: 42 });
    });

    it("accepts a valibot input and a zod output on one task", async () => {
        const definition = task("mixed", {
            fn: () => "ok",
            input: v.object({ rows: v.number() }),
            output: z.string(),
        });

        expect(
            valueOf(await validate(definition.input, { rows: 1 }))
        ).toStrictEqual({ rows: 1 });
        expect(valueOf(await validate(definition.output, "ok"))).toBe("ok");
    });
});
