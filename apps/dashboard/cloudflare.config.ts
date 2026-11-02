import { bindings, defineConfig, exports } from "cf/config";

import * as entrypoint from "./src/server" with { type: "cf-worker" };

const appName = "tanstack-start-app";
const taskOrchestratorClassName = "TaskOrchestratorDO";
const taskRunnerClassName = "TaskRunnerWF";

// Placeholder id for the local-only D1 database; deploys must bind the real one.
const mainDbId = "00000000000000000000000000000000";

export default defineConfig({
    worker: {
        name: appName,
        compatibilityDate: "2025-09-02",
        compatibilityFlags: ["nodejs_compat"],
        entrypoint,

        env: {
            MAIN_DB: bindings.d1({
                id: mainDbId,
                dev: { remote: false },
            }),
            TASK_ORCHESTRATOR_DO: bindings.durableObject({
                worker: appName,
                exportName: taskOrchestratorClassName,
            }),
            TASK_RUNNER_WF: bindings.workflow({
                worker: appName,
                name: "dashboard-task-runner",
                exportName: taskRunnerClassName,
            }),
        },

        exports: {
            [taskOrchestratorClassName]: exports.durableObject({
                storage: "sqlite",
            }),
            [taskRunnerClassName]: exports.workflow({
                name: "dashboard-task-runner",
            }),
        },
    },
});
