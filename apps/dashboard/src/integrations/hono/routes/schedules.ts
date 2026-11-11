import { createRoute } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import {
    scheduleIdParamsSchema,
    scheduleListQuerySchema,
    scheduleListSchema,
    scheduleSchema,
    upsertScheduleBodySchema,
} from "../models";
import {
    errorResponses,
    jsonResponse,
    notImplemented,
    resourceErrorResponses,
} from "../shared";

const listSchedulesRoute = createRoute({
    method: "get",
    path: "/api/v1/schedules",
    tags: ["Schedules"],
    summary: "List schedules",
    description:
        "Returns DAG schedules, optionally filtered by DAG or enabled state.",
    request: { query: scheduleListQuerySchema },
    responses: {
        200: jsonResponse(scheduleListSchema, "Schedule list."),
        ...errorResponses,
    },
});

const getScheduleRoute = createRoute({
    method: "get",
    path: "/api/v1/schedules/{scheduleId}",
    tags: ["Schedules"],
    summary: "Get a schedule",
    description: "Returns one schedule and its cron configuration.",
    request: { params: scheduleIdParamsSchema },
    responses: {
        200: jsonResponse(scheduleSchema, "Schedule."),
        ...resourceErrorResponses,
    },
});

const upsertScheduleRoute = createRoute({
    method: "put",
    path: "/api/v1/schedules/{scheduleId}",
    tags: ["Schedules"],
    summary: "Create or replace a schedule",
    description:
        "Upserts the cron expression, timezone, and enabled state for a schedule.",
    request: {
        params: scheduleIdParamsSchema,
        body: {
            content: {
                "application/json": { schema: upsertScheduleBodySchema },
            },
            required: true,
        },
    },
    responses: {
        200: jsonResponse(scheduleSchema, "Schedule upserted."),
        ...resourceErrorResponses,
    },
});

const deleteScheduleRoute = createRoute({
    method: "delete",
    path: "/api/v1/schedules/{scheduleId}",
    tags: ["Schedules"],
    summary: "Delete a schedule",
    description: "Removes a schedule. Existing runs are unaffected.",
    request: { params: scheduleIdParamsSchema },
    responses: {
        204: { description: "Schedule deleted." },
        ...resourceErrorResponses,
    },
});

export function registerScheduleRoutes(app: OpenAPIHono): void {
    app.openapi(listSchedulesRoute, notImplemented);
    app.openapi(getScheduleRoute, notImplemented);
    app.openapi(upsertScheduleRoute, notImplemented);
    app.openapi(deleteScheduleRoute, notImplemented);
}
