import { bindings, defineConfig, exports } from "cf/config";

import * as entrypoint from "./src/server" with { type: "cf-worker" };

const APP_NAME = "badag-dashboard";
const TASK_ORCHESTRATOR_CLASS_NAME = "TaskOrchestratorDO";
const DYNAMIC_WORKFLOW_CLASS_NAME = "DynamicWorkflow";

// Placeholder id for the local-only D1 database; deploys must bind the real one.

export default defineConfig(({ mode }) => {
    const MAIN_DB_ID =
        mode === "development" ? "00000000000000000000000000000000" : undefined;

    return {
        worker: {
            entrypoint,
            name: APP_NAME,
            compatibilityDate: "2025-09-02",
            compatibilityFlags: ["nodejs_compat"],

            env: {
                // Secrets are read locally from `.env` (see `.env.example`) and must
                // be set with `cf secret put <NAME>` before deploying.
                BETTER_AUTH_SECRET: bindings.secret(),
                BETTER_AUTH_URL: bindings.secret(),
                MAIN_DB: bindings.d1({
                    id: MAIN_DB_ID,
                    dev: { remote: false },
                }),
                LOADER: bindings.workerLoader(),
                TASK_ORCHESTRATOR_DO: bindings.durableObject({
                    worker: APP_NAME,
                    exportName: TASK_ORCHESTRATOR_CLASS_NAME,
                }),
                DYNAMIC_WORKFLOW: bindings.workflow({
                    worker: APP_NAME,
                    name: "dynamic-workflow",
                    exportName: DYNAMIC_WORKFLOW_CLASS_NAME,
                }),
            },

            exports: {
                [TASK_ORCHESTRATOR_CLASS_NAME]: exports.durableObject({
                    storage: "sqlite",
                }),
            },
        },
    };
});
