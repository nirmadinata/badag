import { createRoute } from "@hono/zod-openapi";
import type { OpenAPIHono } from "@hono/zod-openapi";

import { healthSchema } from "../models";
import { jsonResponse } from "../shared";

const healthRoute = createRoute({
    method: "get",
    path: "/api/v1/health",
    tags: ["System"],
    summary: "API health",
    description: "Returns `ok` when the public API is reachable.",
    responses: {
        200: jsonResponse(healthSchema, "Service is healthy."),
    },
});

const healthHandler = (app: OpenAPIHono) => {
    app.openapi(healthRoute, (c) => c.json({ status: "ok" as const }, 200));
};

export function registerSystemRoutes(app: OpenAPIHono): void {
    healthHandler(app);
}
