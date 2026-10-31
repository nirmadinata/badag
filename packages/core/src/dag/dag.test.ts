import { describe, expect, expectTypeOf, it } from "vitest";

import { FNV_128_HEX_LENGTH } from "../hash/hash";
import { task as createTask } from "../task/factories/task";
import { TASK_KIND_ENUM } from "../task/kind";
import { DEFAULT_TRIGGER_RULE, TRIGGER_RULE_ENUM } from "../task/trigger-rule";
import type { TaskContext, TaskFn } from "../task/types/base";
import type { TaskParamInput, TaskParamOutput } from "../task/types/task";
import { createDAG, DAG } from "./dag";
import { crossDownstream, DAGTask } from "./registered-task";

function namesOf(dag: DAG): string[] {
    return dag.topologicalSort().map((task) => task.name);
}

function register<const Name extends string, Fn extends TaskFn<Name>>(
    dag: DAG,
    definition: TaskParamOutput<Name, Fn>
): DAGTask<Name> {
    dag.chain(definition);

    const task = dag.getTask(definition.name);

    if (task === undefined) {
        throw new Error(`Task "${definition.name}" was not registered`);
    }

    return task;
}

function addTask<Fn extends TaskFn<string>>(
    dag: DAG,
    params: TaskParamInput<Fn> & { name: string }
): DAGTask {
    return register(dag, createTask(params.name, params));
}

function requireTask(dag: DAG, name: string): DAGTask {
    const task = dag.getTask(name);

    if (task === undefined) {
        throw new Error(`Task "${name}" was not registered`);
    }

    return task;
}

function downstreamNames(dag: DAG): Record<string, string[]> {
    return Object.fromEntries(
        [...dag.tasks.values()].map((task) => [
            task.name,
            [...task.downstream].map((downstream) => downstream.name),
        ])
    );
}

function buildComplexDag() {
    const extract = createTask("extract", {
        fn: () => "raw",
        description: "Read source data",
    });

    const cleanA = createTask("cleanA", { fn: () => "cleanA" });
    const cleanB = createTask("cleanB", { fn: () => "cleanB" });
    const join = createTask("join", { fn: () => "joined" });
    const validate = createTask("validate", { fn: () => "valid" });
    const publish = createTask("publish", { fn: () => "published" });

    const dag = createDAG("complex").chain(
        extract,
        [cleanA, cleanB],
        join,
        validate,
        publish
    );

    return {
        cleanA: requireTask(dag, "cleanA"),
        cleanB: requireTask(dag, "cleanB"),
        dag,
        extract: requireTask(dag, "extract"),
        join: requireTask(dag, "join"),
        publish: requireTask(dag, "publish"),
        validate: requireTask(dag, "validate"),
    };
}

const rawFn = (): string => "raw";

// Captures its argument, so every call produces the same callback source text.
const syncTableFn = (table: string) => () => table;

// Callback identity is reference-based, so duplicate definitions must share it.
const contextFn = (ctx: TaskContext<"scaled">) => ctx.name;

