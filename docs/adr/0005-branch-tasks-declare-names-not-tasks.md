# Branch tasks name their branches instead of holding them

A branch task declares the branch names a scheduler may follow in a `branches` set of plain strings, and `DAG.chain()` plus every edge method enforce that the wiring step directly after the branch routes to exactly those names. The alternative — passing the intended downstream tasks as objects into `branches` — was rejected: it would let a task contain other tasks, invert identity (a parent's task ID would derive from its children), and erase child behavior from the hash, because `taskBehaviorSource()` serializes `branches` through `JSON.stringify`, which drops functions.

## Consequences

- Declaring `branches` is opt-in. A branch that omits it stays unconstrained, so existing call sites keep working and the check only applies where a contract was stated.
- The check is bidirectional. Routing to an undeclared task and declaring a branch the step never routes to are both rejected; the second catches a typo that would otherwise become dead configuration.
- Only the branch's own wiring step is constrained. `dag.chain(route, mid, us)` is legal: a branch decides what it routes to, not what those tasks require next.
- A fully routed branch set must be wired in one step. Splitting `["us", "eu"]` across two calls is rejected, because the completeness check is pairwise over a wiring step; repeated wiring of a step that is already complete is a no-op.
- Runtime is authoritative and covers all six edge entry points; the compile-time check lives only in `chain()`, since it is the only typed path. It shares the existing static limits: more than 40 wiring sets, a `string`-widened DAG annotation, or handles returned by `getTask()` opt out and fall back to runtime.

## Considered options

- **Tasks in `branches`.** Rejected on the identity and layering grounds above; it also creates an import cycle, since `branch()` runs before any DAG exists and can only ever see definitions, never the `DAGTask` handle that registration mints.
- **Validate nothing, document the convention.** Leaves the mismatch silent, which is the failure mode the feature exists to catch.
- **Require `branches` for every branch task.** Breaking for existing declarations, and a branch with genuinely dynamic targets has no fixed set to declare.
