# @badag/sdk

An Airflow-inspired DAG builder for TypeScript. Declare tasks, wire dependencies, then read back a topological order or poll which tasks are ready to run.

- ESM-only, zero runtime dependencies.
- Every edge inserted through the public methods is validated, so a `DAG` cannot become cyclic or cross DAG boundaries.
- Task names stay literal types; graph links are `ReadonlySet`, so they cannot be mutated by accident.

## Install

```sh
# bun
bun add @badag/sdk

# npm
npm install @badag/sdk

# pnpm
pnpm add @badag/sdk

# yarn
yarn add @badag/sdk
```

The package ships ESM only (`dist/index.mjs`), so use `import` rather than `require`. It has no runtime dependencies, and the published bundle is a single self-contained module that bundles cleanly for Cloudflare Workers.

## Import

```ts
import {
    branch,
    createDAG,
    crossDownstream,
    delay,
    sensor,
    shortCircuit,
    task,
    trigger,
    TASK_KIND_ENUM,
    TRIGGER_RULE_ENUM,
} from "@badag/sdk";
```

Types come from the same entry point:

```ts
import type {
    AnyTaskDefinition,
    BranchTaskDefinition,
    CreateTask,
    DAGJson,
    DAGTask,
    DelayTaskDefinition,
    SensorTaskDefinition,
    ShortCircuitTaskDefinition,
    TaskConfig,
    TaskContext,
    TaskFn,
    TaskJson,
    TaskKind,
    TaskLike,
    TaskOrTasks,
    TaskParamInput,
    TaskParamOutput,
    RegisteredTaskDefinition,
    TriggerRule,
    TriggerTaskDefinition,
} from "@badag/sdk";
// or inline, mixing values and types:
import { createDAG, type DAGTask, sensor, task } from "@badag/sdk";
```

## Quick start

The example below builds this graph:

```mermaid
graph LR
    A[A] --> D[D]
    A --> B[B]
    B --> E[E]
    B --> C[C]
    B --> G[G]
    D --> E
    C --> G
    E --> F[F]
    G --> F
```

```ts
import { createDAG, task, TASK_KIND_ENUM } from "@badag/sdk";

const a = task("A", {
    fn: async (ctx) => `${ctx.name}: extracted`,
});
const b = task("B", {
    fn: async (ctx) => `${ctx.name}: normalized`,
});
const c = task("C", {
    fn: async (ctx) => `${ctx.name}: aggregated`,
});
const d = task("D", { fn: async (ctx) => `${ctx.name}: joined` });
const e = task("E", { fn: async (ctx) => `${ctx.name}: scored` });
const f = task("F", {
    fn: async (ctx) => `${ctx.name}: published`,
});
const g = task("G", { fn: async (ctx) => `${ctx.name}: archived` });

const dag = createDAG("example")
    .chain(a, [d, b])
    .chain(d, e)
    .chain(b, [e, c, g])
    .chain(c, g)
    .chain(e, f)
    .chain(g, f);

for (const registered of dag.topologicalSort()) {
    if (registered.definition.kind === TASK_KIND_ENUM.Task) {
        console.log(
            registered.name,
            await registered.definition.fn({
                id: registered.id,
                name: registered.name,
            })
        );
    }
}
```

`A` runs first and `F` last; every other task waits for its upstream tasks. The array from `topologicalSort()` for this graph is `["A", "D", "B", "E", "C", "G", "F"]`.

## Declaring tasks

Regular task definitions come from `task()`; every task factory produces a definition that `chain()` registers in the DAG as it links wiring sets:

```ts
import { createDAG, task } from "@badag/sdk";

const extract = task("extract", {
    fn: () => fetch("https://example.com/data").then((res) => res.text()),
    description: "Fetch the source dataset",
    config: { timeout_ms: 30_000 },
});
const load = task("load", { fn: () => "stored" });

const dag = createDAG("etl").chain(extract, load);
```

Every task callback receives its task context as the first argument. The context contains the registered task's ID and its literal name:

```ts
import { createDAG, task, TASK_KIND_ENUM } from "@badag/sdk";

const report = task("report", {
    fn: (ctx) => `${ctx.id}:${ctx.name.toUpperCase()}`,
});

const dag = createDAG("etl").chain(report);
const reportTask = dag.getTask("report");

if (reportTask?.definition.kind === TASK_KIND_ENUM.Task) {
    await reportTask.definition.fn({
        id: reportTask.id,
        name: reportTask.definition.name,
    }); // "<task-id>:REPORT"
}
```

A task definition has no ID; the ID exists once the definition is registered as a `DAGTask`.

- `chain()` registers every definition it encounters before linking. Definitions already registered in the DAG are reused, so repeated calls are idempotent; the first registration's metadata is kept and a duplicate's metadata is discarded. Invalid duplicates and cycles are rejected at compile time when the returned DAG is kept.
- Every batch is transactional: a task name collision, duplicate task ID, self-edge, cross-DAG edge, or cycle leaves both the task registry and the edges unchanged.
- A single wiring set registers without adding edges, which is how isolated tasks are declared: `dag.chain([extract, load])`.
- `addDependency()`, `addDependencies()`, `setUpstream()`, `setDownstream()`, and `dependsOn()` also register definitions on first use.
- The first argument is the task name. It is trimmed, must be unique inside the DAG, and is preserved as a literal type: `"  extract  "` becomes `"extract"`. Words may be joined with `-` or `_`; other separators are rejected.
- A regular task's `fn`, a sensor's `predicate`, a branch's `choose`, and a short-circuit's `condition` receive `{ id, name }` as their first argument. The DAG never calls them; `id` is assigned when the definition is registered.
- `triggerRule` defaults to `all_success`; the SDK stores it for the scheduler and does not evaluate it.
- `description` is an optional human-readable string stored verbatim on the definition and registered task.
- `config` is stored verbatim on the registered task; the SDK does not interpret it.