describe("task definitions", () => {
    it("trims task names and passes them through context", () => {
        const definition = createTask("  my-task_name  ", {
            fn: (ctx) => ctx.name,
        });

        expect(definition.name).toBe("my-task_name");
        expectTypeOf(definition.name).toEqualTypeOf<"my-task_name">();
        expect(
            definition.fn({
                id: "my-task_name-id",
                name: "my-task_name",
                payload: undefined,
            })
        ).toBe("my-task_name");
    });

    it("assigns a task ID only to registered DAG tasks", () => {
        const definition = createTask("extract", { fn: () => "raw" });

        expect(Object.hasOwn(definition, "id")).toBeFalsy();

        const handle = register(createDAG("etl"), definition);

        expect(handle.id).toHaveLength(FNV_128_HEX_LENGTH);
        expect(handle.id).toMatch(/^[0-9a-f]+$/u);
    });

    it("preserves an optional task description", () => {
        const definition = createTask("extract", {
            fn: () => "raw",
            description: "Read source data",
        });

        const handle = register(createDAG("etl"), definition);

        expect(definition.description).toBe("Read source data");
        expect(handle.description).toBe("Read source data");
    });

    it("leaves task descriptions undefined when omitted", () => {
        const definition = createTask("extract", { fn: () => "raw" });
        const handle = register(createDAG("etl"), definition);

        expect(definition.description).toBeUndefined();
        expect(handle.description).toBeUndefined();
    });

    it("rejects task names without dash or underscore separators", () => {
        for (const name of [
            "my task",
            "my.task",
            "my--task",
            "-task",
            "task-",
            "task__name",
        ]) {
            expect(() => createTask(name, { fn: () => 0 })).toThrow(
                /must use letters or numbers separated by "-" or "_"/u
            );
        }
    });

    it("rejects empty task names after trimming", () => {
        expect(() => createTask("   ", { fn: () => 0 })).toThrow(
            "Task name cannot be empty"
        );
    });

    it("validates names on manually constructed definitions", () => {
        const definition = createTask("extract", { fn: () => "raw" });

        expect(() =>
            createDAG("etl").chain({ ...definition, name: "extract task" })
        ).toThrow(/must use letters or numbers separated by "-" or "_"/u);
    });

    it("defaults the trigger rule to all_success", () => {
        const definition = createTask("extract", { fn: () => "raw" });
        const dag = createDAG("etl").chain(definition);

        expect(definition.triggerRule).toBe(DEFAULT_TRIGGER_RULE);
        expect(dag.getTask("extract")?.triggerRule).toBe(DEFAULT_TRIGGER_RULE);
    });

    it("keeps an explicit trigger rule", () => {
        const definition = createTask("extract", {
            fn: () => "raw",
            triggerRule: TRIGGER_RULE_ENUM.OneFailed,
        });

        const dag = createDAG("etl").chain(definition);

        expect(definition.triggerRule).toBe(TRIGGER_RULE_ENUM.OneFailed);
        expect(dag.getTask("extract")?.triggerRule).toBe(
            TRIGGER_RULE_ENUM.OneFailed
        );
    });

    it("derives a stable task ID from the name and function source", () => {
        const config = { timeout_ms: 1000 };
        const first = createTask("  first  ", { fn: rawFn, config });
        const second = createTask("first", { fn: rawFn, config });
        const firstTask = register(createDAG("first"), first);
        const secondTask = register(createDAG("second"), second);

        expect(firstTask.id).toBe(secondTask.id);
        expect(first.fn).toBe(rawFn);
        expect(first.config).toBe(config);
    });

    it("changes the task ID when the name or function source changes", () => {
        const base = register(
            createDAG("base"),
            createTask("extract", { fn: () => "raw" })
        );

        const renamed = register(
            createDAG("renamed"),
            createTask("load", { fn: () => "raw" })
        );

        const rewritten = register(
            createDAG("rewritten"),
            createTask("extract", { fn: () => "clean" })
        );

        expect(renamed.id).not.toBe(base.id);
        expect(rewritten.id).not.toBe(base.id);
        expect(renamed.id).not.toBe(rewritten.id);
    });

    it("keeps the context-aware function signature on the definition", () => {
        const definition = createTask("double", {
            fn: (ctx) => ctx.name.length * 2,
        });

        expectTypeOf(definition.fn).toEqualTypeOf<
            (ctx: TaskContext<"double">) => number
        >();
        expect(
            definition.fn({
                id: "double-id",
                name: "double",
                payload: undefined,
            })
        ).toBe(12);
    });

    it("keeps literal task names in lookups", () => {
        const dag = createDAG("etl");
        const definition = createTask("extract", { fn: () => "raw" });

        dag.chain(definition);

        const found = dag.getTask("extract");

        expectTypeOf(definition.name).toEqualTypeOf<"extract">();
        expectTypeOf(found).toEqualTypeOf<DAGTask<"extract"> | undefined>();
        expect(found?.name).toBe("extract");
    });
});

describe("async task functions", () => {
    it("preserves the async signature and resolves the result", async () => {
        const definition = createTask("extract", {
            fn: async (ctx) => `${ctx.name}-raw`,
        });

        expectTypeOf(definition.fn).toEqualTypeOf<
            (ctx: TaskContext<"extract">) => Promise<string>
        >();

        await expect(
            definition.fn({
                id: "extract-id",
                name: "extract",
                payload: undefined,
            })
        ).resolves.toBe("extract-raw");
    });

    it("propagates a rejection from the async function", async () => {
        const failure = new Error("extract failed");

        const definition = createTask("extract", {
            fn: async () => {
                throw failure;
            },
        });

        await expect(definition.fn()).rejects.toBe(failure);
    });

    it("executes async task functions in topological order", async () => {
        const visited: string[] = [];

        const dag = createDAG("etl").chain(
            createTask("extract", {
                fn: async (ctx) => {
                    visited.push(ctx.name);

                    return "raw";
                },
            }),
            createTask("transform", {
                fn: async (ctx) => {
                    visited.push(ctx.name);

                    return "clean";
                },
            }),
            createTask("load", {
                fn: async (ctx) => {
                    visited.push(ctx.name);

                    return "stored";
                },
            })
        );

        for (const task of dag.topologicalSort()) {
            const { definition } = task;

            if (definition.kind !== TASK_KIND_ENUM.Task) {
                throw new Error(
                    `Expected a regular task, got ${definition.kind}`
                );
            }

            // oxlint-disable-next-line no-await-in-loop -- dependency order requires sequential execution.
            await definition.fn({
                id: task.id,
                name: task.name,
                payload: undefined,
            });
        }

        expect(visited).toStrictEqual(["extract", "transform", "load"]);
    });
});

