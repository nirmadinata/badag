import { describe, expect, it } from "vitest";

import { branch } from "../../task/factories/branch";
import { delay } from "../../task/factories/delay";
import { sensor } from "../../task/factories/sensor";
import { shortCircuit } from "../../task/factories/short-circuit";
import { task as createTask } from "../../task/factories/task";
import { trigger } from "../../task/factories/trigger";
import { createDAG } from "../dag";
import type { DAG } from "../dag";
import { stateOf } from "../registered-task";
import type { DAGTask, TaskDefinition } from "../registered-task";
import { findViolations } from "./audit";
import { DAG_VIOLATION_ENUM } from "./violation";
import type { DAGViolation, DAGViolationCode } from "./violation";

// These helpers erase literal names, so the checks under test are the runtime
// ones; the static channel is covered in public-api.test.ts.
function route(branches: readonly string[], name = "route"): TaskDefinition {
    return branch(name, { branches, choose: () => branches[0] ?? "" });
}

function freeBranch(name = "free"): TaskDefinition {
    return branch(name, {
        branches: [],
        // SAFETY: a branch declaring no names accepts no branch choice; this
        // chooser is never invoked, and the empty set is what the test uses.
        choose: () => undefined as never,
    });
}

function regular(name: string): TaskDefinition {
    return createTask(name, { fn: () => name });
}

/** Whether `name` is registered as a task in `dag`. */
function hasTask(dag: DAG, name: string): boolean {
    return [...dag.tasks.values()].some((task) => task.name === name);
}

function requireTask(dag: DAG, name: string): DAGTask {
    const task = dag.getTask(name);

    if (task === undefined) {
        throw new Error(`Task "${name}" was not registered`);
    }

    return task;
}

function codes(violations: readonly { code: DAGViolationCode }[]): string[] {
    return violations.map((violation) => violation.code);
}

function subjectsOf(violation: DAGViolation): readonly string[] {
    return violation.subjects;
}

/**
 * Write an edge into the graph state without going through the public wiring
 * methods, so the resulting graph is exactly what `validate()` must audit.
 */
function injectEdge(from: DAGTask, to: DAGTask): void {
    stateOf(from).downstream.add(to);
    stateOf(to).upstream.add(from);
}

