# @badag/dashboard

The Badag web app: a TanStack Start (React 19) dashboard running on Cloudflare Workers, with D1 for DAG and run records, a Durable Object for orchestration, and a Workflow for task execution.

The overview and activity pages render static demo data from `src/features/dashboard/data.ts`, and every `/api/v1` domain handler returns `501`. The routes, schemas, and storage layout below are the seam the real data access plugs into.

## Requirements

- Bun `1.4.4` (the workspace package manager).
- Node.js `22.18+` on the `PATH` for the `cf` CLI.
- A Cloudflare account for `deploy`; local development needs no login.

## Local development

Install from the repository root so the workspace packages resolve:

```sh
bun install
```

Apply the main-database migration, then start the dev server:

```sh
cd apps/dashboard
bun db:migrate
bun dev
```

`bun dev` delegates to `vite dev` and serves <http://localhost:5173>. The dashboard overview is the root page; activity lives at `/activity`. No credentials or environment variables are required.

Run `bun db:clean-generate` only when the schema is unreleased, then `bun db:migrate` again.

## Scripts

| Script | What it does |
| --- | --- |
| `dev` | `cf dev` → Vite dev server on `localhost:5173` with local bindings |
| `build` | `cf build` → Build Output in `.cloudflare/output/` |
| `preview` | `vite preview` of an existing build |
| `deploy` | `cf deploy`, build and upload to Cloudflare |
| `typecheck` | `cf workers types` then `tsc` |
| `generate-routes` | Regenerate `src/routeTree.gen.ts` with `tsr` |
| `db:generate` | Generate Drizzle SQL for both databases into `migrations/` |
| `db:clean-generate` | Delete `migrations/` and regenerate both databases |
| `db:migrate` | Apply `migrations/main-db` to the local D1 database |
| `test:e2e` | Vitest + Playwright suite in `e2e/` |

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/routes/` | File-based TanStack Router routes: dashboard pages and the API catch-alls |
| `src/features/dashboard/` | Overview and activity components, hooks, and demo data |
| `src/integrations/db/` | D1 Drizzle client and the Durable Object migration runner |
| `src/integrations/hono/` | Public `/api/v1` app: OpenAPI routes and schemas |
| `src/integrations/exports/` | Durable Object and Workflow classes re-exported by the Worker entry |
| `src/integrations/tanstack-query/` | Query client context and SSR bridging |
| `src/lib/theme.ts` | Light/dark preference: storage, document class, and the pre-paint head script |
| `src/components/ui/` | shadcn (Base UI) primitives; configured in `components.json` |
| `src/server.ts` | Worker entry: TanStack Start handler plus the named exports |
| `cloudflare.config.ts` | Worker name, compatibility flags, bindings, and exports |
| `migrations/` | Drizzle-generated SQL for `main-db` (D1) and `orchestrator-db` (Durable Object SQLite) |

## Bindings

Declared in `cloudflare.config.ts`:

| Binding | Type | Use |
| --- | --- | --- |
| `MAIN_DB` | D1 | DAGs, tasks, edges, and runs |
| `LOADER` | Worker loader | Bundles tenant workflow code |
| `TASK_ORCHESTRATOR_DO` | Durable Object (`TaskOrchestratorDO`) | Orchestrator state in Durable Object SQLite |
| `DYNAMIC_WORKFLOW` | Workflow (`DynamicWorkflow`) | Per-run task execution |

`MAIN_DB` is bound to the placeholder id `00000000000000000000000000000000`, which keeps local development anonymous. Replace it with a real database id before deploying.

`TaskOrchestratorDO` migrates `migrations/orchestrator-db` inside the Durable Object constructor, so the orchestrator schema needs no separate apply step. The D1 schema is applied explicitly with `bun db:migrate` (`cf d1 migrations apply … --local --persist-to .cloudflare/state`).

Both schemas live in the internal `@badag/db-schema` package, so the migrations are generated from that source:

```sh
bun db:generate:main   # main-db → migrations/main-db
bun db:generate:do     # orchestrator-db → migrations/orchestrator-db
```

## Public API

Everything under `/api/v1` is served by the Hono app in `src/integrations/hono/`, mounted through the `src/routes/api/v1/$.ts` catch-all.

- `GET /api/v1/health` — liveness check returning `{ "status": "ok" }`.
- `GET /api/v1/docs` — Scalar reference UI; the OpenAPI 3.1 document is at `/api/v1/docs/json`.

| Area | Endpoints |
| --- | --- |
| DAGs | `GET`/`POST /dags`, `GET`/`PATCH`/`DELETE /dags/{dagId}` |
| Tasks and edges | `GET`/`POST /dags/{dagId}/tasks`, `GET`/`POST /dags/{dagId}/edges` |
| Runs | `GET`/`POST /dags/{dagId}/runs`, `GET /runs`, `GET /runs/{runId}`, `POST /runs/{runId}/cancel` |
| Task executions | `GET /runs/{runId}/tasks`, `GET /runs/{runId}/tasks/{taskExecutionId}` |
| Schedules | `GET /schedules`, `GET`/`PUT`/`DELETE /schedules/{scheduleId}` |

Every endpoint above is declared with a Zod response schema but currently answers `501 not_implemented`; `health` and the docs are the only working handlers. Request validation failures answer `422 invalid_request`. Errors share one shape:

```json
{ "code": "not_implemented", "message": "…" }
```

## End-to-end tests

```sh
bun run test:e2e
```

Vitest drives Playwright against a Vite dev server that `e2e/global-setup.ts` boots on `127.0.0.1:3100`; each run writes `reports/vitest-e2e-junit.xml`. The suite asserts that the overview renders at `/`, activity renders at `/activity`, and the public API health check responds without credentials.

## Deploy

1. Replace the placeholder D1 id in `cloudflare.config.ts` with the real database.
2. Apply the schema remotely: `cf d1 migrations apply <DATABASE_ID> --dir migrations/main-db`.
3. Run `bun deploy` (it builds first; add `--prebuilt` to reuse existing Build Output).

## Repository

Part of the [Badag](../../README.md) workspace. The DAG SDK it manages lives in [`packages/sdk`](../../packages/sdk/README.md) and [`packages/core`](../../packages/core/README.md).