describe("DAG construction", () => {
    it("keeps the name verbatim", () => {
        expect(createDAG("etl").name).toBe("etl");
        expect(createDAG("  etl  ").name).toBe("  etl  ");
    });

    it("rejects empty and whitespace-only names", () => {
        expect(() => createDAG("")).toThrow("DAG name cannot be empty");
        expect(() => createDAG("   ")).toThrow("DAG name cannot be empty");
    });

    it("builds the same DAG through createDAG", () => {
        const dag = createDAG("etl");

        expect(dag).toBeInstanceOf(DAG);
        expect(dag.name).toBe("etl");
        expectTypeOf(dag).toEqualTypeOf<DAG<"etl">>();
        expectTypeOf(dag.getTask("extract")).toEqualTypeOf<
            DAGTask<"extract"> | undefined
        >();

        const chained = dag.chain(createTask("extract", { fn: () => "raw" }));

        expect(chained).toBe(dag);
        expect(dag.topologicalSort().map((task) => task.name)).toStrictEqual([
            "extract",
        ]);
    });

    it("rejects empty and whitespace-only names through createDAG", () => {
        expect(() => createDAG("")).toThrow("DAG name cannot be empty");
        expect(() => createDAG("   ")).toThrow("DAG name cannot be empty");
    });
});

describe("DAG registration", () => {
    it("rejects task name collisions", () => {
        const dag = createDAG("etl");

        addTask(dag, { name: "extract", fn: () => "raw" });

        expect(() =>
            addTask(dag, { name: "extract", fn: () => "clean" })
        ).toThrow(/already exists/u);
    });

    it("treats an identical definition as already registered", () => {
        const dag = createDAG("etl");
        const definition = createTask("extract", { fn: () => "raw" });

        dag.chain(definition).chain(definition);

        expect(dag.tasks.size).toBe(1);
    });

    it("keeps the first registration's metadata for a duplicate definition", () => {
        const dag = createDAG("etl");

        dag.chain(
            createTask("extract", {
                fn: rawFn,
                config: { timeout_ms: 1000 },
            })
        ).chain(
            createTask("extract", {
                fn: rawFn,
                description: "second registration",
                config: { timeout_ms: 9999 },
                triggerRule: TRIGGER_RULE_ENUM.OneFailed,
            })
        );

        const registered = requireTask(dag, "extract");

        expect(dag.tasks.size).toBe(1);
        expect(registered.config).toStrictEqual({ timeout_ms: 1000 });
        expect(registered.description).toBeUndefined();
        expect(registered.triggerRule).toBe(DEFAULT_TRIGGER_RULE);
    });

    it("rejects a same-name definition that differs only by captured value", () => {
        const dag = createDAG("warehouse").chain(
            createTask("sync", { fn: syncTableFn("customers") })
        );

        expect(() =>
            dag.chain(createTask("sync", { fn: syncTableFn("orders") }))
        ).toThrow(/different callback instance/u);

        // The rejected registration leaves the graph untouched.
        const registered = requireTask(dag, "sync");
        const { definition } = registered;

        expect(dag.tasks.size).toBe(1);

        if (definition.kind !== TASK_KIND_ENUM.Task) {
            throw new Error(`Expected a regular task, got ${definition.kind}`);
        }

        expect(
            definition.fn({
                id: registered.id,
                name: "sync",
                payload: undefined,
            })
        ).toBe("customers");
    });

    it("accepts the surviving definition after rejecting a capture-only duplicate", () => {
        const definition = createTask("sync", {
            fn: syncTableFn("customers"),
        });

        const dag = createDAG("recovery").chain(definition);

        expect(() =>
            dag.chain(createTask("sync", { fn: syncTableFn("orders") }))
        ).toThrow(/different callback instance/u);

        expect(() => dag.chain(definition)).not.toThrow();
        expect(dag.tasks.size).toBe(1);
    });

    it("rejects a capture-only duplicate introduced through a handle", () => {
        const dag = createDAG("wiring");

        const sync = addTask(dag, {
            name: "sync",
            fn: syncTableFn("customers"),
        });

        const load = addTask(dag, { name: "load", fn: rawFn });

        sync.setDownstream(load);

        expect(() =>
            sync.setDownstream(
                createTask("sync", { fn: syncTableFn("orders") })
            )
        ).toThrow(/different callback instance/u);

        expect(dag.tasks.size).toBe(2);
        expect([...sync.downstream]).toStrictEqual([load]);
    });

    it("rejects edges that cross DAG boundaries", () => {
        const dag = createDAG("etl");
        const other = createDAG("other");
        const task = addTask(dag, { name: "extract", fn: () => "raw" });
        const outsider = addTask(other, { name: "load", fn: () => "stored" });

        expect(() => task.setDownstream(outsider)).toThrow(
            /belong to this DAG/u
        );
    });

    it("rejects same-DAG handles that are not registered", () => {
        const dag = createDAG("etl");
        const definition = createTask("extract", { fn: () => "raw" });
        const unregistered = new DAGTask(dag, definition);
        const registered = addTask(dag, { name: "load", fn: () => "stored" });

        expect(() => unregistered.setDownstream(registered)).toThrow(
            "Both tasks must belong to this DAG"
        );
        expect(registered.upstream.size).toBe(0);
    });

    it("does not expose a raw edge-insertion method", () => {
        const dag = createDAG("etl");
        const task = addTask(dag, { name: "extract", fn: () => 0 });

        expect("connectTo" in task).toBeFalsy();
    });

    it("registers definitions across chainable calls", () => {
        const dag = createDAG("etl");
        const first = createTask("first", { fn: () => 0 });
        const second = createTask("second", { fn: () => 0 });

        const chained = dag.chain(first).chain(second);

        expect(chained).toBe(dag);
        expect([...dag.tasks.keys()]).toStrictEqual(["first", "second"]);
    });

    it("registers a batch atomically", () => {
        const dag = createDAG("etl");
        const first = createTask("first", { fn: () => 0 });
        const duplicate = createTask("first", { fn: () => 1 });

        expect(() => dag.chain([first, duplicate])).toThrow(/already exists/u);
        expect(dag.tasks.size).toBe(0);
    });

    it("accepts context callbacks", () => {
        const definition = createTask("scaled", { fn: contextFn });

        const definition2 = createTask("scaled", { fn: contextFn });

        const dag = createDAG("etl").chain(definition);
        dag.chain(definition2);

        const handle = requireTask(dag, "scaled");

        expect(
            definition.fn({
                id: handle.id,
                name: definition.name,
                payload: undefined,
            })
        ).toBe("scaled");
    });

    it("registers a prebuilt definition under its name", () => {
        const dag = createDAG("etl");
        const definition = createTask("extract", { fn: () => "raw" });
        const handle = register(dag, definition);

        expect(handle.id).toHaveLength(FNV_128_HEX_LENGTH);
        expect(handle.name).toBe("extract");
        expect(dag.getTask("extract")).toBe(handle);
        expect(dag.tasks.get("extract")).toBe(handle);
        expect([...dag.tasks.keys()]).toStrictEqual(["extract"]);
    });

    it("allows one definition in multiple DAGs", () => {
        const definition = createTask("extract", { fn: () => "raw" });
        const first = register(createDAG("first"), definition);
        const second = register(createDAG("second"), definition);

        expect(first).not.toBe(second);
        expect(first.id).toBe(second.id);
    });

    it("returns undefined for unknown names", () => {
        const dag = createDAG("etl");

        addTask(dag, { name: "extract", fn: () => "raw" });

        expect(dag.getTask("load")).toBeUndefined();
    });

    it("stores config on the task by reference", () => {
        const config = { timeout_ms: 500, retries: 2 };
        const dag = createDAG("etl");
        const task = addTask(dag, { name: "extract", fn: () => 0, config });

        expect(task.config).toBe(config);
    });
});