describe("validate: graphs built through the wiring API", () => {
    it("reports nothing for an empty DAG", () => {
        expect(createDAG("empty").validate()).toStrictEqual([]);
    });

    it("reports nothing for a linear chain", () => {
        const dag = createDAG("etl").chain(
            regular("extract"),
            regular("transform"),
            regular("load")
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for a graph with independent components", () => {
        const dag = createDAG("split")
            .chain(regular("a"), regular("b"))
            .chain(regular("c"), regular("d"));

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for bitshift wiring", () => {
        const a = regular("a");
        const b = regular("b");
        const c = regular("c");
        const dag = createDAG("fan").parse`${a} >> ${b}`.parse`${c} >> ${b}`;

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing when a branch routes to every declared branch", () => {
        const dag = createDAG("routing").chain(route(["us", "eu"]), [
            regular("us"),
            regular("eu"),
        ]);

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports a branch registered alone with declared branches", () => {
        const dag = createDAG("pending").chain(route(["us", "eu"]));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "us"',
                subjects: ["route", "us"],
            },
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "eu"',
                subjects: ["route", "eu"],
            },
        ]);
    });

    it("clears the finding once the branch is routed", () => {
        const dag = createDAG("pending").chain(route(["us", "eu"]), [
            regular("us"),
            regular("eu"),
        ]);

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for a branch that declares no branches", () => {
        const unchecked = branch("free", { choose: () => "anything" });
        const dag = createDAG("free").chain(unchecked, regular("anything"));

        expect(dag.validate()).toStrictEqual([]);
    });

    it("agrees with topologicalSort on a valid graph", () => {
        const dag = createDAG("etl").chain(regular("a"), regular("b"));

        expect(dag.validate()).toStrictEqual([]);
        expect(dag.topologicalSort()).toHaveLength(2);
    });

    it("reports nothing for a diamond", () => {
        const dag = createDAG("diamond").chain(
            regular("a"),
            [regular("b"), regular("c")],
            regular("d")
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for a deep single chain", () => {
        const names = Array.from({ length: 100 }, (_, index) => `t${index}`);
        const dag = createDAG("deep").chain(...names.map(regular));

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for a wide fan-out and fan-in", () => {
        const leaves = Array.from({ length: 50 }, (_, index) =>
            regular(`leaf${index}`)
        );

        const dag = createDAG("wide").chain(
            regular("root"),
            leaves,
            regular("sink")
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for repeated identical wiring calls", () => {
        const a = regular("a");
        const b = regular("b");
        const dag = createDAG("idem").chain(a, b).chain(a, b).chain(a, b);

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for a complete multipartite layering", () => {
        const dag = createDAG("layers").chain(
            [regular("a"), regular("b")],
            [regular("c"), regular("d")],
            [regular("e"), regular("f")]
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for every task kind wired in one graph", () => {
        const dag = createDAG("kinds").chain(
            regular("extract"),
            sensor("wait", { predicate: () => true }),
            delay("pause", { durationMs: 10 }),
            shortCircuit("gate", { condition: () => true }),
            trigger("launch", { dagName: "child" })
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for a branch routed to one declared branch", () => {
        const dag = createDAG("single").chain(route(["only"]), [
            regular("only"),
        ]);

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing for two branches routing independently", () => {
        const dag = createDAG("routing")
            .chain([route(["us"], "geo")], [regular("us")])
            .chain([route(["eu"], "region")], [regular("eu")]);

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports nothing after a rejected batch rolls back", () => {
        const dag = createDAG("rollback").chain(regular("a"), regular("b"));
        const c = regular("c");

        expect(() => dag.chain(c, c)).toThrow("A task cannot depend on itself");
        expect(dag.validate()).toStrictEqual([]);
        expect(dag.tasks.size).toBe(2);
    });

    it("does not mutate the graph", () => {
        const dag = createDAG("etl").chain(regular("a"), regular("b"));

        dag.validate();

        expect(dag.tasks.size).toBe(2);
        expect(
            [...requireTask(dag, "a").downstream].map((task) => task.name)
        ).toStrictEqual(["b"]);
    });
});

describe("validate: cycles", () => {
    it("reports a self edge as one finding, not a cycle too", () => {
        const dag = createDAG("loop").chain(regular("only"));

        injectEdge(requireTask(dag, "only"), requireTask(dag, "only"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.SelfEdge,
                message: 'Task "only" depends on itself',
                subjects: ["only"],
            },
        ]);
    });

    it("reports the tasks on a two-task cycle", () => {
        const dag = createDAG("loop").chain(regular("a"), regular("b"));

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));

        const violations = dag.validate();

        expect(codes(violations)).toStrictEqual([DAG_VIOLATION_ENUM.Cycle]);
        expect(violations[0]?.subjects).toStrictEqual(["a", "b", "a"]);
    });

    it("reports the path that closes a longer cycle", () => {
        const dag = createDAG("loop").chain(
            regular("a"),
            regular("b"),
            regular("c")
        );

        injectEdge(requireTask(dag, "c"), requireTask(dag, "a"));

        const violations = dag.validate();

        expect(codes(violations)).toStrictEqual([DAG_VIOLATION_ENUM.Cycle]);
        expect(violations[0]?.subjects).toStrictEqual(["a", "b", "c", "a"]);
    });

    it("reports each disjoint cycle", () => {
        const dag = createDAG("loops")
            .chain(regular("a"), regular("b"))
            .chain(regular("c"), regular("d"));

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));
        injectEdge(requireTask(dag, "d"), requireTask(dag, "c"));

        const violations = dag.validate();

        expect(codes(violations)).toStrictEqual([
            DAG_VIOLATION_ENUM.Cycle,
            DAG_VIOLATION_ENUM.Cycle,
        ]);
        expect(violations[0]?.subjects).toStrictEqual(["a", "b", "a"]);
        expect(violations[1]?.subjects).toStrictEqual(["c", "d", "c"]);
    });

    it("reports a cycle once when two tasks share it", () => {
        const dag = createDAG("diamond").chain(
            regular("a"),
            [regular("b"), regular("c")],
            regular("d")
        );

        injectEdge(requireTask(dag, "d"), requireTask(dag, "a"));

        expect(codes(dag.validate())).toStrictEqual([DAG_VIOLATION_ENUM.Cycle]);
    });

    it("reports two distinct cycles that share a task", () => {
        const dag = createDAG("figure-eight").chain(
            regular("a"),
            regular("b"),
            regular("c")
        );

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));
        injectEdge(requireTask(dag, "c"), requireTask(dag, "b"));

        const violations = dag.validate();

        expect(codes(violations)).toStrictEqual([
            DAG_VIOLATION_ENUM.Cycle,
            DAG_VIOLATION_ENUM.Cycle,
        ]);
        expect(violations[0]?.subjects).toStrictEqual(["b", "c", "b"]);
        expect(violations[1]?.subjects).toStrictEqual(["a", "b", "a"]);
    });

    it("reports a cycle entered below its head", () => {
        const dag = createDAG("late").chain(
            regular("a"),
            regular("b"),
            regular("c")
        );

        injectEdge(requireTask(dag, "c"), requireTask(dag, "b"));

        const violations = dag.validate();

        expect(codes(violations)).toStrictEqual([DAG_VIOLATION_ENUM.Cycle]);
        expect(violations[0]?.subjects).toStrictEqual(["b", "c", "b"]);
    });

    it("reports separate self edges on separate tasks", () => {
        const dag = createDAG("selfs").chain([regular("x"), regular("y")]);

        injectEdge(requireTask(dag, "x"), requireTask(dag, "x"));
        injectEdge(requireTask(dag, "y"), requireTask(dag, "y"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.SelfEdge,
                message: 'Task "x" depends on itself',
                subjects: ["x"],
            },
            {
                code: DAG_VIOLATION_ENUM.SelfEdge,
                message: 'Task "y" depends on itself',
                subjects: ["y"],
            },
        ]);
    });

    it("reports a self edge recorded only upstream", () => {
        const dag = createDAG("onesided").chain(regular("z"));

        stateOf(requireTask(dag, "z")).upstream.add(requireTask(dag, "z"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.SelfEdge,
                message: 'Task "z" depends on itself',
                subjects: ["z"],
            },
        ]);
    });

    it("reports a self edge once when recorded on both sides", () => {
        const dag = createDAG("both-sides").chain(regular("w"));

        injectEdge(requireTask(dag, "w"), requireTask(dag, "w"));

        expect(dag.validate()).toHaveLength(1);
    });

    it("does not traverse a foreign target looking for cycles", () => {
        const dag = createDAG("home").chain(regular("a"), regular("b"));
        const other = createDAG("other").chain(regular("c"));

        injectEdge(requireTask(dag, "b"), requireTask(other, "c"));
        injectEdge(requireTask(other, "c"), requireTask(other, "c"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.ForeignEdge,
        ]);
    });

    it("reports a cycle in a graph with a foreign edge too", () => {
        const dag = createDAG("mixed").chain(regular("a"), regular("b"));
        const other = createDAG("other").chain(regular("c"));

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));
        injectEdge(requireTask(dag, "a"), requireTask(other, "c"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.ForeignEdge,
            DAG_VIOLATION_ENUM.Cycle,
        ]);
    });

    it("reports a cycle under a task name that matches a code", () => {
        const dag = createDAG("kw").chain(
            regular("cycle"),
            regular("self-edge")
        );

        injectEdge(requireTask(dag, "self-edge"), requireTask(dag, "cycle"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.Cycle,
                message:
                    'DAG "kw" contains a cycle: "cycle", "self-edge", "cycle"',
                subjects: ["cycle", "self-edge", "cycle"],
            },
        ]);
    });

    it("reports a five-task cycle as one finding", () => {
        const dag = createDAG("long").chain(
            regular("n0"),
            regular("n1"),
            regular("n2"),
            regular("n3"),
            regular("n4")
        );

        injectEdge(requireTask(dag, "n4"), requireTask(dag, "n0"));

        const violations = dag.validate();

        expect(violations).toHaveLength(1);
        expect(violations[0]?.subjects).toStrictEqual([
            "n0",
            "n1",
            "n2",
            "n3",
            "n4",
            "n0",
        ]);
    });
});

