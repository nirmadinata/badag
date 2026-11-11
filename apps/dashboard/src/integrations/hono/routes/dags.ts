import { createRoute } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import {
    createDagBodySchema,
    createDagEdgeBodySchema,
    createDagTasksBodySchema,
    dagEdgeListSchema,
    dagEdgeSchema,
    dagIdParamsSchema,
    dagListQuerySchema,
    dagListSchema,
    dagDetailSchema,
    dagRunListSchema,
    dagRunSchema,
    dagScopedRunListQuerySchema,
    dagSchema,
    dagTaskListSchema,
    triggerDagRunBodySchema,
    updateDagBodySchema,
} from "../models";
import {
    errorResponses,
    jsonResponse,
    notImplemented,
    resourceErrorResponses,
} from "../shared";

const listDagsRoute = createRoute({
    method: "get",
    path: "/api/v1/dags",
    tags: ["DAGs"],
    summary: "List DAGs",
    description:
        "Returns a paginated list of DAGs. Use `search` to filter by name.",
    request: { query: dagListQuerySchema },
    responses: {
        200: jsonResponse(dagListSchema, "Paginated DAG list."),
        ...errorResponses,
    },
});

const createDagRoute = createRoute({
    method: "post",
    path: "/api/v1/dags",
    tags: ["DAGs"],
    summary: "Create a DAG",
    description:
        "Registers a new logical DAG. Tasks and dependency edges are added through the DAG-scoped endpoints.",
    request: {
        body: {
            content: { "application/json": { schema: createDagBodySchema } },
            required: true,
        },
    },
    responses: {
        201: jsonResponse(dagSchema, "DAG created."),
        ...errorResponses,
    },
});

const getDagRoute = createRoute({
    method: "get",
    path: "/api/v1/dags/{dagId}",
    tags: ["DAGs"],
    summary: "Get a DAG",
    description:
        "Returns one DAG together with its registered tasks and dependency edges.",
    request: { params: dagIdParamsSchema },
    responses: {
        200: jsonResponse(dagDetailSchema, "DAG detail."),
        ...resourceErrorResponses,
    },
});

const updateDagRoute = createRoute({
    method: "patch",
    path: "/api/v1/dags/{dagId}",
    tags: ["DAGs"],
    summary: "Update a DAG",
    description: "Updates DAG metadata. Every field is optional.",
    request: {
        params: dagIdParamsSchema,
        body: {
            content: { "application/json": { schema: updateDagBodySchema } },
            required: true,
        },
    },
    responses: {
        200: jsonResponse(dagSchema, "DAG updated."),
        ...resourceErrorResponses,
    },
});

const deleteDagRoute = createRoute({
    method: "delete",
    path: "/api/v1/dags/{dagId}",
    tags: ["DAGs"],
    summary: "Delete a DAG",
    description: "Deletes a DAG and, by cascade, its tasks, edges, and runs.",
    request: { params: dagIdParamsSchema },
    responses: {
        204: { description: "DAG deleted." },
        ...resourceErrorResponses,
    },
});

const listDagTasksRoute = createRoute({
    method: "get",
    path: "/api/v1/dags/{dagId}/tasks",
    tags: ["DAGs"],
    summary: "List DAG tasks",
    description: "Returns the registered tasks for one DAG.",
    request: { params: dagIdParamsSchema },
    responses: {
        200: jsonResponse(dagTaskListSchema, "DAG task list."),
        ...resourceErrorResponses,
    },
});

const registerDagTasksRoute = createRoute({
    method: "post",
    path: "/api/v1/dags/{dagId}/tasks",
    tags: ["DAGs"],
    summary: "Register DAG tasks",
    description:
        "Registers one or more task definitions in a DAG. The `key` must be unique within the DAG.",
    request: {
        params: dagIdParamsSchema,
        body: {
            content: {
                "application/json": { schema: createDagTasksBodySchema },
            },
            required: true,
        },
    },
    responses: {
        201: jsonResponse(dagTaskListSchema, "Tasks registered."),
        ...resourceErrorResponses,
    },
});

const listDagEdgesRoute = createRoute({
    method: "get",
    path: "/api/v1/dags/{dagId}/edges",
    tags: ["DAGs"],
    summary: "List dependency edges",
    description:
        "Returns the directed dependency edges between the DAG's tasks.",
    request: { params: dagIdParamsSchema },
    responses: {
        200: jsonResponse(dagEdgeListSchema, "DAG edge list."),
        ...resourceErrorResponses,
    },
});

const createDagEdgeRoute = createRoute({
    method: "post",
    path: "/api/v1/dags/{dagId}/edges",
    tags: ["DAGs"],
    summary: "Wire a dependency edge",
    description:
        "Adds a directed edge so the task in `fromTaskId` must finish before `toTaskId` becomes ready.",
    request: {
        params: dagIdParamsSchema,
        body: {
            content: {
                "application/json": { schema: createDagEdgeBodySchema },
            },
            required: true,
        },
    },
    responses: {
        201: jsonResponse(dagEdgeSchema, "Dependency edge created."),
        ...resourceErrorResponses,
    },
});

const listDagRunsRoute = createRoute({
    method: "get",
    path: "/api/v1/dags/{dagId}/runs",
    tags: ["DAGs"],
    summary: "List DAG runs",
    description:
        "Returns the execution history for one DAG, optionally filtered by status or trigger type.",
    request: {
        params: dagIdParamsSchema,
        query: dagScopedRunListQuerySchema,
    },
    responses: {
        200: jsonResponse(dagRunListSchema, "DAG run list."),
        ...resourceErrorResponses,
    },
});

const triggerDagRunRoute = createRoute({
    method: "post",
    path: "/api/v1/dags/{dagId}/runs",
    tags: ["DAGs"],
    summary: "Trigger a DAG run",
    description:
        "Creates a new run for the DAG. Reusing `runKey` makes repeated triggers idempotent.",
    request: {
        params: dagIdParamsSchema,
        body: {
            content: {
                "application/json": { schema: triggerDagRunBodySchema },
            },
            required: true,
        },
    },
    responses: {
        202: jsonResponse(dagRunSchema, "DAG run accepted."),
        ...resourceErrorResponses,
    },
});

export function registerDagRoutes(app: OpenAPIHono): void {
    app.openapi(listDagsRoute, notImplemented);
    app.openapi(createDagRoute, notImplemented);
    app.openapi(getDagRoute, notImplemented);
    app.openapi(updateDagRoute, notImplemented);
    app.openapi(deleteDagRoute, notImplemented);
    app.openapi(listDagTasksRoute, notImplemented);
    app.openapi(registerDagTasksRoute, notImplemented);
    app.openapi(listDagEdgesRoute, notImplemented);
    app.openapi(createDagEdgeRoute, notImplemented);
    app.openapi(listDagRunsRoute, notImplemented);
    app.openapi(triggerDagRunRoute, notImplemented);
}