describe("dependency edges", () => {
    it("records both sides of an edge once", () => {
        const dag = createDAG("etl");
        const upstream = addTask(dag, { name: "upstream", fn: () => 0 });
        const downstream = addTask(dag, { name: "downstream", fn: () => 0 });

        dag.addDependency(upstream, downstream);
        dag.addDependency(upstream, downstream);

        expect([...upstream.downstream]).toStrictEqual([downstream]);
        expect([...downstream.upstream]).toStrictEqual([upstream]);
    });

    it("links every task in an upstream list", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        sink.setUpstream([first, second]);

        expect([...sink.upstream]).toStrictEqual([first, second]);
        expect([...first.downstream]).toStrictEqual([sink]);
        expect([...second.downstream]).toStrictEqual([sink]);
    });

    it("treats dependsOn as setUpstream", () => {
        const dag = createDAG("etl");
        const upstream = addTask(dag, { name: "upstream", fn: () => 0 });
        const downstream = addTask(dag, { name: "downstream", fn: () => 0 });

        downstream.dependsOn(upstream);

        expect([...downstream.upstream]).toStrictEqual([upstream]);
        expect([...upstream.downstream]).toStrictEqual([downstream]);
    });

    it("rejects self dependencies on the upstream side", () => {
        const dag = createDAG("etl");
        const task = addTask(dag, { name: "task", fn: () => 0 });

        expect(() => task.setUpstream(task)).toThrow(
            "A task cannot depend on itself"
        );
    });

    it("rejects edges whose upstream task belongs to another DAG", () => {
        const dag = createDAG("etl");
        const other = createDAG("other");
        const task = addTask(dag, { name: "extract", fn: () => 0 });
        const outsider = addTask(other, { name: "load", fn: () => 0 });

        expect(() => outsider.setDownstream(task)).toThrow(
            "Both tasks must belong to this DAG"
        );
    });

    it("rejects a deep cycle without recording the rejected edge", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const third = addTask(dag, { name: "third", fn: () => 0 });

        first.setDownstream(second);
        second.setDownstream(third);

        expect(() => third.setDownstream(first)).toThrow(
            'Dependency "third" -> "first" creates a cycle'
        );
        expect(third.downstream.size).toBe(0);
        expect(first.upstream.size).toBe(0);
    });

    it("registers and wires definitions in one chain call", () => {
        const dag = createDAG("etl");
        const first = createTask("first", { fn: () => 0 });
        const second = createTask("second", { fn: () => 0 });

        dag.chain(first, second);

        const upstream = dag.getTask("first");
        const downstream = dag.getTask("second");

        expect([...(upstream?.downstream ?? [])]).toStrictEqual([downstream]);
        expect([...(downstream?.upstream ?? [])]).toStrictEqual([upstream]);
    });

    it("registers definitions passed to edge methods", () => {
        const dag = createDAG("etl");
        const first = register(dag, createTask("first", { fn: () => 0 }));
        const second = createTask("second", { fn: () => 0 });

        first.setDownstream(second);

        expect(dag.tasks.size).toBe(2);
        expect([...(dag.getTask("second")?.upstream ?? [])]).toStrictEqual([
            first,
        ]);
    });

    it("registers definitions passed to addDependency", () => {
        const dag = createDAG("etl");
        const first = createTask("first", { fn: () => 0 });
        const second = createTask("second", { fn: () => 0 });

        dag.addDependency(first, second);

        const firstTask = dag.getTask("first");
        const secondTask = dag.getTask("second");

        expect([...(firstTask?.downstream ?? [])]).toStrictEqual([secondTask]);
    });

    it("links every pair through addDependencies", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        dag.addDependencies([first, second], sink);

        expect([...first.downstream]).toStrictEqual([sink]);
        expect([...second.downstream]).toStrictEqual([sink]);
        expect([...sink.upstream]).toStrictEqual([first, second]);
    });

    it("keeps a failed upstream batch unchanged", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        sink.setDownstream(second);

        expect(() => sink.setUpstream([first, second])).toThrow(
            /creates a cycle/u
        );
        expect(first.downstream.size).toBe(0);
        expect(sink.upstream.size).toBe(0);
        expect(second.downstream.has(sink)).toBeFalsy();
    });

    it("keeps a failed downstream batch unchanged", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        sink.setDownstream(second);

        expect(() => second.setDownstream([first, sink])).toThrow(
            /creates a cycle/u
        );
        expect(second.downstream.size).toBe(0);
        expect(first.upstream.size).toBe(0);
        expect(sink.upstream.has(second)).toBeFalsy();
    });

    it("rolls back definitions registered by a failed edge batch", () => {
        const dag = createDAG("etl");
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });
        const fresh = createTask("fresh", { fn: () => 0 });

        sink.setDownstream(second);

        expect(() => sink.setUpstream([fresh, second])).toThrow(
            /creates a cycle/u
        );
        expect(dag.getTask("fresh")).toBeUndefined();
        expect(sink.upstream.size).toBe(0);
    });
});