### Trigger rules

`triggerRule` is available on the definition and on the registered task. It records when the scheduler may run the task, but the SDK does not evaluate it yet. The exported `TRIGGER_RULE_ENUM` provides the values as an enum-like object.

| Rule | Meaning |
| --- | --- |
| `all_success` | All upstream tasks succeed. The default. |
| `all_done` | All upstream tasks reach a terminal state, regardless of outcome. |
| `one_success` | At least one upstream task succeeds; the task may run before the others finish. |
| `one_failed` | At least one upstream task fails; the task may run before the others finish. |
| `none_failed` | All upstream tasks finish with no failures; skipped upstreams are allowed. |
| `none_failed_min_one_success` | All upstream tasks finish, none fail, and at least one succeeds. |
| `all_skipped` | All upstream tasks are skipped. |

```ts
import { task, TRIGGER_RULE_ENUM } from "@badag/sdk";

const report = task("report", {
    fn: () => "done",
    triggerRule: TRIGGER_RULE_ENUM.AllDone,
});

report.triggerRule; // "all_done"
```

### Reusing a definition

`task()` builds a regular task definition outside any DAG. Every factory trims and validates the name there; a task ID is assigned only when the definition is registered as a `DAGTask`. The ID is a synchronous 128-bit FNV-1a hash over the task name and the definition's behavior source: a regular task's `fn` source, a sensor's `predicate` source, a branch's `choose` source, a short-circuit's `condition` source, a delay's `durationMs`, or a trigger's target DAG and wait flag. The hash uses only standard platform APIs (`TextEncoder` and `BigInt`), so it behaves identically in Node, Bun, browsers, and Cloudflare Workers. Description, config, trigger rule, and sensor polling interval are not hashed. Callback kinds hash the callback's source text, so a task ID is stable within one build but not across builds: minification rewrites the source and therefore the ID. Treat task IDs as build-local. Register the definition wherever you need it — each `DAG` tracks its own names and task IDs:

```ts
import { task } from "@badag/sdk";

const nightly = task("cleanup", { fn: () => removeStaleRows() });

const etl = createDAG("etl").chain(nightly);
const audit = createDAG("audit").chain(nightly);
```

#### Callback identity ignores captured values

Source text records what a callback is written as, not what it closes over. A factory that captures a value produces the same source text for every value, so two tasks with the same name and that factory's shape are the same task — the second definition is silently dropped, not rejected:

```ts
import { createDAG, task } from "@badag/sdk";

const syncTable = (table: string) => () => `syncing ${table}`;

const dag = createDAG("warehouse")
    .chain(task("sync", { fn: syncTable("customers") }))
    .chain(task("sync", { fn: syncTable("orders") }));

dag.tasks.size; // 1 — the "orders" definition was treated as a duplicate
// The registered task runs "syncing customers", not "syncing orders".
```

Both `syncTable("customers")` and `syncTable("orders")` stringify to `() => \`syncing ${table}\``, so they share a task ID and the first registration wins. This is silent: no error, no warning, and `dag.tasks.size` is the only visible signal.

Two explicit workarounds:

```ts
import { createDAG, task } from "@badag/sdk";

const syncTable = (table: string) => () => `syncing ${table}`;

// 1. Put the captured value in the name, so the names differ.
const dag = createDAG("warehouse")
    .chain(task("sync-customers", { fn: syncTable("customers") }))
    .chain(task("sync-orders", { fn: syncTable("orders") }));

dag.tasks.size; // 2 — distinct names, distinct tasks

// 2. Write the value into the callback text, so the behavior sources differ.
const other = createDAG("warehouse-two")
    .chain(task("sync", { fn: () => "syncing customers" }))
    .chain(task("sync", { fn: () => "syncing orders" }));
// throws: Task "sync" already exists in DAG "warehouse-two"
```

Workaround 1 yields two tasks. Workaround 2 makes the IDs differ but leaves the names identical, so the second registration is rejected as a task name collision — an error instead of a silent drop, but still not two tasks in one DAG. Combining both is the usual fix: distinct names _and_ distinct behavior inline.

The same blindness applies to bound functions, which all stringify to `function () { [native code] }`, and to any callback whose distinguishing input is captured rather than written inline. See [ADR 0003](../../docs/adr/0003-callback-identity-uses-source-text.md) for why identity is source-based and what would have to change to detect this.

## Task kinds

Every factory returns a task definition with a common shape: `kind`, `name`, and optional `description`, `config`, and `triggerRule`. Behavior fields are task-specific: a regular task has `fn`, a sensor has `predicate`, a delay has `durationMs`, a branch has `choose`, a short-circuit has `condition`, and a trigger has `dagName`/`waitForCompletion`. The registered `DAGTask` exposes `kind` and the original `definition`; there is no universal task callback.

```ts
import {
    branch,
    delay,
    sensor,
    shortCircuit,
    task,
    trigger,
    TASK_KIND_ENUM,
    TRIGGER_RULE_ENUM,
} from "@badag/sdk";

const extract = task("extract", { fn: () => "raw" });

const ready = sensor("ready", {
    predicate: async () => bucketHasData(),
    pokeIntervalMs: 5000,
});

const settle = delay("settle", { durationMs: 30_000 });

const route = branch("route", {
    choose: (ctx) => (ctx.name === "route" ? ["us", "eu"] : "us"),
});

const gate = shortCircuit("gate", {
    condition: async () => (await hasData()) === false,
});

const start = trigger("start-child", {
    dagName: "child",
    waitForCompletion: true,
});
```

