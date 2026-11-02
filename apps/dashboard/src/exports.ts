// Durable Object and Workflow classes exported by the dashboard worker.
// Re-exported from the Worker entry (`src/server.ts`) so `@cloudflare/vite-plugin`
// emits them as named module exports; `cloudflare.config.ts` declares the same
// names under `exports`.

import { DurableObject, WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import { migrateTaskOrchestratorDB } from "@/db";

interface TaskOrchestratorDoProps {
    placeholder: string;
}

export class TaskOrchestratorDO extends DurableObject<
    Env,
    TaskOrchestratorDoProps
> {
    constructor(ctx: DurableObjectState<TaskOrchestratorDoProps>, env: Env) {
        super(ctx, env);

        ctx.blockConcurrencyWhile(async () => {
            await migrateTaskOrchestratorDB(ctx.storage);
        });
    }
}

interface TaskRunnerWFPayload {
    placeholder: string;
}

export class TaskRunnerWF extends WorkflowEntrypoint<Env, TaskRunnerWFPayload> {
    async run(
        event: Readonly<WorkflowEvent<TaskRunnerWFPayload>>,
        step: WorkflowStep
    ): Promise<TaskRunnerWFPayload> {
        return await step.do("read-payload", async () => event.payload);
    }
}