describe("cross-downstream linking", () => {
    it("links every pair across two groups", () => {
        const dag = createDAG("etl");
        const left = addTask(dag, { name: "left", fn: () => 0 });
        const leftPeer = addTask(dag, { name: "leftPeer", fn: () => 0 });
        const right = addTask(dag, { name: "right", fn: () => 0 });
        const rightPeer = addTask(dag, { name: "rightPeer", fn: () => 0 });

        crossDownstream([left, leftPeer], [right, rightPeer]);

        expect([...left.downstream]).toStrictEqual([right, rightPeer]);
        expect([...leftPeer.downstream]).toStrictEqual([right, rightPeer]);
        expect([...right.upstream]).toStrictEqual([left, leftPeer]);
        expect([...rightPeer.upstream]).toStrictEqual([left, leftPeer]);
    });

    it("does nothing when either group is empty", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });

        crossDownstream([], [first, second]);
        crossDownstream([first, second], []);

        expect(first.upstream.size).toBe(0);
        expect(second.upstream.size).toBe(0);
        expect(first.downstream.size).toBe(0);
        expect(second.downstream.size).toBe(0);
    });

    it("does not add partial edges when a pair would cycle", () => {
        const dag = createDAG("etl");
        const left = addTask(dag, { name: "left", fn: () => 0 });
        const leftPeer = addTask(dag, { name: "leftPeer", fn: () => 0 });
        const right = addTask(dag, { name: "right", fn: () => 0 });

        right.setDownstream(leftPeer);

        expect(() => crossDownstream([left, leftPeer], [right])).toThrow(
            /creates a cycle/u
        );
        expect(left.downstream.size).toBe(0);
        expect(leftPeer.downstream.size).toBe(0);
        expect(right.upstream.size).toBe(0);
    });

    it("rejects handles from another DAG without linking", () => {
        const dag = createDAG("left");
        const other = createDAG("right");
        const left = addTask(dag, { name: "left", fn: () => 0 });
        const right = addTask(other, { name: "right", fn: () => 0 });

        expect(() => crossDownstream([left], [right])).toThrow(
            "Both tasks must belong to this DAG"
        );
        expect(left.downstream.size).toBe(0);
        expect(right.upstream.size).toBe(0);
    });
});