Use `TASK_KIND_ENUM` wherever a kind is compared or stored. It exposes `Task`, `Sensor`, `Delay`, `Branch`, `ShortCircuit`, and `Trigger`.

| Factory | `kind` | Kind-specific fields | Produced by default |
| --- | --- | --- | --- |
| `task(name, { fn })` | `TASK_KIND_ENUM.Task` | `fn` | `unknown` |
| `sensor(name, { predicate, pokeIntervalMs? })` | `TASK_KIND_ENUM.Sensor` | `predicate`, optional `pokeIntervalMs` | `boolean` |
| `delay(name, { durationMs })` | `TASK_KIND_ENUM.Delay` | `durationMs` | none |
| `branch(name, { branches?, choose })` | `TASK_KIND_ENUM.Branch` | `branches`, `choose` | the chosen branch names; declared `branches` constrain the next wiring step |
| `shortCircuit(name, { condition })` | `TASK_KIND_ENUM.ShortCircuit` | `condition` | `boolean` |
| `trigger(name, { dagName, waitForCompletion? })` | `TASK_KIND_ENUM.Trigger` | `dagName`, `waitForCompletion` | none |

All kinds accept the common metadata as well:

```ts
const ready = sensor("ready", {
    predicate: () => true,
    description: "Wait for the source bucket",
    config: { timeout_ms: 60_000 },
    triggerRule: TRIGGER_RULE_ENUM.AllDone,
});
```

Factories validate kind-specific values immediately: a sensor interval must be positive, a delay duration must be non-negative, and a trigger's target DAG name must not be blank.

### Task inputs and outputs

Every task kind accepts optional `input` and `output` Standard Schemas. Any library implementing [Standard Schema](https://standardschema.dev) works directly — Valibot, Zod, and ArkType are all verified in the test suite.

`input` types `ctx.payload`. `output` constrains what the callback may return.

```ts
import { type } from "arktype";
import * as v from "valibot";
import { z } from "zod";

const syncOrders = task("sync-orders", {
    input: v.object({ warehouseId: v.string(), rows: v.number() }),
    output: v.pipe(v.number(), v.minValue(0)),
    fn: (ctx) => ctx.payload.rows, // `rows` is a number
});

// Same task, other libraries: the schema's inferred type drives `ctx.payload`.
task("zod-input", {
    input: z.object({ rows: z.number() }),
    fn: (ctx) => ctx.payload.rows * 2,
});
task("ark-input", {
    input: type({ rows: "number>0" }),
    fn: (ctx) => ctx.payload.rows * 2,
});
```

Without an `input` schema, `ctx.payload` is `undefined`. Without an `output` schema, the result is `unknown`.

Schemas are declared, not applied: the SDK stores them and does not validate `ctx.payload` or the returned value. A scheduler that wants validated values calls `schema["~standard"].validate(...)` itself. Because the protocol is uniform, the same call site works for every library — the result carries `value` on success and `issues` on failure, and may be a promise when the schema validates asynchronously.

Kinds with a fixed result carry a default `output` schema describing it, so the produced value is known without writing one. The default is a type-level description only: no schema object is created, so `"output" in definition` stays `false` and `toJSON()` is unaffected.

| Kind                       | Default `output`                                |
| -------------------------- | ----------------------------------------------- |
| `sensor`                   | `boolean` — whether the predicate became true   |
| `shortCircuit`             | `boolean` — whether downstream tasks should run |
| `branch`                   | the `branches` entries, chosen or not           |
| `task`, `delay`, `trigger` | none                                            |

Read a produced value back with `TaskProducedOf<typeof definition.output>`. It accepts the optional property directly, so no `NonNullable` is needed:

```ts
const ready = sensor("ready", { predicate: () => true });

type ReadyResult = TaskProducedOf<typeof ready.output>; // boolean
```

`branch` infers its names from the `branches` tuple, which also constrains what `choose` may return:

```ts
const route = branch("route", {
    branches: ["us", "eu"], // inferred as the literal tuple
    choose: () => "us", // only "us" | "eu" are accepted
});
```

Schemas are metadata: declaring one does not change the task ID, and schemas are never serialized by `toJSON()`.

The SDK stores and serializes these task kinds, but it does not execute, poll, wait, or prune the graph. `pokeIntervalMs` and `durationMs` are declarative fields for a scheduler. A scheduler should use `DAGTask.kind`, `DAGTask.definition`, and the kind-specific callback or fields — for example, to poll a sensor at its interval, honor a delay, run only the branches named by a branch task, skip downstream work after a false short-circuit condition, or start the DAG named by a trigger definition.

```ts
const dag = createDAG("kinds").chain(
    extract,
    ready,
    settle,
    route,
    gate,
    start
);

for (const registered of dag.topologicalSort()) {
    console.log(registered.kind);
}

dag.toJSON().tasks; // includes kind and serializable kind-specific fields
```

### Task kind examples

Each factory keeps its kind-specific fields on the definition:

#### Regular task

```ts
const extract = task("extract", {
    fn: async (ctx) => {
        const response = await fetch("https://example.com/data");

        return { id: ctx.id, body: await response.text() };
    },
    description: "Fetch the source dataset",
    config: { retries: 3 },
});
```

#### Sensor

```ts
const fileReady = sensor("file-ready", {
    predicate: async (ctx) => {
        const response = await fetch(`https://example.com/status/${ctx.name}`);

        return response.ok;
    },
    pokeIntervalMs: 2000,
});

fileReady.kind; // TASK_KIND_ENUM.Sensor
fileReady.pokeIntervalMs; // 2000
```

The interval is optional. Without it, a scheduler chooses its own polling cadence:

```ts
const checkOnce = sensor("check-once", {
    predicate: () => true,
});
```

A scheduler calls `fileReady.predicate(ctx)` and repeats the call according to `pokeIntervalMs`. The SDK itself never evaluates the predicate.

#### Delay

```ts
const cooldown = delay("cooldown", { durationMs: 60_000 });