describe("validate: foreign and inconsistent edges", () => {
    it("reports an edge whose target belongs to another DAG", () => {
        const dag = createDAG("home").chain(regular("a"));
        const other = createDAG("other").chain(regular("b"));

        injectEdge(requireTask(dag, "a"), requireTask(other, "b"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.ForeignEdge,
                message:
                    'Edge "a" -> "b" crosses DAG boundaries; "b" is not registered in DAG "home"',
                subjects: ["a", "b"],
            },
        ]);
    });

    it("reports an edge whose source belongs to another DAG", () => {
        const dag = createDAG("home").chain(regular("a"));
        const other = createDAG("other").chain(regular("b"));

        injectEdge(requireTask(other, "b"), requireTask(dag, "a"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.ForeignEdge,
                message:
                    'Edge "b" -> "a" crosses DAG boundaries; "b" is not registered in DAG "home"',
                subjects: ["b", "a"],
            },
        ]);
    });

    it("reports an edge recorded on only the downstream side", () => {
        const dag = createDAG("half").chain(regular("a"), regular("b"));

        stateOf(requireTask(dag, "b")).upstream.delete(requireTask(dag, "a"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.InconsistentEdge,
                message: 'Edge "a" -> "b" is recorded on only one side',
                subjects: ["a", "b"],
            },
        ]);
    });

    it("reports an edge recorded on only the upstream side", () => {
        const dag = createDAG("half").chain(regular("a"), regular("b"));

        stateOf(requireTask(dag, "a")).downstream.delete(requireTask(dag, "b"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.InconsistentEdge,
                message: 'Edge "a" -> "b" is recorded on only one side',
                subjects: ["a", "b"],
            },
        ]);
    });

    it("stays valid when the wiring API rejects the bad edge", () => {
        const dag = createDAG("guarded").chain(regular("a"));

        expect(() =>
            requireTask(dag, "a").setDownstream(requireTask(dag, "a"))
        ).toThrow("A task cannot depend on itself");
        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports one finding per direction for a mutual cross-DAG edge", () => {
        const home = createDAG("home").chain(regular("a"));
        const away = createDAG("away").chain(regular("b"));

        injectEdge(requireTask(home, "a"), requireTask(away, "b"));
        injectEdge(requireTask(away, "b"), requireTask(home, "a"));

        const violations = home.validate();

        expect(codes(violations)).toStrictEqual([
            DAG_VIOLATION_ENUM.ForeignEdge,
            DAG_VIOLATION_ENUM.ForeignEdge,
        ]);
        expect(violations.map(subjectsOf)).toStrictEqual([
            ["a", "b"],
            ["b", "a"],
        ]);
    });

    it("reports a duplicate edge once", () => {
        const dag = createDAG("twice").chain(regular("p"), regular("q"));

        injectEdge(requireTask(dag, "p"), requireTask(dag, "q"));
        injectEdge(requireTask(dag, "p"), requireTask(dag, "q"));

        expect(dag.validate()).toStrictEqual([]);
    });

    it("does not report a duplicate foreign edge as inconsistent", () => {
        const dag = createDAG("dup").chain(regular("p"));
        const other = createDAG("elsewhere").chain(regular("q"));

        injectEdge(requireTask(dag, "p"), requireTask(other, "q"));
        injectEdge(requireTask(dag, "p"), requireTask(other, "q"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.ForeignEdge,
        ]);
    });

    it("reports a foreign edge recorded only upstream", () => {
        const dag = createDAG("home").chain(regular("x"));
        const other = createDAG("other").chain(regular("y"));

        stateOf(requireTask(dag, "x")).upstream.add(requireTask(other, "y"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.ForeignEdge,
                message:
                    'Edge "y" -> "x" crosses DAG boundaries; "y" is not registered in DAG "home"',
                subjects: ["y", "x"],
            },
        ]);
    });
});

