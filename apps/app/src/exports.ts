// oxlint-disable no-unused-private-class-members

import { DurableObject, WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

import {
    getMainDB,
    getTaskOrchestratorDB,
    migrateTaskOrchestratorDB,
} from "@/db";

const MIGRATED_KEY = "MIGRATED";

interface TaskOrchestratorDoProps {
    placeholder: string;
}

export class TaskOrchestratorDO extends DurableObject<
    Env,
    TaskOrchestratorDoProps
> {
    #storage: DurableObjectStorage;
    #taskDB: ReturnType<typeof getTaskOrchestratorDB>;
    #mainDB: ReturnType<typeof getMainDB>;
    #taskRunnerWF: Workflow;

    constructor(ctx: DurableObjectState<TaskOrchestratorDoProps>, env: Env) {
        super(ctx, env);

        this.#taskRunnerWF ??= env.TASK_RUNNER_WF;
        this.#storage ??= ctx.storage;
        this.#taskDB ??= getTaskOrchestratorDB(this.#storage);
        this.#mainDB ??= getMainDB(env.MAIN_DB);

        ctx.blockConcurrencyWhile(this._migrate);
    }

    async _migrate() {
        const isMigrated = await this.#storage.get(MIGRATED_KEY);

        if (!isMigrated) {
            return;
        }

        await migrateTaskOrchestratorDB(this.#storage);
        await this.#storage.put(MIGRATED_KEY, 1);
        await this.#storage.sync();
    }
}

interface TaskRunnerWFPayload {
    placeholder: string;
}

export class TaskRunnerWF extends WorkflowEntrypoint<Env, TaskRunnerWFPayload> {
    #mainDB: ReturnType<typeof getMainDB>;

    constructor(ctx: ExecutionContext, env: Env) {
        super(ctx, env);
        this.#mainDB ??= getMainDB(env.MAIN_DB);

        console.log(`Task Created`);
    }

    async run(
        _event: Readonly<WorkflowEvent<TaskRunnerWFPayload>>,
        _step: WorkflowStep
    ) {
        // TODO: implement
    }
}
