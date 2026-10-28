import { describe, expect, expectTypeOf, it } from "vitest";

import {
    branch,
    createDAG,
    DAG,
    delay,
    sensor,
    shortCircuit,
    task as createTask,
    TASK_KIND_ENUM,
    trigger,
    TRIGGER_RULE_ENUM,
} from "./index";
import type {
    DAGJson,
    DAGTask,
    TaskConfig,
    TaskContext,
    TaskFn,
    TaskJson,
    TaskLike,
    TaskOrTasks,
    TaskParamInput,
    TaskParamOutput,
    TriggerRule,
} from "./index";

// A generic helper widens names to string, so its chain is not statically
// checked; it must still typecheck.
const connect = (dag: DAG, from: TaskLike, to: TaskLike): void => {
    dag.chain(from, to);
};

const createInvalidTriggerRule = () =>
    createTask("extract", {
        fn: () => "raw",
        // @ts-expect-error - unsupported trigger rule
        triggerRule: "all_done_soon",
    });

const createUnregisteredTask = () =>
    // @ts-expect-error - DAGTask is type-only; only DAG mints handles
    new DAGTask(createDAG("etl"), createTask("extract", { fn: () => "raw" }));

const connectRaw = (task: DAGTask, other: DAGTask): void => {
    // @ts-expect-error - raw edge insertion is not public
    task.connectTo(other);
};

describe("public task types", () => {
    it("exports every task factory", () => {
        const definitions = [
            createTask("regular", { fn: () => 0 }),
            sensor("sensor", { predicate: () => true }),
            delay("delay", { durationMs: 0 }),
            branch("branch", { choose: () => "left" }),
            shortCircuit("gate", { condition: () => true }),
            trigger("trigger", { dagName: "child" }),
        ];

        expect(definitions.map(({ kind }) => kind)).toStrictEqual([
            TASK_KIND_ENUM.Task,
            TASK_KIND_ENUM.Sensor,
            TASK_KIND_ENUM.Delay,
            TASK_KIND_ENUM.Branch,
            TASK_KIND_ENUM.ShortCircuit,
            TASK_KIND_ENUM.Trigger,
        ]);
    });

    it("exposes every task kind through the enum", () => {
        expect(TASK_KIND_ENUM).toStrictEqual({
            Task: "task",
            Sensor: "sensor",
            Delay: "delay",
            Branch: "branch",
            ShortCircuit: "short_circuit",
            Trigger: "trigger",
        });
    });

    it("exports DAGTask as a type without raw mutation", () => {
        expect(createUnregisteredTask).toBeTypeOf("function");
        expect(connectRaw).toBeTypeOf("function");
    });

    it("preserves task definition literals and function types", () => {
        const definition = createTask("double", {
            fn: (ctx) => ctx.name.length * 2,
            description: "Double the name length",
            config: { timeout_ms: 500 },
            triggerRule: TRIGGER_RULE_ENUM.OneFailed,
        });

        expectTypeOf(definition).toEqualTypeOf<
            TaskParamOutput<"double", (ctx: TaskContext<"double">) => number>
        >();
        expectTypeOf(definition.name).toEqualTypeOf<"double">();
        expectTypeOf(definition.fn).toEqualTypeOf<
            (ctx: TaskContext<"double">) => number
        >();
        expectTypeOf(definition.triggerRule).toEqualTypeOf<TriggerRule>();
        expectTypeOf(definition.description).toEqualTypeOf<
            string | undefined
        >();
        expectTypeOf(definition.config).toEqualTypeOf<TaskConfig | undefined>();
        expectTypeOf(definition).toExtend<TaskLike>();
        expectTypeOf([definition]).toExtend<TaskOrTasks>();
    });

    it("keeps inputs optional and rejects unknown trigger rules", () => {
        const input: TaskParamInput<(ctx: TaskContext<"extract">) => string> = {
            fn: (ctx) => ctx.name,
        };

        expectTypeOf(input.description).toEqualTypeOf<string | undefined>();
        expectTypeOf(input.config).toEqualTypeOf<TaskConfig | undefined>();
        expectTypeOf(input.triggerRule).toEqualTypeOf<
            TriggerRule | undefined
        >();

        expectTypeOf(createInvalidTriggerRule).toBeFunction();
    });

    it("exposes every trigger rule through the enum", () => {
        expect(TRIGGER_RULE_ENUM).toStrictEqual({
            AllSuccess: "all_success",
            AllDone: "all_done",
            OneSuccess: "one_success",
            OneFailed: "one_failed",
            NoneFailed: "none_failed",
            NoneFailedMinOneSuccess: "none_failed_min_one_success",
            AllSkipped: "all_skipped",
        });
        expectTypeOf(TRIGGER_RULE_ENUM.AllDone).toEqualTypeOf<"all_done">();

        const rules: readonly TriggerRule[] = Object.values(TRIGGER_RULE_ENUM);
        const rule: TriggerRule = TRIGGER_RULE_ENUM.NoneFailedMinOneSuccess;

        expect(rules).toHaveLength(7);
        expect(rule).toBe("none_failed_min_one_success");
    });

    it("types timeout config alongside arbitrary keys", () => {
        const config: TaskConfig = { timeout_ms: 5000, retries: 3 };

        expectTypeOf(config.timeout_ms).toEqualTypeOf<number | undefined>();
        expectTypeOf(config.retries).toEqualTypeOf<unknown>();
    });

    it("types JSON snapshots with trigger rules", () => {
        const definition = createTask("report", {
            fn: () => "done",
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
        });

        const dag = createDAG("etl").chain(definition);
        const json = dag.toJSON();
        const [taskJson] = json.tasks;

        expectTypeOf(json).toEqualTypeOf<DAGJson>();
        expectTypeOf(taskJson).toEqualTypeOf<TaskJson>();
        expectTypeOf(taskJson.triggerRule).toEqualTypeOf<TriggerRule>();
        expectTypeOf(taskJson.upstream).toEqualTypeOf<readonly string[]>();
        expect(taskJson.triggerRule).toBe(TRIGGER_RULE_ENUM.AllDone);
    });

    it("types DAG query results", () => {
        const dag = createDAG("etl");

        expectTypeOf(dag.name).toEqualTypeOf<"etl">();
        expectTypeOf(dag.tasks).toEqualTypeOf<ReadonlyMap<string, DAGTask>>();
        expectTypeOf(dag.topologicalSort()).toEqualTypeOf<DAGTask[]>();
        expectTypeOf(dag.getReadyTasks(new Set())).toEqualTypeOf<DAGTask[]>();
    });

    it("creates the same DAG instance through createDAG", () => {
        const dag = createDAG("etl");

        expect(dag).toBeInstanceOf(DAG);
        expectTypeOf(dag).toEqualTypeOf<DAG<"etl">>();
        expectTypeOf(dag.name).toEqualTypeOf<"etl">();
        expectTypeOf(dag.getTask("extract")).toEqualTypeOf<
            DAGTask<"extract"> | undefined
        >();
        expect(dag.name).toBe("etl");
        expect(() => createDAG("")).toThrow("DAG name cannot be empty");
    });

    it("accepts context callbacks on definitions and handles", () => {
        expectTypeOf<() => string>().toExtend<TaskFn>();
        expectTypeOf<(ctx: TaskContext) => string>().toExtend<TaskFn>();
        expectTypeOf<
            (ctx: TaskContext<"extract">) => Promise<number>
        >().toExtend<TaskFn<"extract">>();
        expectTypeOf<TaskContext<"extract">>().toEqualTypeOf<{
            readonly id: string;
            readonly name: "extract";
            readonly payload: undefined;
        }>();

        const dag = createDAG("etl").chain(
            createTask("extract", { fn: async () => "raw" })
        );

        const handle = dag.getTask("extract");

        expectTypeOf(handle).toEqualTypeOf<DAGTask<"extract"> | undefined>();

        if (handle !== undefined) {
            expectTypeOf(handle).toExtend<TaskLike>();
            expectTypeOf(handle.triggerRule).toEqualTypeOf<TriggerRule>();
            expectTypeOf(handle.upstream).toEqualTypeOf<ReadonlySet<DAGTask>>();
        }
    });
});