cooldown.kind; // TASK_KIND_ENUM.Delay
cooldown.durationMs; // 60_000
```

A zero duration is valid:

```ts
const immediate = delay("immediate", { durationMs: 0 });
```

A scheduler reads `cooldown.durationMs` and waits. The definition itself has no callback.

#### Branch

A branch can choose one branch:

```ts
const retryPath = branch("retry-path", {
    choose: () => "retry" as const,
});

await retryPath.choose({ id: "retry-path-id", name: "retry-path" }); // "retry"
```

or several branches:

```ts
const byRegion = branch("by-region", {
    choose: (ctx) =>
        ctx.name === "by-region" ? (["us", "eu"] as const) : "us",
});

await byRegion.choose({ id: "by-region-id", name: "by-region" }); // ["us", "eu"]
```

Declare `branches` as well to make the names a wiring contract:

```ts
const route = branch("route", {
    branches: ["us", "eu"],
    choose: (ctx) => (ctx.name === "route" ? ["us", "eu"] : "us"),
});

const dag = createDAG("regions").chain(route, [
    task("us", { fn: () => "us" }),
    task("eu", { fn: () => "eu" }),
]);
```

With `branches` declared, the wiring step directly after the branch task must name exactly those branches: routing to an undeclared task, or declaring a branch the step does not route to, is rejected at compile time and at runtime. A branch without `branches` stays unchecked, and only the branch's own downstream step is constrained — what those tasks require next is not.

A scheduler uses the returned name(s) to decide which downstream tasks to run.

#### Short-circuit

```ts
const skipIfEmpty = shortCircuit("skip-if-empty", {
    condition: async () => (await countRows()) === 0,
});

await skipIfEmpty.condition({ id: "skip-id", name: "skip-if-empty" }); // true or false
```

When the condition tells the scheduler to stop, downstream tasks can be skipped without running them.

#### Trigger

Trigger another DAG without waiting:

```ts
const backup = trigger("backup", {
    dagName: "backup-dag",
});

backup.dagName; // "backup-dag"
backup.waitForCompletion; // false
```

Trigger and wait for completion:

```ts
const waitForBackup = trigger("wait-for-backup", {
    dagName: "backup-dag",
    waitForCompletion: true,
});

waitForBackup.waitForCompletion; // true
```

A scheduler reads these fields, starts the target DAG, and waits when requested.

#### Inspecting a registered kind

```ts
const registered = dag.getTask("file-ready");

if (registered?.definition.kind === TASK_KIND_ENUM.Sensor) {
    registered.definition.kind; // TASK_KIND_ENUM.Sensor
    registered.definition.pokeIntervalMs; // number | undefined
}
```

### Lookup

```ts
dag.getTask("extract"); // DAGTask<"extract"> | undefined
dag.tasks; // ReadonlyMap<string, DAGTask>, keyed by name
```

## Wiring dependencies

An edge points from an upstream task to a downstream task. With `a` and `b` as registered `DAGTask` handles, all of these add `a -> b`:

```ts
a.setDownstream(b);
b.setUpstream(a);
b.dependsOn(a); // alias for setUpstream()
dag.addDependency(a, b);
dag.addDependencies([a, b], [c, d]); // a -> c, a -> d, b -> c, b -> d
```

Handles come from `dag.getTask()` or from execution helpers such as `topologicalSort()` and `getReadyTasks()`. Definitions work anywhere a handle does; edge methods register them on first use.

Wiring sets link every member of one set to every member of the next. `chain()` registers definitions before linking; `crossDownstream()` takes handles only:

```ts
dag.chain(a, [b, c], d); // a -> b, a -> c, b -> d, c -> d
crossDownstream([a, b], [c, d]); // a -> c, a -> d, b -> c, b -> d
```

`chain()` returns the DAG, so calls compose. Each wiring set is normalized once, definitions are validated and registered before any edge is added, and already-linked edges are skipped, so repeated calls are idempotent. Every batch is all-or-nothing: if any edge is rejected, the call adds neither tasks nor edges. `crossDownstream()` is the free-function form for full bipartite linking and delegates to `addDependencies()`.

### Chaining patterns

Pass each task or wiring set as a separate argument. Multiple plain tasks form a linear chain in one call:

```ts
const extract = task("extract", { fn: () => "raw" });
const transform = task("transform", { fn: () => "clean" });
const load = task("load", { fn: () => "stored" });

const dag = createDAG("etl").chain(extract, transform, load);
// extract -> transform -> load
```

An array between plain tasks fans out to the array and fans in from it:

```ts
const extract = task("extract", { fn: () => "raw" });
const cleanA = task("cleanA", { fn: () => "cleanA" });
const cleanB = task("cleanB", { fn: () => "cleanB" });
const join = task("join", { fn: () => "joined" });
const validate = task("validate", { fn: () => "valid" });
const publish = task("publish", { fn: () => "published" });

const dag = createDAG("etl").chain(
    extract,
    [cleanA, cleanB],
    join,
    validate,
    publish
);
// extract -> cleanA, extract -> cleanB
// cleanA -> join, cleanB -> join
// join -> validate -> publish
```

A handle repeated inside one wiring set adds only one edge. An empty wiring set is a no-op, so it leaves the sets on either side disconnected:

```ts
createDAG("etl").chain(extract, [], publish); // no extract -> publish edge
```

Separate `chain()` calls are independent: each call adds only the edges inside that call, and no edge is added between calls.

```ts
createDAG("etl").chain(a, b).chain(c, d);
// a -> b and c -> d; no b -> c edge
```

To build one continuous four-task chain, pass all tasks to a single call or share boundary tasks between calls:

```ts
createDAG("etl").chain(a, b, c, d);
createDAG("etl").chain(a, b).chain(b, c).chain(c, d);
// both: a -> b -> c -> d
```

Wiring set boundaries do not weaken validation: self edges, cycles across wiring sets, invalid duplicate definitions, and handles from another DAG are rejected.

### Bitshift notation

`dag.parse` wires tasks with Airflow's `>>`/`<<` notation, written as a tagged template. `>>` means "then" and `<<` means "before"; operators evaluate left to right, and each result becomes the left-hand side of the next:

```ts
const a = task("a", { fn: () => "a" });
const b = task("b", { fn: () => "b" });
const c = task("c", { fn: () => "c" });

