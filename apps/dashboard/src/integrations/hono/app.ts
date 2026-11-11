import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import type { ErrorHandler } from "hono";

import { registerDagRoutes } from "./routes/dags";
import { registerRunRoutes } from "./routes/runs";
import { registerScheduleRoutes } from "./routes/schedules";
import { registerSystemRoutes } from "./routes/system";
import { NotImplementedError } from "./shared";

export const publicApi = new OpenAPIHono({
    // Validation runs before the handler. Convert Zod issues into the same
    // compact error contract every route documents.
    defaultHook: (result, c) => {
        if (!result.success) {
            return c.json(
                {
                    code: "invalid_request",
                    message: result.error.issues
                        .map((issue) => issue.message)
                        .join("; "),
                },
                422
            );
        }
    },
});

// Health and the documentation are always reachable.
registerSystemRoutes(publicApi);

publicApi.get("/api/v1/docs", Scalar({ url: "/api/v1/docs/json" }));

publicApi.doc31("/api/v1/docs/json", {
    openapi: "3.1.0",
    info: {
        title: "Badag Public API",
        version: "1.0.0",
        description:
            "HTTP API for inspecting and managing DAGs, their task executions, and schedules.",
    },
    tags: [
        {
            name: "DAGs",
            description: "DAG metadata, tasks, dependency edges, and runs.",
        },
        {
            name: "Runs",
            description: "DAG runs and the task executions inside them.",
        },
        {
            name: "Schedules",
            description: "Cron schedules that trigger DAG runs.",
        },
        {
            name: "System",
            description: "Service health.",
        },
    ],
});

registerDagRoutes(publicApi);

registerRunRoutes(publicApi);

registerScheduleRoutes(publicApi);

publicApi.notFound((c) =>
    c.json(
        {
            code: "not_found",
            message: "No route matches this request.",
        },
        404
    )
);

const handleError: ErrorHandler = (error, c) => {
    if (error instanceof NotImplementedError) {
        return c.json(
            {
                code: "not_implemented",
                message: error.message,
            },
            501
        );
    }

    return c.json(
        {
            code: "internal_error",
            message: "An unexpected error occurred.",
        },
        500
    );
};

publicApi.onError(handleError);

export const handlePublicApiRequest = (request: Request) =>
    publicApi.fetch(request);