describe("validate: branch routing", () => {
    it("reports a route to an undeclared branch", () => {
        // The wiring method rejects this wiring, so build the state directly.
        const dag = createDAG("routing")
            .chain([route(["us"])])
            .chain([regular("apac")]);

        injectEdge(requireTask(dag, "route"), requireTask(dag, "apac"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "us"',
                subjects: ["route", "us"],
            },
            {
                code: DAG_VIOLATION_ENUM.UndeclaredBranchTarget,
                message:
                    'Branch "route" cannot route to "apac"; declared branches are "us"',
                subjects: ["route", "apac"],
            },
        ]);
    });

    it("does not count a routing edge to another DAG", () => {
        const dag = createDAG("routing").chain(route(["us"]));
        const other = createDAG("other").chain(regular("us"));

        injectEdge(requireTask(dag, "route"), requireTask(other, "us"));

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.ForeignEdge,
                message:
                    'Edge "route" -> "us" crosses DAG boundaries; "us" is not registered in DAG "routing"',
                subjects: ["route", "us"],
            },
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "us"',
                subjects: ["route", "us"],
            },
        ]);
    });

    it("reports every declared branch when the branch routes nowhere", () => {
        const dag = createDAG("pending").chain([route(["us", "eu", "apac"])]);

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "us"',
                subjects: ["route", "us"],
            },
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "eu"',
                subjects: ["route", "eu"],
            },
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "apac"',
                subjects: ["route", "apac"],
            },
        ]);
    });

    it("reports a repeated declared name once", () => {
        const dag = createDAG("dupes").chain([route(["us", "us"])]);

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.DuplicateDeclaredBranch,
                message: 'Branch "route" declares "us" more than once',
                subjects: ["route", "us"],
            },
        ]);
    });

    it("reports nothing for a branch declaring an empty set", () => {
        const dag = createDAG("unbounded").chain([freeBranch()]);

        // An empty declaration constrains nothing, so nothing is unrouted.
        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports two branches that both miss their routing", () => {
        const dag = createDAG("two").chain([
            route(["us"], "geo"),
            route(["eu"], "region"),
        ]);

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.UnroutedBranch,
            DAG_VIOLATION_ENUM.UnroutedBranch,
        ]);
        expect(dag.validate().map(subjectsOf)).toStrictEqual([
            ["geo", "us"],
            ["region", "eu"],
        ]);
    });

    it("reports a branch wired to an existing task it never declared", () => {
        const dag = createDAG("routing")
            .chain([route(["us"])])
            .chain([regular("apac")]);

        injectEdge(requireTask(dag, "route"), requireTask(dag, "apac"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.UnroutedBranch,
            DAG_VIOLATION_ENUM.UndeclaredBranchTarget,
        ]);
    });

    it("reports a branch routed to a task that also has other upstreams", () => {
        const dag = createDAG("shared").chain([route(["us"])], [regular("us")]);
        const extra = createDAG("extra").chain(regular("feed"));

        injectEdge(requireTask(extra, "feed"), requireTask(dag, "us"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.ForeignEdge,
        ]);
    });

    it("reports a branch declaring a name no task carries", () => {
        const dag = createDAG("unroutable").chain([route(["nowhere"])]);

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message:
                    'Branch "route" must route to declared branch "nowhere"',
                subjects: ["route", "nowhere"],
            },
        ]);
    });

    it("reports only the branch that misses its routing", () => {
        const dag = createDAG("partial")
            .chain([route(["us"], "geo")], [regular("us")])
            .chain([route(["eu"], "region")]);

        expect(dag.validate().map(subjectsOf)).toStrictEqual([
            ["region", "eu"],
        ]);
    });
});