const dag = createDAG("etl").parse`${a} >> ${b} >> ${c}`; // a -> b -> c
```

A `DAGTask` handle or a wiring set is a valid operand, so `>>` and `<<` compose exactly like Airflow's `set_downstream`/`set_upstream`:

```ts
createDAG("etl").parse`${a} >> ${b} << ${c}`; // a -> b, c -> b
createDAG("etl").parse`${[a, c]} >> ${b}`; // the same graph
createDAG("etl").parse`${a} >> ${[b, c]} >> ${d}`; // fan out, then fan in
```

An expression with one operand registers the task without wiring it, matching `dag.chain(task)`:

```ts
createDAG("etl").parse`${extract}`; // registers "extract", adds no edge
```

One expression per call. A newline inside the template is rejected rather than treated as a statement separator, so a second expression is a second call:

```ts
createDAG("etl").parse`${extract} >> ${clean}`.parse`${clean} >> ${load}`;
```

`parse()` accepts the same operands as every other wiring path: a handle from this DAG, or a definition that is registered on first use. It is transactional like `chain()` — a rejected task, edge, or notation is rolled back, leaving neither tasks nor edges behind. Already-linked edges are skipped, so repeating an expression is idempotent.

Text outside the operands is validated: a leading or trailing fragment, two adjacent operands, an empty operand list, a nested list, and an empty list are all errors. Whitespace around an operator is allowed, so `${a}>>${b}` and `${a}   >>   ${b}` are both accepted.

`parse()` registers its operands in the DAG's type, exactly as `chain()` does: the returned DAG carries every parsed definition's name and signature, so a later `chain()` or `parse()` call that reuses a name with a different signature is rejected at compile time.

```ts
const extract = task("extract", { fn: () => "raw" });
const dag = createDAG("etl").parse`${extract}`;

dag.chain(task("extract", { fn: () => 1 })); // error: task "extract" already exists in DAG "etl"
```

Edges are not part of that state. TypeScript infers the interpolated operands as tasks — a string, a number, or a nested list fails to typecheck — but it does not infer the literal `>>`/`<<` segments, so the DAG cannot see the operator sequence at compile time. Cycles, self edges, cross-DAG handles, and branch routing are therefore checked when `parse()` runs, not when the file typechecks. Use `chain()` when a compile-time cycle check matters. See [ADR 0006](../../docs/adr/0006-bitshift-notation-is-runtime-validated.md).

### Compile-time chain checks

`DAG` carries the definitions and edges added by `chain()` in its type, so invalid chains fail to typecheck:

```ts
const a = task("a", { fn: () => "a" });
const b = task("b", { fn: () => "b" });
const c = task("c", { fn: () => "c" });

const dag = createDAG("etl").chain(a, b, c);

dag.chain(c, a); // error: dependency "c" -> "a" creates a cycle
dag.chain(b, b); // error: task "b" cannot depend on itself

const duplicate = task("a", { fn: () => 1 });
dag.chain(duplicate); // error: task "a" already exists in DAG "etl"
```

- The type-level duplicate-definition check compares task names and inferred function signatures. Re-passing the same definition is allowed because runtime registration is idempotent; a same-name definition with a different function type is rejected.
- Adjacent wiring sets that share a task are rejected as self-edges.
- A branch task with a declared `branches` set must be followed by a wiring set naming exactly those branches; the same rule is enforced at runtime for every edge entry point.
- Cycles are found by walking the edges tracked in the DAG type.
- Static checks run for `chain()` calls with up to 40 positional wiring sets. Larger calls compile but are runtime-checked only, and their definitions and edges are not added to the DAG type state.
- The checks follow the value returned by `chain()`. If the result is discarded (`dag.chain(a, b);`), later calls are runtime-checked only. `addDependency()`, `addDependencies()`, `setUpstream()`, `setDownstream()`, and `crossDownstream()` are likewise runtime-checked.
- Generic helpers that widen task names or DAG state to `string` skip the static checks and rely on runtime validation.
- Handles from `getTask()`, `topologicalSort()`, and `getReadyTasks()` carry the erased `AnyTaskDefinition`, so they add edges but no signatures; type-level duplicate detection compares regular `fn` signatures, while runtime remains authoritative for handle-only wiring.
- Regular definitions with the same name and inferred `fn` type but different `fn` source cannot be distinguished statically; non-regular definitions are opaque to type-level signature checks. Runtime still rejects collisions.

### Validating a graph

`validate()` returns every problem in the graph as a list, without throwing. The wiring methods reject malformed graphs as they run, so a DAG built only through them validates clean; the method is for graphs that reach a checkpoint later — a snapshot, a graph restored from storage, a half-built DAG before execution — and for the states wiring cannot see at the time of a call.

```ts
const route = branch("route", { branches: ["us", "eu"], choose: () => "us" });

const dag = createDAG("daily").chain(
    route,
    task("extract", { fn: () => "raw" })
);

