import { describe, expect, it } from "vitest";

import { branch } from "@/core/task/branch";
import { task as createTask } from "@/core/task/task";

import { createDAG } from "./dag";
import type { DAG } from "./dag";
import { crossDownstream } from "./dag-task";
import type { DAGTask, TaskDefinition } from "./dag-task";

// These helpers erase literal names, so the checks under test are the runtime
// ones; the static channel is covered in public-api.test.ts.
function route(branches: readonly string[], name = "route"): TaskDefinition {
    return branch(name, { branches, choose: () => branches[0] ?? "" });
}

function unchecked(): TaskDefinition {
    return branch("free", { choose: () => "anything" });
}

function regular(name: string): TaskDefinition {
    return createTask(name, { fn: () => name });
}

function requireTask(dag: DAG, name: string): DAGTask {
    const task = dag.getTask(name);

    if (task === undefined) {
        throw new Error(`Task "${name}" was not registered`);
    }

    return task;
}

function downstreamNames(dag: DAG, name: string): string[] {
    return [...requireTask(dag, name).downstream].map((task) => task.name);
}

const UNDECLARED = 'Branch "route" cannot route to "apac"';

describe("branch wiring: accepted wiring", () => {
    it("routes to exactly the declared branches", () => {
        const dag = createDAG("ok").chain(route(["us", "eu"]), [
            regular("us"),
            regular("eu"),
        ]);

        expect([...dag.tasks.keys()]).toStrictEqual(["route", "us", "eu"]);
        expect(downstreamNames(dag, "route")).toStrictEqual(["us", "eu"]);
    });

    it("ignores the order of targets inside the wiring set", () => {
        const dag = createDAG("order").chain(route(["us", "eu"]), [
            regular("eu"),
            regular("us"),
        ]);

        expect(
            [...(dag.getTask("route")?.downstream ?? [])].map((t) => t.name)
        ).toStrictEqual(["eu", "us"]);
    });

    it("accepts a single declared branch", () => {
        const dag = createDAG("single").chain(route(["us"]), regular("us"));

        expect(downstreamNames(dag, "route")).toStrictEqual(["us"]);
    });

    it("constrains only the branch's own step, not later steps", () => {
        const dag = createDAG("tail").chain(
            route(["us"]),
            regular("us"),
            regular("join")
        );

        expect(dag.topologicalSort().map((task) => task.name)).toStrictEqual([
            "route",
            "us",
            "join",
        ]);
    });

    it("allows a branch to be the downstream side of a step", () => {
        const dag = createDAG("mid").chain(
            regular("extract"),
            route(["us"]),
            regular("us")
        );

        expect(downstreamNames(dag, "extract")).toStrictEqual(["route"]);
        expect(downstreamNames(dag, "route")).toStrictEqual(["us"]);
    });

    it("allows a branch to be a sink that routes nowhere", () => {
        const dag = createDAG("sink").chain(route(["us", "eu"]));

        expect([...dag.tasks.keys()]).toStrictEqual(["route"]);
    });

    it("allows a declared branch that is never registered as a task", () => {
        const dag = createDAG("declaration-only").chain(route(["us", "eu"]));

        expect(requireTask(dag, "route").downstream.size).toBe(0);
    });

    it("leaves a branch without a declared set unchecked", () => {
        const dag = createDAG("free").chain(unchecked(), regular("anything"));

        expect(downstreamNames(dag, "free")).toStrictEqual(["anything"]);
    });

    it("validates each branch task in a shared upstream set", () => {
        const dag = createDAG("pair").chain(
            [route(["us", "eu"], "first"), route(["us", "eu"], "second")],
            [regular("us"), regular("eu")]
        );

        expect([...dag.tasks.keys()]).toStrictEqual([
            "first",
            "second",
            "us",
            "eu",
        ]);
        expect(downstreamNames(dag, "second")).toStrictEqual(["us", "eu"]);
    });

    it("rejects a shared upstream set when one branch declares a different set", () => {
        expect(() =>
            createDAG("mismatch").chain(
                [route(["us"], "first"), route(["eu"], "second")],
                [regular("us"), regular("eu")]
            )
        ).toThrow('Branch "first" cannot route to "eu"');
    });

    it("accepts bounded empty wiring sets around a branch", () => {
        const dag = createDAG("empty-sets").chain(
            route(["us"]),
            [],
            regular("us")
        );

        // An empty set severs the step, so no adjacency is checked.
        expect(requireTask(dag, "route").downstream.size).toBe(0);
        expect(requireTask(dag, "us").upstream.size).toBe(0);
    });

    it("tolerates a duplicated declared name", () => {
        const dag = createDAG("dup-declared").chain(
            route(["us", "us"]),
            regular("us")
        );

        expect(downstreamNames(dag, "route")).toStrictEqual(["us"]);
    });
});