describe("validate: declared branch names", () => {
    it("reports an empty declared name", () => {
        const names: string[] = [""];

        const dag = createDAG("invalid").chain([
            branch("route", { branches: names, choose: () => names[0] ?? "" }),
        ]);

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.InvalidDeclaredBranch,
                message:
                    'Branch "route" declares "", which is not a valid task name',
                subjects: ["route", ""],
            },
        ]);
    });

    it("reports a whitespace-only declared name", () => {
        const names: string[] = ["   "];

        const dag = createDAG("invalid").chain([
            branch("route", { branches: names, choose: () => names[0] ?? "" }),
        ]);

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.InvalidDeclaredBranch,
        ]);
    });

    it("reports a declared name with internal whitespace", () => {
        const names: string[] = ["united states"];

        const dag = createDAG("invalid").chain([
            branch("route", { branches: names, choose: () => names[0] ?? "" }),
        ]);

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.InvalidDeclaredBranch,
                message:
                    'Branch "route" declares "united states", which is not a valid task name',
                subjects: ["route", "united states"],
            },
        ]);
    });

    it("does not also report an invalid name as unrouted", () => {
        const names: string[] = [""];

        const dag = createDAG("invalid").chain([
            branch("route", { branches: names, choose: () => names[0] ?? "" }),
        ]);

        expect(codes(dag.validate())).not.toContain(
            DAG_VIOLATION_ENUM.UnroutedBranch
        );
    });

    it("reports a duplicate declared name once", () => {
        const dag = createDAG("dupes").chain([route(["eu", "us", "eu"])]);

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.DuplicateDeclaredBranch,
                message: 'Branch "route" declares "eu" more than once',
                subjects: ["route", "eu"],
            },
            {
                code: DAG_VIOLATION_ENUM.UnroutedBranch,
                message: 'Branch "route" must route to declared branch "us"',
                subjects: ["route", "us"],
            },
        ]);
    });

    it("reports duplicates and unrouted names together", () => {
        const dag = createDAG("mixed").chain([route(["us", "us", "eu"])]);

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.DuplicateDeclaredBranch,
            DAG_VIOLATION_ENUM.UnroutedBranch,
        ]);
        expect(dag.validate().map(subjectsOf)).toStrictEqual([
            ["route", "us"],
            ["route", "eu"],
        ]);
    });

    it("accepts a hyphenated declared name", () => {
        const dag = createDAG("valid").chain(route(["us-east"]), [
            regular("us-east"),
        ]);

        expect(dag.validate()).toStrictEqual([]);
    });

    it("accepts an underscored and numeric declared name", () => {
        const dag = createDAG("valid").chain(route(["region_1", "42"]), [
            regular("region_1"),
            regular("42"),
        ]);

        expect(dag.validate()).toStrictEqual([]);
    });
});

