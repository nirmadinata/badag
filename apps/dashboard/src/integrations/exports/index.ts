// oxlint-disable no-unused-private-class-members no-this-before-super

// Durable Object and Workflow classes exported by the dashboard worker.
// Re-exported from the Worker entry (`src/server.ts`) so `@cloudflare/vite-plugin`
// emits them as named module exports; `cloudflare.config.ts` declares the same
// names under `exports`.

import type { schema } from "@badag/db-schema/orchestrator-db";
import {
    createDynamicWorkflowEntrypoint,
    wrapWorkflowBinding,
} from "@cloudflare/dynamic-workflows";
import { createWorker } from "@cloudflare/worker-bundler";
import { DurableObject } from "cloudflare:workers";
import type { WorkflowEntrypoint } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/durable-sqlite";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

import { migrateTaskOrchestratorDB } from "@/integrations/db/orchestrator";

export { DynamicWorkflowBinding } from "@cloudflare/dynamic-workflows";

const MIGRATED_KEY = "migrated";

interface TaskOrchestratorDoProps {
    placeholder: string;
}

export class TaskOrchestratorDO extends DurableObject<
    Env,
    TaskOrchestratorDoProps
> {
    // @ts-expect-error later
    #db: DrizzleSqliteDODatabase<typeof schema>;

    constructor(
        ctx: TaskOrchestratorDO["ctx"],
        env: TaskOrchestratorDO["env"]
    ) {
        super(ctx, env);

        this.#db = drizzle(ctx.storage);

        ctx.blockConcurrencyWhile(async () => {
            const migrated = await ctx.storage.get(MIGRATED_KEY);

            if (migrated) {
                return;
            }

            await migrateTaskOrchestratorDB(ctx.storage);
            await ctx.storage.put(MIGRATED_KEY, 1);
        });
    }
}

async function fetchTenantCode(tenantId: string) {
    return `${tenantId}`;
}

export const DynamicWorkflow = createDynamicWorkflowEntrypoint<Env>(
    async ({ env, metadata }) => {
        const tenantId = String(metadata.tenantId);

        const stub = env.LOADER.get(tenantId, async () => {
            const { mainModule, modules } = await createWorker({
                files: {
                    "src/index.ts": await fetchTenantCode(tenantId),
                    "package.json": JSON.stringify({}),
                },
            });

            return {
                modules,
                mainModule,
                compatibilityDate: "2026-11-01",

                // The tenant sees this as a normal Workflow binding.
                env: {
                    WORKFLOWS: wrapWorkflowBinding({ tenantId }),
                },
            };
        });

        // SAFETY: just because
        // oxlint-disable-next-line anti-slop/no-chained-type-assertions
        const entrypoint = stub.getEntrypoint(
            "TenantWorkflow"
        ) as unknown as WorkflowEntrypoint<Env>;

        return entrypoint;
    }
);