describe("branch wiring: rejected wiring", () => {
    it("rejects an undeclared target in a later call", () => {
        const dag = createDAG("later").chain(route(["us", "eu"]));

        expect(() =>
            dag.chain(requireTask(dag, "route"), regular("apac"))
        ).toThrow(
            'Branch "route" cannot route to "apac"; declared branches are "us", "eu"'
        );
        expect(requireTask(dag, "route").downstream.size).toBe(0);
    });

    it("rejects an undeclared target inside the declaring call", () => {
        expect(() =>
            createDAG("one-call").chain(route(["us"]), [
                regular("us"),
                regular("eu"),
            ])
        ).toThrow('Branch "route" cannot route to "eu"');
    });

    it("rejects the first undeclared target of several", () => {
        expect(() =>
            createDAG("many").chain(route(["us"]), [
                regular("us"),
                regular("eu"),
                regular("apac"),
            ])
        ).toThrow('Branch "route" cannot route to "eu"');
    });

    it("rejects a declared branch the step does not route to", () => {
        expect(() =>
            createDAG("missing").chain(route(["us", "eu"]), regular("us"))
        ).toThrow('Branch "route" must route to declared branch "eu"');
    });

    it("rejects a declared branch reached only through an intermediate task", () => {
        expect(() =>
            createDAG("hop").chain(route(["us"]), regular("mid"), regular("us"))
        ).toThrow('Branch "route" cannot route to "mid"');
    });

    it("rejects a split fan-out: the declaring call must be whole", () => {
        expect(() =>
            createDAG("split").chain(route(["us", "eu"]), regular("us"))
        ).toThrow('Branch "route" must route to declared branch "eu"');

        const dag = createDAG("split-halves");
        dag.chain(route(["us", "eu"]));

        expect(() =>
            dag.chain(requireTask(dag, "route"), regular("us"))
        ).toThrow('Branch "route" must route to declared branch "eu"');
    });

    it("rejects every target of a branch declaring none", () => {
        expect(() =>
            createDAG("empty-decl").chain(route([]), regular("us"))
        ).toThrow(
            'Branch "route" cannot route to "us"; it declares no branches'
        );
    });

    it("compares declared names case-sensitively", () => {
        expect(() =>
            createDAG("case").chain(route(["us"]), regular("US"))
        ).toThrow('Branch "route" cannot route to "US"');
    });

    it("rejects a declared name that can never be a task name", () => {
        expect(() =>
            createDAG("bad-name").chain(route(["us east"]), regular("us_east"))
        ).toThrow(
            'Branch "route" cannot route to "us_east"; declared branches are "us east"'
        );
    });

    it("rejects an undeclared target through addDependency", () => {
        const dag = createDAG("single-edge").chain(route(["us"]));

        expect(() =>
            dag.addDependency(requireTask(dag, "route"), regular("apac"))
        ).toThrow(UNDECLARED);
    });

    it("rejects an undeclared target through addDependencies", () => {
        const dag = createDAG("batch-edge").chain(route(["us"]));
        const source = requireTask(dag, "route");
        const target = requireTask(dag.chain(regular("apac")), "apac");

        expect(() => dag.addDependencies([source], [target])).toThrow(
            UNDECLARED
        );
    });

    it("rejects an undeclared target through the handle methods", () => {
        const dag = createDAG("handles").chain(route(["us"]));
        const source = requireTask(dag, "route");
        const target = requireTask(dag.chain(regular("apac")), "apac");

        expect(() => source.setDownstream(target)).toThrow(UNDECLARED);
        expect(() => target.setUpstream(source)).toThrow(UNDECLARED);
        expect(() => target.dependsOn(source)).toThrow(UNDECLARED);
    });

    it("rejects an undeclared target through crossDownstream", () => {
        const dag = createDAG("cross").chain(route(["us"]));
        const source = requireTask(dag, "route");
        const target = requireTask(dag.chain(regular("apac")), "apac");

        expect(() => crossDownstream([source], [target])).toThrow(UNDECLARED);
    });

    it("applies to a declared branch sharing the upstream set", () => {
        const dag = createDAG("mixed").chain(route(["us"]), regular("us"));

        expect(() =>
            dag.chain(
                [requireTask(dag, "route"), unchecked()],
                [regular("other")]
            )
        ).toThrow('Branch "route" cannot route to "other"');
    });

    it("rolls back the batch that fails the check", () => {
        const dag = createDAG("rollback").chain(route(["us"]));

        expect(() =>
            dag.chain(requireTask(dag, "route"), regular("apac"))
        ).toThrow(UNDECLARED);
        expect(dag.getTask("apac")).toBeUndefined();
        expect(requireTask(dag, "route").downstream.size).toBe(0);
    });
});

describe("branch wiring: precedence and repeats", () => {
    it("reports a self-edge before a branch problem", () => {
        const dag = createDAG("precedence").chain(route(["us"]), regular("us"));
        const group = [requireTask(dag, "route"), requireTask(dag, "us")];

        expect(() => dag.chain(group, group)).toThrow(
            "A task cannot depend on itself"
        );
    });

    it("reports a name collision before a branch problem", () => {
        expect(() =>
            createDAG("collision").chain(route(["route"]), regular("route"))
        ).toThrow('Task "route" already exists in DAG "collision"');
    });

    it("repeats a complete wiring step as a no-op", () => {
        const dag = createDAG("repeat").chain(route(["us", "eu"]), [
            regular("us"),
            regular("eu"),
        ]);

        dag.chain(requireTask(dag, "route"), [
            requireTask(dag, "us"),
            requireTask(dag, "eu"),
        ]);

        expect(downstreamNames(dag, "route")).toStrictEqual(["us", "eu"]);
    });

    it("accepts a repeated partial step once the set is complete", () => {
        const dag = createDAG("repeat-partial").chain(route(["us", "eu"]), [
            regular("us"),
            regular("eu"),
        ]);

        dag.chain(requireTask(dag, "route"), requireTask(dag, "us"));

        expect(requireTask(dag, "route").downstream.size).toBe(2);
    });

    it("treats a reordered declared set as a different task identity", () => {
        const dag = createDAG("reorder").chain(route(["us", "eu"]));

        expect(() => dag.chain(route(["eu", "us"]))).toThrow(
            'Task "route" already exists in DAG "reorder"'
        );
    });

    it("leaves serialization untouched", () => {
        const dag = createDAG("surfaces").chain(route(["us"]), regular("us"));

        const branchJson = dag
            .toJSON()
            .tasks.find((task) => task.name === "route");

        expect(branchJson?.downstream).toStrictEqual(["us"]);
    });
});