describe("compile-time chain validation", () => {
    it("preserves literal names and handle types", () => {
        const extract = createTask("extract", { fn: () => "raw" });
        const dag = createDAG("typed").chain(extract);

        expectTypeOf(extract.name).toEqualTypeOf<"extract">();
        expectTypeOf(dag).toExtend<DAG>();
        expectTypeOf(dag.getTask("extract")).toEqualTypeOf<
            DAGTask<"extract"> | undefined
        >();
    });

    it("rejects cycles, duplicates, and self edges", () => {
        const extract = createTask("extract", { fn: () => "raw" });
        const load = createTask("load", { fn: () => "stored" });
        const dag = createDAG("typed").chain(extract, load);

        // @ts-expect-error - load -> extract closes a cycle
        const createCycle = () => dag.chain(load, extract);

        expect(createCycle).toThrow(
            'Dependency "load" -> "extract" creates a cycle'
        );

        const duplicate = createTask("extract", { fn: () => 1 });

        // @ts-expect-error - same name with a different signature
        const registerDuplicate = () => dag.chain(duplicate);

        expect(registerDuplicate).toThrow(
            'Task "extract" already exists in DAG "typed"'
        );

        // @ts-expect-error - a task cannot depend on itself
        const createSelfEdge = () => dag.chain(load, load);

        expect(createSelfEdge).toThrow("A task cannot depend on itself");

        const createLoop = () =>
            // @ts-expect-error - extract -> load -> extract in one call
            createDAG("loop").chain(extract, load, extract);

        expect(createLoop).toThrow(
            'Dependency "load" -> "extract" creates a cycle'
        );
    });

    it("rejects overlap between adjacent groups", () => {
        const extract = createTask("extract", { fn: () => "raw" });
        const load = createTask("load", { fn: () => "stored" });
        const graph = createDAG("overlap");

        const createOverlap = () =>
            // @ts-expect-error - load would depend on itself
            graph.chain([extract, load], [load, extract]);

        expect(createOverlap).toThrow("A task cannot depend on itself");
    });

    it("rejects a cycle spread across kept chain results", () => {
        const extract = createTask("extract", { fn: () => "raw" });
        const transform = createTask("transform", { fn: () => "clean" });
        const load = createTask("load", { fn: () => "stored" });

        const first = createDAG("steps").chain(extract, transform);
        const second = first.chain(transform, load);

        // @ts-expect-error - extract -> transform -> load -> extract
        const createCycle = () => second.chain(load, extract);

        expect(createCycle).toThrow(
            'Dependency "load" -> "extract" creates a cycle'
        );
    });

    it("rejects a duplicate inside one chain call", () => {
        const first = createTask("same", { fn: () => 1 });
        const second = createTask("same", { fn: () => "two" });

        // @ts-expect-error - task name collisions in one chain call
        const registerBoth = () => createDAG("batch").chain([first, second]);

        expect(registerBoth).toThrow(
            'Task "same" already exists in DAG "batch"'
        );
    });

    it("accepts repeated, diamond, and generic wiring", () => {
        const extract = createTask("extract", { fn: () => "raw" });
        const transform = createTask("transform", { fn: () => "clean" });
        const load = createTask("load", { fn: () => "stored" });

        const diamond = createDAG("diamond")
            .chain(extract, [transform, load])
            .chain(extract, load)
            .chain(extract)
            .chain(transform);

        expect(diamond.tasks.size).toBe(3);

        const generic = createDAG("generic");

        connect(generic, extract, transform);

        expect(generic.tasks.size).toBe(2);
    });

    it("accepts chains above the static-check group limit", () => {
        const tasks = [
            createTask("t00", { fn: () => 0 }),
            createTask("t01", { fn: () => 0 }),
            createTask("t02", { fn: () => 0 }),
            createTask("t03", { fn: () => 0 }),
            createTask("t04", { fn: () => 0 }),
            createTask("t05", { fn: () => 0 }),
            createTask("t06", { fn: () => 0 }),
            createTask("t07", { fn: () => 0 }),
            createTask("t08", { fn: () => 0 }),
            createTask("t09", { fn: () => 0 }),
            createTask("t10", { fn: () => 0 }),
            createTask("t11", { fn: () => 0 }),
            createTask("t12", { fn: () => 0 }),
            createTask("t13", { fn: () => 0 }),
            createTask("t14", { fn: () => 0 }),
            createTask("t15", { fn: () => 0 }),
            createTask("t16", { fn: () => 0 }),
            createTask("t17", { fn: () => 0 }),
            createTask("t18", { fn: () => 0 }),
            createTask("t19", { fn: () => 0 }),
            createTask("t20", { fn: () => 0 }),
            createTask("t21", { fn: () => 0 }),
            createTask("t22", { fn: () => 0 }),
            createTask("t23", { fn: () => 0 }),
            createTask("t24", { fn: () => 0 }),
            createTask("t25", { fn: () => 0 }),
            createTask("t26", { fn: () => 0 }),
            createTask("t27", { fn: () => 0 }),
            createTask("t28", { fn: () => 0 }),
            createTask("t29", { fn: () => 0 }),
            createTask("t30", { fn: () => 0 }),
            createTask("t31", { fn: () => 0 }),
            createTask("t32", { fn: () => 0 }),
            createTask("t33", { fn: () => 0 }),
            createTask("t34", { fn: () => 0 }),
            createTask("t35", { fn: () => 0 }),
            createTask("t36", { fn: () => 0 }),
            createTask("t37", { fn: () => 0 }),
            createTask("t38", { fn: () => 0 }),
            createTask("t39", { fn: () => 0 }),
            createTask("t40", { fn: () => 0 }),
            createTask("t41", { fn: () => 0 }),
            createTask("t42", { fn: () => 0 }),
            createTask("t43", { fn: () => 0 }),
            createTask("t44", { fn: () => 0 }),
            createTask("t45", { fn: () => 0 }),
            createTask("t46", { fn: () => 0 }),
            createTask("t47", { fn: () => 0 }),
            createTask("t48", { fn: () => 0 }),
            createTask("t49", { fn: () => 0 }),
        ] as const;

        const dag = createDAG("large").chain(...tasks);

        expect(dag.tasks.size).toBe(50);
        expect(dag.topologicalSort()).toHaveLength(50);
    });
});