dag.validate();
// [
//   { code: "unrouted-branch", subjects: ["route", "us"], message: 'Branch "route" must route to declared branch "us"' },
//   { code: "unrouted-branch", subjects: ["route", "eu"], message: 'Branch "route" must route to declared branch "eu"' },
// ]
```

A branch task declares the branches a scheduler may follow, so registering one alone leaves it temporarily unrouted; pairing it with the tasks that carry those names clears the finding. Checking `validate()` before execution catches exactly that.

Every finding has a `code`, the `subjects` involved, and a `message` in the same wording the wiring methods throw. `subjects` names both endpoints for an edge, the traversal path (closing task repeated) for a cycle, and `[branch, declaredName]` for a branch finding. Branch and trigger findings name a declared branch or a DAG, not a task, so the field is called `subjects` rather than `tasks`. Findings are ordered edges, cycles, branch routing, then trigger findings.

| Code | Meaning |
| --- | --- |
| `cycle` | An edge joins a task back to one of its own ancestors |
| `self-edge` | A task lists itself as an upstream or downstream task |
| `foreign-edge` | An edge endpoint is not registered in this DAG |
| `inconsistent-edge` | One side of an edge records a dependency the other side does not |
| `unrouted-branch` | A branch task declares a branch name it never routes to |
| `undeclared-branch-target` | A branch task routes to a task it never declared |
| `duplicate-declared-branch` | A branch task declares the same branch name more than once |
| `invalid-declared-branch` | A branch task declares a name that cannot be a task name |
| `self-trigger` | A trigger task starts the DAG that contains it |

`duplicate-declared-branch` and `invalid-declared-branch` are reachable through the factories: `branches: ["us", "us"]` and a declared name like `""` or `"united states"` are both accepted by `branch()`, and neither can be satisfied by wiring. A name that is invalid is reported as `invalid-declared-branch` rather than additionally as `unrouted-branch`, because no task could ever carry it.

An empty array means the graph is acyclic, internally consistent, and every branch routes exactly to its declared branches.

Reporting rules, each pinned by a test:

- A self edge yields `self-edge` only, never an additional `cycle`, whether it is recorded on one side or both.
- Each distinct cycle yields one finding, named by the path that closes it with the first task repeated. Cycles that share a task are separate findings.
- An edge yields at most one finding: the downstream side and the upstream side report disjoint conditions on the same edge.
- A mutual cross-DAG edge yields one finding per direction, so the two `tasks` lists differ.
- Foreign targets are reported but not traversed; their own edges belong to the DAG that owns them, so one graph's report never includes another's cycles.
- A branch finding is per branch name, so a repeated declared name yields one finding, and an invalid declared name is reported once as `invalid-declared-branch`.
- A trigger comparison trims both names, so `dagName: " daily "` inside DAG `"daily"` is still a self-trigger. Names that differ by case are distinct DAGs.
- `validate()` only reads the graph, so calling it never changes state.

Edge methods accept either a `DAGTask` handle or a definition; an unseen definition is registered in this DAG, then resolved by task ID. `addDependencies()` links every upstream task to every downstream task. `crossDownstream()` is the exception and takes handles only.

Read links through `task.upstream` and `task.downstream` (both `ReadonlySet<DAGTask>`), and change them only through the methods above so validation still runs. Every edge insertion rejects:

- tasks that belong to a different DAG,
- a task depending on itself,
- an edge that would create a cycle.

Failed batches are rolled back, so `topologicalSort()` is total for graphs built through the typed public methods.

## Running tasks

The SDK only describes the graph; your scheduler decides how tasks execute. Because behavior fields are task-specific, dispatch on `definition.kind`:

```ts
import { TASK_KIND_ENUM, type DAGTask } from "@badag/sdk";

async function runTask(task: DAGTask): Promise<void> {
    const ctx = { id: task.id, name: task.name };
    const { definition } = task;

    switch (definition.kind) {
        case TASK_KIND_ENUM.Task:
            await definition.fn(ctx);
            return;
        case TASK_KIND_ENUM.Sensor:
            if (!(await definition.predicate(ctx))) {
                throw new Error(`Sensor "${task.name}" is not ready`);
            }
            return;
        case TASK_KIND_ENUM.Delay:
            // scheduler.wait is provided by your runtime
            await scheduler.wait(definition.durationMs);
            return;
        case TASK_KIND_ENUM.Branch:
            await definition.choose(ctx); // route to the returned branches
            return;
        case TASK_KIND_ENUM.ShortCircuit:
            await definition.condition(ctx); // prune downstream work
            return;
        case TASK_KIND_ENUM.Trigger:
            // start definition.dagName; wait when definition.waitForCompletion
            return;
    }
}
```

Sequential:

```ts
for (const task of dag.topologicalSort()) {
    await runTask(task);
}
```

Parallel, polling readiness with the set of completed **task IDs**:

```ts
const completed = new Set<string>();

while (true) {
    const ready = dag.getReadyTasks(completed);

    if (ready.length === 0) {
        break;
    }

    await Promise.all(
        ready.map(async (task) => {
            await runTask(task);
            completed.add(task.id);
        })
    );
}
```

`getReadyTasks()` is pure: it returns tasks that are not in `completed` and whose upstream tasks are all in `completed`. It does not remember previous calls.

## Serialization

`dag.toJSON()` returns a `DAGJson` snapshot: the DAG name, every task in registration order, and each task's edges as **task names**. Each entry is a `TaskJson`.

```ts
import { createDAG, task } from "@badag/sdk";

const extract = task("extract", {
    fn: () => "raw",
    description: "Read source data",
});
const load = task("load", { fn: () => "stored" });

const dag = createDAG("etl").chain(extract, load);

