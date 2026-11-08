import { bindings, defineConfig, exports } from "cf/config";

import * as entrypoint from "./src/server" with { type: "cf-worker" };

const APP_NAME = "badag-dashboard";
const TASK_ORCHESTRATOR_CLASS_NAME = "TaskOrchestratorDO";
const TASK_RUNNER_CLASS_NAME = "TaskRunnerWF";

// Placeholder id for the local-only D1 database; deploys must bind the real one.
const MAIN_DB_ID = "00000000000000000000000000000000";

export default defineConfig({
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
            MAIN_DB: bindings.d1({ id: MAIN_DB_ID, dev: { remote: false } }),
            TASK_ORCHESTRATOR_DO: bindings.durableObject({
                worker: APP_NAME,
                exportName: TASK_ORCHESTRATOR_CLASS_NAME,
            }),
            TASK_RUNNER_WF: bindings.workflow({
                worker: APP_NAME,
                name: "dashboard-task-runner",
                exportName: TASK_RUNNER_CLASS_NAME,
            }),
        },

        exports: {
            [TASK_ORCHESTRATOR_CLASS_NAME]: exports.durableObject({
                storage: "sqlite",
            }),
            [TASK_RUNNER_CLASS_NAME]: exports.workflow({
                name: "dashboard-task-runner",
            }),
        },
    },
});
