import type { DAG } from "@badag/core";
import { describe, expect, expectTypeOf, it } from "vitest";

import * as sdk from "./index";
import type {
    AnyTaskDefinition,
    BranchTaskDefinition,
    CreateTask,
    DelayTaskDefinition,
    TaskContext,
    TaskDefinitionBase,
    TaskFn,
    TaskKind,
    TaskParamInput,
    TaskProducedOf,
    TriggerRule,
} from "./index";

describe("@badag/sdk", () => {
    it("exposes the DAG factory and every task factory", () => {
        expect(Object.keys(sdk).toSorted()).toStrictEqual(
            [
                "TASK_KIND_ENUM",
                "branch",
                "createDAG",
                "delay",
                "sensor",
                "shortCircuit",
                "task",
                "trigger",
            ].toSorted()
        );
    });

    it("returns a core DAG that wiring accepts", () => {
        const created = sdk.createDAG("etl");

        const dag = created.chain(
            sdk.task("extract", { fn: () => "raw" }),
            sdk.delay("settle", { durationMs: 100 }),
            sdk.task("load", { fn: () => "stored" })
        );

        expectTypeOf(created).toEqualTypeOf<DAG<"etl">>();
        expect(dag.topologicalSort().map((task) => task.name)).toStrictEqual([
            "extract",
            "settle",
            "load",
        ]);
    });

    it("builds every task kind", () => {
        const regular = sdk.task("extract", { fn: () => "raw" });
        const delayed = sdk.delay("settle", { durationMs: 100 });

        const routed = sdk.branch("route", {
            branches: ["us", "eu"] as const,
            choose: () => "us",
        });

        const polled = sdk.sensor("ready", { predicate: () => true });
        const gated = sdk.shortCircuit("gate", { condition: () => true });
        const triggered = sdk.trigger("fanout", { dagName: "other" });

        expect([
            regular.kind,
            delayed.kind,
            routed.kind,
            polled.kind,
            gated.kind,
            triggered.kind,
        ]).toStrictEqual([
            sdk.TASK_KIND_ENUM.Task,
            sdk.TASK_KIND_ENUM.Delay,
            sdk.TASK_KIND_ENUM.Branch,
            sdk.TASK_KIND_ENUM.Sensor,
            sdk.TASK_KIND_ENUM.ShortCircuit,
            sdk.TASK_KIND_ENUM.Trigger,
        ]);
        expect(delayed.durationMs).toBe(100);
        expect(triggered.dagName).toBe("other");
        expectTypeOf(delayed).toEqualTypeOf<DelayTaskDefinition<"settle">>();
        expectTypeOf(routed).toEqualTypeOf<
            BranchTaskDefinition<"route", readonly ["us", "eu"]>
        >();
    });

    it("re-exports task authoring types", () => {
        const fn = ((ctx: TaskContext<"extract">) =>
            ctx.name.length) satisfies TaskFn<"extract", undefined, number>;

        const create: CreateTask = sdk.task;
        const definition = create("extract", { fn });

        const params = {
            description: "extract rows",
            fn,
            triggerRule: "all_success",
        } satisfies TaskParamInput<typeof fn>;

        const base: TaskDefinitionBase<"extract", TaskKind> = definition;
        const anyDefinition: AnyTaskDefinition = definition;
        const produced: TaskProducedOf<undefined> = undefined;
        const rule: TriggerRule = "all_success";

        expectTypeOf(base.name).toEqualTypeOf<"extract">();
        expectTypeOf(fn).returns.toEqualTypeOf<number>();
        expect(anyDefinition.kind).toBe("task");
        expect(params.description).toBe("extract rows");
        expect(produced).toBeUndefined();
        expect(rule).toBe("all_success");
    });
});
