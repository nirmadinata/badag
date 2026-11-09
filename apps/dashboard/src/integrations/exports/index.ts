// oxlint-disable no-unused-private-class-members no-this-before-super

// Durable Object and Workflow classes exported by the dashboard worker.
// Re-exported from the Worker entry (`src/server.ts`) so `@cloudflare/vite-plugin`
// emits them as named module exports; `cloudflare.config.ts` declares the same
// names under `exports`.

import type { schema } from "@badag/db-schema/orchestrator-db";
import { DurableObject, WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/durable-sqlite";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

import { migrateTaskOrchestratorDB } from "@/integrations/db/orchestrator";

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

interface TaskRunnerWFPayload {
    doName: string;
}

type Event = WorkflowEvent<TaskRunnerWFPayload>;

export class TaskRunnerWF extends WorkflowEntrypoint<Env, TaskRunnerWFPayload> {
    async run(event: Readonly<Event>, step: WorkflowStep) {
        return await step.do("read-payload", async () => event.payload);
    }
}
