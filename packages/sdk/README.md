# @badag/sdk

The Badag SDK entry point. It exposes one export — `createDAG` — and everything else lives in [`@badag/core`](../core/README.md): task factories, wiring, validation, and serialization.

```ts
import { task } from "@badag/core";
import { createDAG } from "@badag/sdk";

const extract = task("extract", { fn: () => "raw" });
const load = task("load", { fn: () => "stored" });

const dag = createDAG("etl").chain(extract, load);
```

## Install

```sh
bun add @badag/sdk @badag/core
```

`sdk` and `core` are ESM-only and ship declaration files. `createDAG(name)` preserves the literal DAG name in its return type, so the `chain()` checks from `@badag/core` apply unchanged.

## API

| Export | Kind | Summary |
| --- | --- | --- |
| `createDAG` | function | `createDAG(name)` returns a `DAG` from `@badag/core` |

Import `DAG`, `DAGTask`, task factories, enums, and the remaining types from `@badag/core`.

## License

MIT
