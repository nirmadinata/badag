# @badag/sdk

The Badag SDK entry point. It exports `createDAG`, every task factory, the task kind enum, and the task authoring types. Wiring, validation, and serialization live in the internal [`@badag/core`](../core/README.md) package.

Inside this repository, core is imported from source and passed to `createDAG`. The SDK build bundles it, so `@badag/core` is not a runtime dependency of the published package.

```ts
import { createDAG, delay, task } from "@badag/sdk";

const extract = task("extract", { fn: () => "raw" });
const settle = delay("settle", { durationMs: 100 });
const load = task("load", { fn: () => "stored" });

const dag = createDAG("etl").chain(extract, settle, load);
```

## Install

```sh
bun add @badag/sdk
```

`sdk` is ESM-only and ships declaration files. `createDAG(name)` preserves the literal DAG name in its return type, so the `chain()` checks from `@badag/core` apply unchanged.

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `createDAG` | function | `createDAG(name)` returns a `DAG` |
| `task`, `delay`, `branch`, `sensor`, `shortCircuit`, `trigger` | functions | Build a task definition of any kind |
| `TASK_KIND_ENUM` | object | Supported task kind values |
| Task types | types | Task definitions, factory inputs/outputs, schemas, context, metadata, and trigger rules |

Task types cover every kind:

```ts
import type {
    BranchTaskDefinition,
    CreateTask,
    TaskContext,
    TaskDefinitionBase,
    TaskFn,
    TaskKind,
    TriggerRule,
} from "@badag/sdk";
```

## License

MIT