describe("DAG ordering", () => {
    it("sorts a dependency chain", () => {
        const dag = createDAG("etl");
        const extract = addTask(dag, { name: "extract", fn: () => "raw" });

        const transform = addTask(dag, {
            name: "transform",
            fn: () => "clean",
        });

        const load = addTask(dag, { name: "load", fn: () => "stored" });

        extract.setDownstream(transform);
        transform.setDownstream(load);

        expect(namesOf(dag)).toStrictEqual(["extract", "transform", "load"]);
    });

    it("places fan-out and fan-in tasks between the ends", () => {
        const dag = createDAG("diamond");
        const root = addTask(dag, { name: "root", fn: () => 0 });
        const left = addTask(dag, { name: "left", fn: () => 0 });
        const right = addTask(dag, { name: "right", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        crossDownstream([root], [left, right]);
        crossDownstream([left, right], [sink]);

        const order = namesOf(dag);

        expect(order).toHaveLength(4);
        expect(order[0]).toBe("root");
        expect(order.at(-1)).toBe("sink");
    });

    it("rejects cycles and self dependencies", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });

        first.setDownstream(second);

        expect(() => second.setDownstream(first)).toThrow(/creates a cycle/u);
        expect(() => first.setDownstream(first)).toThrow(
            /cannot depend on itself/u
        );
    });

    it("detects cycles reached through shared descendants", () => {
        const dag = createDAG("diamond");
        const root = addTask(dag, { name: "root", fn: () => 0 });
        const left = addTask(dag, { name: "left", fn: () => 0 });
        const right = addTask(dag, { name: "right", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        crossDownstream([root], [left, right]);
        crossDownstream([left, right], [sink]);

        expect(() => sink.setDownstream(root)).toThrow(/creates a cycle/u);
    });

    it("returns an empty order for an empty DAG", () => {
        expect(createDAG("empty").topologicalSort()).toStrictEqual([]);
    });

    it("returns the only task of a single-task DAG", () => {
        const dag = createDAG("single");
        const task = addTask(dag, { name: "only", fn: () => 0 });

        expect(dag.topologicalSort()).toStrictEqual([task]);
    });

    it("keeps registration order for independent tasks", () => {
        const dag = createDAG("flat");

        addTask(dag, { name: "zeta", fn: () => 0 });
        addTask(dag, { name: "alpha", fn: () => 0 });
        addTask(dag, { name: "mike", fn: () => 0 });

        expect(namesOf(dag)).toStrictEqual(["zeta", "alpha", "mike"]);
    });

    it("places every task after all of its upstreams", () => {
        const dag = createDAG("pipeline");

        const root = addTask(dag, { name: "A", fn: () => 0 });
        const left = addTask(dag, { name: "B", fn: () => 0 });
        const right = addTask(dag, { name: "C", fn: () => 0 });
        const leftPeer = addTask(dag, { name: "D", fn: () => 0 });
        const join = addTask(dag, { name: "E", fn: () => 0 });
        const sink = addTask(dag, { name: "F", fn: () => 0 });
        const rightPeer = addTask(dag, { name: "G", fn: () => 0 });

        dag.chain(root, [leftPeer, left])
            .chain(leftPeer, join)
            .chain(left, [join, right, rightPeer])
            .chain(right, rightPeer)
            .chain(join, sink)
            .chain(rightPeer, sink);

        const order = dag.topologicalSort();

        expect(order).toHaveLength(7);
        expect(order[0]).toBe(root);
        expect(order.at(-1)).toBe(sink);

        for (const task of order) {
            for (const upstream of task.upstream) {
                expect(order.indexOf(upstream)).toBeLessThan(
                    order.indexOf(task)
                );
            }
        }

        expect(namesOf(dag)).toStrictEqual(order.map((task) => task.name));
    });
});

describe("JSON representation", () => {
    it("returns an empty task list for an empty DAG", () => {
        expect(createDAG("empty").toJSON()).toStrictEqual({
            name: "empty",
            tasks: [],
        });
    });

    it("serializes tasks and edges by name", () => {
        const dag = createDAG("etl");

        const extract = addTask(dag, {
            name: "extract",
            fn: () => "raw",
            triggerRule: TRIGGER_RULE_ENUM.AllDone,
            config: { timeout_ms: 100 },
        });

        const transform = addTask(dag, {
            name: "transform",
            fn: () => "clean",
        });

        const load = addTask(dag, { name: "load", fn: () => "stored" });

        extract.setDownstream(transform);
        transform.setDownstream(load);

        expect(dag.toJSON()).toStrictEqual({
            name: "etl",
            tasks: [
                {
                    id: extract.id,
                    name: "extract",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: TRIGGER_RULE_ENUM.AllDone,
                    config: { timeout_ms: 100 },
                    upstream: [],
                    downstream: ["transform"],
                },
                {
                    id: transform.id,
                    name: "transform",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: TRIGGER_RULE_ENUM.AllSuccess,
                    upstream: ["extract"],
                    downstream: ["load"],
                },
                {
                    id: load.id,
                    name: "load",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: TRIGGER_RULE_ENUM.AllSuccess,
                    upstream: ["transform"],
                    downstream: [],
                },
            ],
        });
    });

    it("omits config when it is missing", () => {
        const dag = createDAG("etl");
        const task = addTask(dag, { name: "extract", fn: () => 0 });

        expect(dag.toJSON().tasks[0]).toStrictEqual({
            id: task.id,
            name: "extract",
            kind: TASK_KIND_ENUM.Task,
            triggerRule: TRIGGER_RULE_ENUM.AllSuccess,
            upstream: [],
            downstream: [],
        });
    });

    it("drops functions from the encoded form", () => {
        const dag = createDAG("etl");
        addTask(dag, { name: "extract", fn: () => "raw" });

        const encoded = JSON.stringify(dag);

        expect(encoded).not.toContain('"fn"');
        expect(encoded).toBe(JSON.stringify(dag.toJSON()));
    });

    it("serializes a fan-out and fan-in chain built in one call", () => {
        const { cleanA, cleanB, dag, extract, join, publish, validate } =
            buildComplexDag();

        expect(dag.toJSON()).toStrictEqual({
            name: "complex",
            tasks: [
                {
                    id: extract.id,
                    name: "extract",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: DEFAULT_TRIGGER_RULE,
                    description: "Read source data",
                    upstream: [],
                    downstream: ["cleanA", "cleanB"],
                },
                {
                    id: cleanA.id,
                    name: "cleanA",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: DEFAULT_TRIGGER_RULE,
                    upstream: ["extract"],
                    downstream: ["join"],
                },
                {
                    id: cleanB.id,
                    name: "cleanB",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: DEFAULT_TRIGGER_RULE,
                    upstream: ["extract"],
                    downstream: ["join"],
                },
                {
                    id: join.id,
                    name: "join",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: DEFAULT_TRIGGER_RULE,
                    upstream: ["cleanA", "cleanB"],
                    downstream: ["validate"],
                },
                {
                    id: validate.id,
                    name: "validate",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: DEFAULT_TRIGGER_RULE,
                    upstream: ["join"],
                    downstream: ["publish"],
                },
                {
                    id: publish.id,
                    name: "publish",
                    kind: TASK_KIND_ENUM.Task,
                    triggerRule: DEFAULT_TRIGGER_RULE,
                    upstream: ["validate"],
                    downstream: [],
                },
            ],
        });
    });
});

describe("group chaining", () => {
    it("links each group to the next and returns the DAG", () => {
        const dag = createDAG("example");
        const a = addTask(dag, { name: "A", fn: () => 0 });
        const b = addTask(dag, { name: "B", fn: () => 0 });
        const c = addTask(dag, { name: "C", fn: () => 0 });
        const d = addTask(dag, { name: "D", fn: () => 0 });
        const e = addTask(dag, { name: "E", fn: () => 0 });
        const f = addTask(dag, { name: "F", fn: () => 0 });
        const g = addTask(dag, { name: "G", fn: () => 0 });

        const chained = dag
            .chain(a, [d, b])
            .chain(d, e)
            .chain(b, [e, c, g])
            .chain(c, g)
            .chain(e, f)
            .chain(g, f);

        const order = namesOf(dag);

        expect(chained).toBe(dag);
        expect([...a.downstream]).toStrictEqual([d, b]);
        expect([...b.downstream]).toStrictEqual([e, c, g]);
        expect(order[0]).toBe("A");
        expect(order.at(-1)).toBe("F");
    });

    it("registers a single group without adding edges", () => {
        const dag = createDAG("single");
        const definition = createTask("only", { fn: () => 0 });

        dag.chain(definition);

        expect(dag.getTask("only")?.name).toBe("only");
        expect(dag.getTask("only")?.id).toHaveLength(FNV_128_HEX_LENGTH);
        expect(dag.getTask("only")?.downstream.size).toBe(0);
    });

    it("adds no edges for a single group and skips linked edges", () => {
        const dag = createDAG("chain");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });

        dag.chain(first);

        expect(first.downstream.size).toBe(0);

        dag.chain(first, second).chain(first, second);

        expect(first.downstream.size).toBe(1);
    });

    it("links a group to the preceding group", () => {
        const dag = createDAG("fan-in");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const sink = addTask(dag, { name: "sink", fn: () => 0 });

        dag.chain([first, second], sink);

        expect([...sink.upstream]).toStrictEqual([first, second]);
        expect([...first.downstream]).toStrictEqual([sink]);
        expect([...second.downstream]).toStrictEqual([sink]);
    });

    it("chains three tasks in one call", () => {
        const dag = createDAG("linear");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const third = addTask(dag, { name: "third", fn: () => 0 });

        dag.chain(first, second, third);

        expect([...first.downstream]).toStrictEqual([second]);
        expect([...second.upstream]).toStrictEqual([first]);
        expect([...second.downstream]).toStrictEqual([third]);
        expect([...third.upstream]).toStrictEqual([second]);
    });

    it("chains a middle group between two tasks in one call", () => {
        const dag = createDAG("grouped");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second1 = addTask(dag, { name: "second1", fn: () => 0 });
        const second2 = addTask(dag, { name: "second2", fn: () => 0 });
        const third = addTask(dag, { name: "third", fn: () => 0 });

        dag.chain(first, [second1, second2], third);

        expect([...first.downstream]).toStrictEqual([second1, second2]);
        expect([...second1.downstream]).toStrictEqual([third]);
        expect([...second2.downstream]).toStrictEqual([third]);
        expect([...third.upstream]).toStrictEqual([second1, second2]);
    });

    it("keeps separate chain calls independent", () => {
        const a = createTask("a", { fn: () => 0 });
        const b = createTask("b", { fn: () => 0 });
        const c = createTask("c", { fn: () => 0 });
        const d = createTask("d", { fn: () => 0 });

        const dag = createDAG("etl").chain(a, b).chain(c, d);

        expect(downstreamNames(dag)).toStrictEqual({
            a: ["b"],
            b: [],
            c: ["d"],
            d: [],
        });
    });

    it("links every pair across three groups in one call", () => {
        const dag = createDAG("matrix");
        const a1 = addTask(dag, { name: "a1", fn: () => 0 });
        const a2 = addTask(dag, { name: "a2", fn: () => 0 });
        const b1 = addTask(dag, { name: "b1", fn: () => 0 });
        const b2 = addTask(dag, { name: "b2", fn: () => 0 });
        const c1 = addTask(dag, { name: "c1", fn: () => 0 });
        const c2 = addTask(dag, { name: "c2", fn: () => 0 });

        dag.chain([a1, a2], [b1, b2], [c1, c2]);

        expect(downstreamNames(dag)).toStrictEqual({
            a1: ["b1", "b2"],
            a2: ["b1", "b2"],
            b1: ["c1", "c2"],
            b2: ["c1", "c2"],
            c1: [],
            c2: [],
        });
    });

    it("wires a fan-out and fan-in chain in one call", () => {
        const { dag } = buildComplexDag();

        expect(downstreamNames(dag)).toStrictEqual({
            cleanA: ["join"],
            cleanB: ["join"],
            extract: ["cleanA", "cleanB"],
            join: ["validate"],
            publish: [],
            validate: ["publish"],
        });
    });

    it("rejects a cycle spanning multiple chained groups", () => {
        const dag = createDAG("cycle");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const third = addTask(dag, { name: "third", fn: () => 0 });

        dag.chain(first, second);

        expect(() => dag.chain(second, third, first)).toThrow(
            'Dependency "third" -> "first" creates a cycle'
        );
        expect(second.downstream.size).toBe(0);
        expect(third.upstream.size).toBe(0);
        expect(third.downstream.size).toBe(0);
    });

    it("rolls back tasks registered by a failed chain", () => {
        const dag = createDAG("cycle");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });
        const third = createTask("third", { fn: () => 0 });

        dag.chain(first, second);

        expect(() => dag.chain(second, third, first)).toThrow(
            'Dependency "third" -> "first" creates a cycle'
        );
        expect(dag.getTask("third")).toBeUndefined();
        expect([...dag.tasks.keys()]).toStrictEqual(["first", "second"]);
        expect(second.downstream.size).toBe(0);
    });

    it("rejects tasks from another DAG inside chained groups", () => {
        const dag = createDAG("etl");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const other = createDAG("other");
        const outsider = addTask(other, { name: "outsider", fn: () => 0 });

        expect(() => dag.chain([first], [outsider])).toThrow(
            "Both tasks must belong to this DAG"
        );
    });

    it("leaves the chain disconnected when a middle group is empty", () => {
        const dag = createDAG("empty-group");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const third = addTask(dag, { name: "third", fn: () => 0 });

        dag.chain(first, [], third);

        expect(first.downstream.size).toBe(0);
        expect(third.upstream.size).toBe(0);
    });

    it("deduplicates a task repeated inside one group", () => {
        const dag = createDAG("duplicate-group");
        const first = addTask(dag, { name: "first", fn: () => 0 });
        const second = addTask(dag, { name: "second", fn: () => 0 });

        dag.chain([first, first], second);

        expect([...first.downstream]).toStrictEqual([second]);
    });
});