dag.toJSON();
// {
//     name: "etl",
//     tasks: [
//         {
//             id: "…",
//             name: "extract",
//             kind: "task",
//             triggerRule: "all_success",
//             description: "Read source data",
//             upstream: [],
//             downstream: ["load"],
//         },
//         {
//             id: "…",
//             name: "load",
//             kind: "task",
//             triggerRule: "all_success",
//             upstream: ["extract"],
//             downstream: [],
//         },
//     ],
// }
```

- `id` is the registered task's task ID; `name` is unique within the DAG.
- `kind` is always included and identifies the task factory that created the definition.
- `triggerRule` is always included and defaults to `all_success`.
- Kind-specific serializable fields are included: sensor `pokeIntervalMs`, delay `durationMs`, and trigger `dagName` and `waitForCompletion`. Branch choosers, short-circuit conditions, and sensor predicates are functions and are omitted.
- `upstream` and `downstream` list task names, in the order the edges were inserted.
- `description` is included when the task has one.
- `config` is included when the task has one.
- Behavior callbacks (`fn`, `predicate`, `choose`, `condition`) are omitted, so the snapshot is an inspection format, not a round-trip format. Rebuild a runnable DAG with a task factory and `chain()`.

`JSON.stringify(dag)` calls `toJSON()` automatically:

```ts
const encoded = JSON.stringify(dag); // same shape as dag.toJSON()
```

Grouped chains serialize with edges listed by name in both directions:

```ts
const grouped = createDAG("etl").chain(
    task("extract", { fn: () => "raw" }),
    [task("cleanA", { fn: () => "a" }), task("cleanB", { fn: () => "b" })],
    task("join", { fn: () => "joined" })
);