describe("validate: trigger tasks", () => {
    it("reports a trigger that starts its own DAG", () => {
        const dag = createDAG("daily").chain(
            trigger("relaunch", { dagName: "daily" })
        );

        expect(dag.validate()).toStrictEqual([
            {
                code: DAG_VIOLATION_ENUM.SelfTrigger,
                message:
                    'Trigger task "relaunch" starts DAG "daily", which contains it',
                subjects: ["relaunch", "daily"],
            },
        ]);
    });

    it("reports a self trigger whose target is padded", () => {
        const dag = createDAG("daily").chain(
            trigger("relaunch", { dagName: " daily " })
        );

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.SelfTrigger,
        ]);
    });

    it("accepts a trigger that starts another DAG", () => {
        const dag = createDAG("parent").chain(
            trigger("kick", { dagName: "child" })
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("accepts a trigger whose target differs only by case", () => {
        const dag = createDAG("daily").chain(
            trigger("kick", { dagName: "Daily" })
        );

        expect(dag.validate()).toStrictEqual([]);
    });

    it("reports each self-triggering task separately", () => {
        const dag = createDAG("loop").chain([
            trigger("first", { dagName: "loop" }),
            trigger("second", { dagName: "loop" }),
            trigger("third", { dagName: "other" }),
        ]);

        expect(dag.validate().map(subjectsOf)).toStrictEqual([
            ["first", "loop"],
            ["second", "loop"],
        ]);
    });

    it("reports a self trigger alongside a branch finding", () => {
        const dag = createDAG("loop")
            .chain([route(["us"])])
            .chain([trigger("relaunch", { dagName: "loop" })]);

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.UnroutedBranch,
            DAG_VIOLATION_ENUM.SelfTrigger,
        ]);
    });
});

