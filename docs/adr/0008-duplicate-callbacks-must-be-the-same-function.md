# Duplicate callbacks must be the same function instance

A duplicate definition is reused only when its callable behavior is the same function reference. Two definitions in one DAG that share a name and task ID — same callback source text — but hold different callback instances are rejected at registration instead of silently deduplicated.

Source text cannot express captured values. A factory that returns `() => table` yields one source string for every `table`, so source-derived identity cannot tell `syncTable("customers")` from `syncTable("orders")`. Treating the second definition as a duplicate discards it; the graph typechecks and builds while one unit of work is missing. Silent loss is the failure worth removing, so the SDK now stops at registration.

Two same-name tasks cannot coexist: a DAG indexes registered tasks by name, and a task name is unique within its DAG. "Produce two tasks" was therefore never reachable for the reported shape. "Fail loudly" is the only acceptance the data model can honor, and it is chosen over a new name-scoped identity.

The check is scoped to callback kinds (`task`, `sensor`, `branch`, `short-circuit`), where a source string can hide a closure. Declarative kinds (`delay`, `trigger`) carry every behavior-defining value in their behavior source, so equal sources are equal behavior and still deduplicate. Metadata remains excluded: a duplicate definition still reuses the first registration's metadata, and there is no user-supplied identity escape hatch.

## Consequences

- Reusing one definition object, or reusing one callback reference across definitions, still registers idempotently, including across DAGs. This preserves the cross-DAG reuse ADR 0001 relies on.
- Separate inline callbacks that happen to have identical source text are no longer interchangeable duplicates. `task("x", { fn: (ctx) => ctx.name })` written twice now throws; hoist the callback or reuse the definition. This false positive is the cost of never silently dropping a closure.
- Bound functions are rejected for the same reason: every bound function has `function () { [native code] }` as its source but a distinct identity.
- To run two capture-only-different behaviors, the names must differ (`sync-customers`, `sync-orders`). The name remains the only unique key in a DAG.
- Task IDs are unchanged: still the 128-bit FNV-1a hash of the name and behavior source. The new check reads the callback reference alongside that hash and does not persist or serialize it.

## Considered options

- **Explicit identity key on the definition.** It changes the task ID, but the same-name constraint still rejects the pair as a task name collision. It adds caller ceremony without making two same-name tasks possible, so it does not solve the acceptance on its own.
- **Detect differences through metadata.** Metadata is explicitly non-behavioral (ADR 0001); two definitions with equal behavior and different config are intended duplicates, so metadata cannot signal a different closure.
- **Structural comparison or execution.** ADR 0003 already rejected these: execution has side effects and nondeterminism, and closures cannot be compared portably.
- **Assign identity per registration.** The capture-only pair would get different IDs, then collide by name anyway, and cross-DAG idempotence would be lost.
- **Keep silent deduplication and document it.** Rejected: a missing task that typechecks is the exact failure being removed.
