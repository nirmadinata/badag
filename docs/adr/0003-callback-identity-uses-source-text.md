# Callback identity uses source text

A callback task's behavior source is the callback's source text (`Function.prototype.toString()`), not a structural comparison of what it does. Two definitions with the same name and the same callback source share a task ID and are treated as a duplicate definition; two callbacks that differ only in captured values share source text and are therefore the same task, with the first registration's behavior installed. Source text was chosen because it is the only behavior signal that survives without executing the callback, comparing closures, or requiring the caller to declare an explicit identity key.

**Status**: accepted, with a known blind spot to revisit — see _Revisit triggers_ below.

## Example where this is a problem

A factory that captures the value it operates on produces one source text for every value:

```ts
const syncTable = (table: string) => () => table;

const dag = createDAG("warehouse")
    .chain(task("sync", { fn: syncTable("customers") }))
    .chain(task("sync", { fn: syncTable("orders") }));

dag.tasks.size; // 1
```

The intended graph is two independent tasks. What is built is one. Both callbacks stringify to `() => table`, so `syncTable("orders")` is recognized as a duplicate definition of `sync` and discarded. No error is raised, and the registered task runs `"customers"`; `"orders"` never runs anywhere. The cost of the blind spot is a silently missing task in the graph, not a visible failure — which is why the failure mode, not the mechanism, is what makes it worth revisiting.

The same applies to bound functions (`function () { [native code] }` for every receiver) and to any callback whose distinguishing input is captured rather than written into its text.

## Consequences

- Capture-only differences are invisible to identity. `makeFn("raw")` and `makeFn("clean")` collide, so the second definition is silently dropped rather than rejected.
- Bound functions all render as `function () { [native code] }` and therefore collide on the same name.
- Task IDs are build-local. Minification rewrites source text and changes every callback task's ID, so a task ID must not be persisted or compared across builds.
- Rejection is reserved for name and ID mismatches. Silent deduplication of differing closures is accepted rather than detected.
- `dag.tasks.size` is the only signal that a task went missing.

## Revisit triggers

Reopen this decision when any of these holds:

- The DB schema starts persisting task IDs (see the pending schema/SDK alignment). Build-local IDs and a persisted identifier cannot both be true.
- A scheduler is added that loads definitions from storage instead of source, since reloaded tasks have no source text.
- A user reports a task that never ran and the graph still typechecks — the symptom above.
- Detection becomes possible without an explicit key: a `WeakMap` from captured-value identity, an optional `identity` field on definitions, or hashing a caller-supplied `config` the SDK currently ignores.

## Considered options

- **Explicit identity key on the definition.** Requires every caller to invent a key, and moves duplicate detection out of the definition.
- **Execute the callback and compare results.** Side effects, nondeterminism, and async callbacks make it unusable.
- **Assign identity per registration.** Loses cross-DAG idempotence, which is what makes one definition reusable in several DAGs.
