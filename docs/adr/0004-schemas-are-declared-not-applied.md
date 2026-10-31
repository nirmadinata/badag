# Schemas are declared, never applied

Task definitions accept `input` and `output` Standard Schemas, and the SDK never runs them. A schema types `ctx.payload` and constrains what a callback may return, but nothing validates either value at runtime. The SDK stores the schema object on the definition and passes it to a scheduler through `DAGTask.definition`; the scheduler decides whether, when, and how to validate. This was chosen because the SDK does not execute tasks, and validation is inseparable from execution: a payload is only known once whoever runs the task produces it.

## Consequences

- `ctx.payload` is typed but unverified. A scheduler that assumes the SDK validated a payload will hand a task malformed data.
- Validation may be asynchronous. Standard Schema's `validate` returns `Result | Promise<Result>`, so a validating scheduler must await it; the SDK's synchronous registration path could not.
- Schema transforms change the value. `z.coerce.number()` turns `"21"` into `21`, so a validating scheduler must pass the schema's _output_ to the task, not its input. Typing `ctx.payload` as `InferOutput` already reflects this, but the substitution is the scheduler's job.
- Schemas are excluded from identity and serialization. Declaring one does not change the task ID, and `toJSON()` omits schemas entirely, so a serialized DAG cannot reconstitute validation on its own.
- Kind-specific default output schemas (`sensor` → `boolean`, `branch` → its branch names) exist only at the type level. No schema object is created, so `"output" in definition` is `false` for those kinds.

## Considered options

- **Validate at registration.** Registration is synchronous and has no payload yet; only declarative kinds carry any value at that point.
- **Validate inside the factories.** Same problem, plus it would reject the `output` constraints of callback kinds whose return value does not exist until execution.
- **Wrap callbacks so the SDK validates `payload` and the result.** Makes the SDK the executor, which it deliberately is not, and forces every scheduler through the same async validation cost.

## Revisit triggers

- The SDK gains an executor, making runtime validation its own responsibility.
- A scheduler is built in-repo and needs a payload contract strong enough that validation must precede `ctx.payload` construction.
- A DAG is persisted and reloaded with the expectation that validation survives serialization.