grouped.toJSON().tasks.map(({ name, upstream, downstream }) => ({
    name,
    upstream,
    downstream,
}));
// [
//     { name: "extract", upstream: [], downstream: ["cleanA", "cleanB"] },
//     { name: "cleanA", upstream: ["extract"], downstream: ["join"] },
//     { name: "cleanB", upstream: ["extract"], downstream: ["join"] },
//     { name: "join", upstream: ["cleanA", "cleanB"], downstream: [] },
// ]
```

`config` keeps the same object the task stores, so it must be JSON-serializable for `JSON.stringify()` to succeed — `BigInt` or circular values throw during stringification, not during `toJSON()`.

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `createDAG` | function | `createDAG(name)` returns a `DAG`; keeps the literal name type, so `chain()` checks apply |
| `DAG` | class | `name`, `tasks`, `getTask()`, `addDependency()`, `addDependencies()`, `chain()`, `parse`, `validate()`, `topologicalSort()`, `getReadyTasks()`, `toJSON()` |
| `DAGTask` | type | Registered task handle; `id`, `name`, `kind`, `definition`, `description`, `config`, `triggerRule`, `upstream`, `downstream`, `setUpstream()`, `setDownstream()`, `dependsOn()`. Minted by `DAG`, not constructible by consumers |
| `task` | function | Creates a regular task definition from a name and `{ fn }` input |
| `sensor` | function | Creates a sensor definition storing a predicate and optional `pokeIntervalMs`; the SDK does not poll |
| `delay` | function | Creates a delay definition storing `durationMs`; the SDK does not wait |
| `branch` | function | Creates a branch definition whose `choose` callback returns a branch name or names |
| `shortCircuit` | function | Creates a short-circuit definition whose `condition` controls downstream execution |
| `trigger` | function | Creates a trigger definition targeting `dagName` and records whether to wait for completion |
| `crossDownstream` | function | Links every task of one list to every task of another |
| `TaskFn` | type | `(ctx: TaskContext<Name>) => unknown` — regular task callback signature |
| `TaskContext` | interface | `{ readonly id, readonly name }` passed as the first callback argument; `id` is the registered task ID |
| `TaskConfig` | interface | `timeout_ms` plus arbitrary keys, stored untouched |
| `TaskKind` | type | `TASK_KIND_ENUM` value union: `"task" \| "sensor" \| "delay" \| "branch" \| "short_circuit" \| "trigger"` |
| `TASK_KIND_ENUM` | object | Enum-like map of the supported task kinds |
| `TaskMetadata` | interface | `{ description?, config?, triggerRule? }` accepted by every factory |
| `TaskParamInput` | interface | `{ fn, description?, config?, triggerRule? }` — input to `task()` after the name |
| `TaskParamOutput` | type | A regular task definition: `TaskDefinitionBase` with `TASK_KIND_ENUM.Task` |
| `TaskDefinitionBase` | interface | Common definition fields: `kind`, `name`, and optional metadata |
| `SensorTaskDefinition` | interface | Sensor definition with `predicate` and optional `pokeIntervalMs` |
| `DelayTaskDefinition` | interface | Delay definition with `durationMs` |
| `BranchTaskDefinition` | interface | Branch definition with `choose` |
| `ShortCircuitTaskDefinition` | interface | Short-circuit definition with `condition` |
| `TriggerTaskDefinition` | interface | Trigger definition with `dagName` and `waitForCompletion` |
| `AnyTaskDefinition` | type | Union of every definition accepted by `DAG` |
| `RegisteredTaskDefinition` | type | The definition exposed by a registered `DAGTask`, with callbacks accepting the generic task name |
| `TriggerRule` | type | `all_success`, `all_done`, `one_success`, `one_failed`, `none_failed`, `none_failed_min_one_success`, `all_skipped` |
| `TRIGGER_RULE_ENUM` | object | Enum-like map of the supported trigger rules |
| `TaskLike` | type | A `DAGTask` or a task definition returned by a factory |
| `TaskOrTasks` | type | `TaskLike \| readonly TaskLike[]` |
| `WiringOperand` | type | `TaskLike \| readonly TaskLike[]` — one operand of a wiring expression |
| `DAGViolation` | interface | One `validate()` finding: `code`, `subjects`, `message` |
| `DAGViolationCode` | type | Value union of `DAG_VIOLATION_ENUM` |
| `DAG_VIOLATION_ENUM` | object | Enum-like map of the `validate()` finding codes |
| `TaskJson` | type | Discriminated union of serialized task kinds; includes `kind` and kind-specific serializable fields |
| `DAGJson` | interface | `{ name, tasks }` returned by `toJSON()` |
| `CreateTask` | type | Call signature of `task(name, input)` |
| `TaskSchema` | type | Standard Schema accepted by `input`/`output` |
| `TaskPayloadOf<S>` | type | Value `ctx.payload` carries for schema `S` |
| `TaskProducedOf<S>` | type | Value a task produces for schema `S` |

## Types

- Task callbacks receive `{ id, name }` first; `id` is assigned when the definition is registered, and factories trim surrounding whitespace and infer `ctx.name` as the resulting literal name.
- Task names contain letters or numbers, with words joined by a single `-` or `_`; internal spaces, other punctuation, leading/trailing separators, and repeated separators are rejected.
- Every factory keeps the relevant callback signature on the definition, including its context parameter and return type; zero-argument callbacks remain assignable when the context is unused.
- Factories add `triggerRule: "all_success"` when the input omits it; registered tasks expose the normalized value.
- `description`, `config`, and `triggerRule` are accepted by every factory and stored on the definition and registered task.
- `TaskFn` is the regular task callback, `(ctx: TaskContext<Name>) => unknown`; `PromiseLike` results are allowed and are not awaited by the SDK. Sensor, branch, and short-circuit callbacks use `MaybePromise` results.
- Sensor, branch, and short-circuit callbacks receive the task context. A scheduler calls a sensor's `predicate` and repeats it according to `pokeIntervalMs`; a branch's `choose` returns the branch name(s); a short-circuit's `condition` returns the gate result.
- `DAGTask` is exported as a type only; obtain handles from `DAG` methods rather than constructing them.
- `createDAG(name)` returns a `DAG<Name>` instance with the literal name preserved, so `chain()` checks apply exactly as they do for a directly constructed `DAG`; the constructor stays public.
- `DAGTask.kind` identifies the factory, and `DAGTask.definition` retains the original kind-specific definition, including callbacks that are not serialized.
- `getTask()`, `topologicalSort()`, `getReadyTasks()`, and `task.upstream` expose `DAGTask`. Narrow `task.definition.kind` to access the kind-specific behavior field and pass `{ id: task.id, name: task.name }` when invoking it.
- `DAG` carries internal type parameters for the definitions and edges added through `chain()`. Annotating a value as plain `DAG` intentionally opts out of the compile-time checks above.
- `parse` types each operand as a task or a flat list of tasks, so a string, a number, or a nested list fails to typecheck. It adds those definitions to the DAG's type state as signatures and declared branch sets, like `chain`, so duplicate definitions are caught at compile time; it adds no edges, because TypeScript cannot infer the literal `>>`/`<<` segments. Use `chain()` when compile-time cycle detection matters.
- `toJSON()` returns a fresh `DAGJson` snapshot with `kind`, kind-specific serializable fields, and edges keyed by task name; functions are removed.
- `validate()` returns a readonly `DAGViolation[]` and never throws; the codes are a closed set, so a scheduler can switch on `code` exhaustively.

## Errors

| Message | Raised by |
| --- | --- |
| `DAG name cannot be empty` | `createDAG(name)` |
| `Task name cannot be empty` | Any task factory after trimming |
| `Task name "<name>" must use letters or numbers separated by "-" or "_"` | Any task factory and DAG registration |
| `Task "<name>" already exists in DAG "<dag>"` | `chain()` and edge methods when registering a definition |
| `Task ID "<id>" already exists` | `chain()` and edge methods when task IDs collide |
| `pokeIntervalMs must be greater than 0` | `sensor()` |
| `durationMs must be greater than or equal to 0` | `delay()` |
| `Trigger DAG name cannot be empty` | `trigger()` |
| `Both tasks must belong to this DAG` | `addDependency()`, `addDependencies()`, and the wiring methods |
| `A task cannot depend on itself` | `addDependency()`, `addDependencies()`, and the wiring methods |
| `Branch "<branch>" cannot route to "<task>"; declared branches are "<name>", ...` | `chain()` and the edge methods when a declared branch set does not contain the task |
| `Branch "<branch>" cannot route to "<task>"; it declares no branches` | Same, for a branch declaring an empty `branches` set |
| `Branch "<branch>" must route to declared branch "<name>"` | Same, when a declared branch is left unrouted by that wiring step |
| `Dependency "<from>" -> "<to>" creates a cycle` | `addDependency()`, `addDependencies()`, and the wiring methods |
| `Wiring expression in DAG "<dag>" needs at least one task` | `parse` with no interpolated operands |
| `Unexpected "<text>" before the first task in DAG "<dag>"` | `parse` when the template starts with text |
| `Unexpected "<text>" after the last task in DAG "<dag>"` | `parse` when the template ends with text |
| `Unrecognized wiring syntax "<segment>" in DAG "<dag>"; expected ">>" or "<<" between tasks` | `parse` for a non-operator between two operands |
| `Wiring expression in DAG "<dag>" spans multiple lines; call parse once per expression` | `parse` when a segment contains a newline |
| `Wiring expression in DAG "<dag>" cannot nest task lists` | `parse` for an array inside an operand array |
| `Wiring expression in DAG "<dag>" cannot use an empty task list` | `parse` for `[]` as an operand |
| `Wiring expression in DAG "<dag>" expects tasks; received <type>` | `parse` for an operand that is not a task or definition |
| `DAG "<name>" contains a cycle` | `topologicalSort()` — defensive, unreachable via the public API |

## License

MIT
