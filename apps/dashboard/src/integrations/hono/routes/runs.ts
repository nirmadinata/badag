import { createRoute } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import {
    dagRunListSchema,
    dagRunSchema,
    runIdParamsSchema,
    runListQuerySchema,
    taskExecutionListQuerySchema,
    taskExecutionListSchema,
    taskExecutionParamsSchema,
    taskExecutionSchema,
} from "../models";
import {
    errorResponses,
    jsonResponse,
    notImplemented,
    resourceErrorResponses,
} from "../shared";

const listRunsRoute = createRoute({
    method: "get",
    path: "/api/v1/runs",
    tags: ["Runs"],
    summary: "List DAG runs",
    description:
        "Returns runs across every DAG. Filter by DAG, status, or trigger type.",
    request: { query: runListQuerySchema },
    responses: {
        200: jsonResponse(dagRunListSchema, "DAG run list."),
        ...errorResponses,
    },
});

const getRunRoute = createRoute({
    method: "get",
    path: "/api/v1/runs/{runId}",
    tags: ["Runs"],
    summary: "Get a DAG run",
    description:
        "Returns one run, including its status, trigger, input, and output.",
    request: { params: runIdParamsSchema },
    responses: {
        200: jsonResponse(dagRunSchema, "DAG run."),
        ...resourceErrorResponses,
    },
});

const listTaskExecutionsRoute = createRoute({
    method: "get",
    path: "/api/v1/runs/{runId}/tasks",
    tags: ["Runs"],
    summary: "List task executions",
    description: "Returns the per-task executions belonging to one DAG run.",
    request: {
        params: runIdParamsSchema,
        query: taskExecutionListQuerySchema,
    },
    responses: {
        200: jsonResponse(taskExecutionListSchema, "Task execution list."),
        ...resourceErrorResponses,
    },
});

const getTaskExecutionRoute = createRoute({
    method: "get",
    path: "/api/v1/runs/{runId}/tasks/{taskExecutionId}",
    tags: ["Runs"],
    summary: "Get a task execution",
    description:
        "Returns one task execution, including its attempt, timestamps, and error if it failed.",
    request: { params: taskExecutionParamsSchema },
    responses: {
        200: jsonResponse(taskExecutionSchema, "Task execution."),
        ...resourceErrorResponses,
    },
});

const cancelRunRoute = createRoute({
    method: "post",
    path: "/api/v1/runs/{runId}/cancel",
    tags: ["Runs"],
    summary: "Cancel a DAG run",
    description:
        "Requests cancellation of a running DAG run. Returns the run with its updated status.",
    request: { params: runIdParamsSchema },
    responses: {
        202: jsonResponse(dagRunSchema, "Cancellation accepted."),
        ...resourceErrorResponses,
    },
});

export function registerRunRoutes(app: OpenAPIHono): void {
    app.openapi(listRunsRoute, notImplemented);
    app.openapi(getRunRoute, notImplemented);
    app.openapi(listTaskExecutionsRoute, notImplemented);
    app.openapi(getTaskExecutionRoute, notImplemented);
    app.openapi(cancelRunRoute, notImplemented);
}
