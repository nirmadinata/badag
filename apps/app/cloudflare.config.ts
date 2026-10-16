import { bindings, defineConfig, exports } from "cf/config";

import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

const appName = "badag-app";
const taskOrchestratorClassName = "TaskOrchestratorDO";
const taskRunnerClassName = "TaskRunnerWF";

export default defineConfig({
    worker: ({ mode }) => {
        const isProduction = mode === "production";

        return {
            name: appName,
            compatibilityDate: "2026-10-06",
            entrypoint,

            env: {
                MAIN_DB: bindings.d1(
                    isProduction
                        ? undefined
                        : {
                              id: "00000000000000000000000000000000",
                              dev: { remote: false },
                          }
                ),
                MAIN_KV: bindings.kv(
                    isProduction ? undefined : { dev: { remote: false } }
                ),
                TASK_ORCHESTRATOR_DO: bindings.durableObject({
                    worker: appName,
                    exportName: taskOrchestratorClassName,
                }),
                TASK_RUNNER_WF: bindings.workflow({
                    worker: appName,
                    name: "task-runner",
                    exportName: taskRunnerClassName,
                }),
            },

            exports: {
                [taskOrchestratorClassName]: exports.durableObject({
                    storage: "sqlite",
                }),
                [taskRunnerClassName]: exports.workflow({
                    name: "task-runner",
                }),
            },
        };
    },
});
