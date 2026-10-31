import { TASK_KIND_ENUM } from "./kind";
import { taskMetadata } from "./metadata";
import { taskSchemas } from "./schemas";
import { normalizeTaskName } from "./task-name";
import type {
    AnySchema,
    AnyTaskFn,
    CreateTask,
    TaskParamOutput,
} from "./types";

/**
 * Build a regular task definition outside any DAG.
 *
 * Names are trimmed and validated here. Task IDs are assigned only when a
 * definition is registered as a `DAGTask`.
 */
export const task: CreateTask = (name, params) => {
    const definition = {
        kind: TASK_KIND_ENUM.Task,
        name: normalizeTaskName(name),
        fn: params.fn,
        ...taskMetadata(params),
        ...taskSchemas(params),
    } satisfies TaskParamOutput<string, AnyTaskFn, AnySchema, AnySchema>;

    return definition;
};
