import { DEFAULT_TRIGGER_RULE } from "../trigger-rule";
import { normalizeTaskName } from "./task-name";
import type { AnyTaskFn, CreateTask, TaskParamOutput } from "./types";

/**
 * Build a task definition outside any DAG.
 *
 * Names are trimmed and validated here. Task IDs are assigned only when a
 * definition is registered as a `DAGTask`.
 */
export const task: CreateTask = (name, params) => {
    const definition = {
        fn: params.fn,
        name: normalizeTaskName(name),
        triggerRule: params.triggerRule ?? DEFAULT_TRIGGER_RULE,
    } satisfies TaskParamOutput<string, AnyTaskFn>;

    const withDescription =
        params.description === undefined
            ? definition
            : { ...definition, description: params.description };

    if (params.config === undefined) {
        return withDescription;
    }

    return { ...withDescription, config: params.config };
};
