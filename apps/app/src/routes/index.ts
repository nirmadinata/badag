import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { dagRoutes } from "./dags";

export const app = new Hono<{ Bindings: Env }>()

    .route("/dags", dagRoutes)

    .get("/openapi", Scalar({ url: "/openapi/json" }));

app.get(
    "/openapi/json",
    openAPIRouteHandler(app, {
        documentation: {
            info: { title: "badag", version: "0.0.0" },
        },
    })
);
