# @badag/sdk

The Badag SDK entry point. It exposes one export — `createDAG` — and everything else lives in the internal [`@badag/core`](../core/README.md) package: task factories, wiring, validation, and serialization.

Inside this repository, core is imported from source and passed to `createDAG`. The SDK build bundles it, so `@badag/core` is not a runtime dependency of the published package.

```ts
import { task } from "@badag/core";
import { createDAG } from "@badag/sdk";

const extract = task("extract", { fn: () => "raw" });
const load = task("load", { fn: () => "stored" });

const dag = createDAG("etl").chain(extract, load);
```

## Install

```sh
bun add @badag/sdk
```

`sdk` is ESM-only and ships declaration files. `createDAG(name)` preserves the literal DAG name in its return type, so the `chain()` checks from `@badag/core` apply unchanged.

## API

| Export      | Kind     | Summary                           |
| ----------- | -------- | --------------------------------- |
| `createDAG` | function | `createDAG(name)` returns a `DAG` |

## License

MIT