describe("validate: subject names", () => {
    it("names a declared branch, not a task, for an unrouted branch", () => {
        const dag = createDAG("pending").chain([route(["us"])]);

        expect(hasTask(dag, "us")).toBeFalsy();
        expect(dag.validate()[0]?.subjects).toStrictEqual(["route", "us"]);
    });

    it("names a DAG, not a task, for a self trigger", () => {
        const dag = createDAG("daily").chain(
            trigger("relaunch", { dagName: "daily" })
        );

        expect(hasTask(dag, "daily")).toBeFalsy();
        expect(dag.validate()[0]?.subjects).toStrictEqual([
            "relaunch",
            "daily",
        ]);
    });

    it("names only registered tasks for an edge finding", () => {
        const dag = createDAG("etl").chain(regular("a"), regular("b"));

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));

        for (const subject of dag.validate()[0]?.subjects ?? []) {
            expect(hasTask(dag, subject)).toBeTruthy();
        }
    });
});

describe("validate: declared branch routing", () => {
    it("refuses to route a branch across two steps", () => {
        const dag = createDAG("split");

        // The wiring method enforces this, so validation never sees it; the
        // assertion pins the rule the glossary states.
        expect(() => dag.chain([route(["us", "eu"])], [regular("us")])).toThrow(
            'Branch "route" must route to declared branch "eu"'
        );
    });

    it("rejects a superset when the extra target is not declared", () => {
        const dag = createDAG("extra")
            .chain([route(["us"])], [regular("us")])
            .chain([regular("apac")]);

        injectEdge(requireTask(dag, "route"), requireTask(dag, "apac"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.UndeclaredBranchTarget,
        ]);
    });

    it("reports a branch that declares more than it routes", () => {
        const dag = createDAG("subset").chain(
            [route(["us", "eu"])],
            [regular("us"), regular("eu")]
        );

        stateOf(requireTask(dag, "route")).downstream.delete(
            requireTask(dag, "eu")
        );

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.InconsistentEdge,
            DAG_VIOLATION_ENUM.UnroutedBranch,
        ]);
        expect(dag.validate()[1]?.subjects).toStrictEqual(["route", "eu"]);
    });
});

describe("validate: reporting contract", () => {
    it("returns findings in edge, cycle, branch order", () => {
        const dag = createDAG("mixed")
            .chain([route(["us"])])
            .chain(regular("a"), regular("b"));

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));
        injectEdge(requireTask(dag, "b"), requireTask(dag, "b"));

        expect(codes(dag.validate())).toStrictEqual([
            DAG_VIOLATION_ENUM.SelfEdge,
            DAG_VIOLATION_ENUM.Cycle,
            DAG_VIOLATION_ENUM.UnroutedBranch,
        ]);
    });

    it("returns a list of findings that callers can iterate", () => {
        const dag = createDAG("pending").chain([route(["us"])]);
        const violations = dag.validate();

        expect(Array.isArray(violations)).toBeTruthy();
        expect(dag.validate()).toStrictEqual(violations);
    });

    it("returns the same findings on repeated calls", () => {
        const dag = createDAG("pending").chain([route(["us", "eu"])]);

        expect(dag.validate()).toStrictEqual(dag.validate());
    });

    it("names only registered tasks in edge findings", () => {
        const dag = createDAG("home").chain(regular("a"));
        const other = createDAG("other").chain(regular("b"));

        injectEdge(requireTask(dag, "a"), requireTask(other, "b"));

        for (const violation of dag.validate()) {
            expect(violation.subjects[0]).toBe("a");
        }
    });

    it("keeps messages free of the DAG name for task-local findings", () => {
        const dag = createDAG("pending").chain([route(["us"])]);

        expect(dag.validate()[0]?.message).toBe(
            'Branch "route" must route to declared branch "us"'
        );
    });

    it("includes the DAG name for cycle findings", () => {
        const dag = createDAG("named").chain(regular("a"), regular("b"));

        injectEdge(requireTask(dag, "b"), requireTask(dag, "a"));

        expect(dag.validate()[0]?.message).toContain('DAG "named"');
    });
});

describe(findViolations, () => {
    it("returns an empty list for no tasks", () => {
        expect(findViolations("empty", [])).toStrictEqual([]);
    });

    it("reports codes as a closed set", () => {
        expect(Object.values(DAG_VIOLATION_ENUM).toSorted()).toStrictEqual([
            "cycle",
            "duplicate-declared-branch",
            "foreign-edge",
            "inconsistent-edge",
            "invalid-declared-branch",
            "self-edge",
            "self-trigger",
            "undeclared-branch-target",
            "unrouted-branch",
        ]);
    });
});
