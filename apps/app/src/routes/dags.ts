import { constants, schema } from "@badag/db-schema/main-db";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";

import { getMainDB } from "@/db";

// Wire schema: the OpenAPI document and the handler share these definitions.
// `v.InferOutput` gives the DTO type, so the response type cannot drift from
// the documented shape.
const dagSchema = v.object({
    id: v.pipe(v.number(), v.description("DAG id")),
    name: v.pipe(v.string(), v.maxLength(constants.DAG_NAME_MAX_LENGTH)),
    description: v.nullable(v.string()),
    createdAt: v.pipe(v.string(), v.description("ISO 8601 timestamp")),
    updatedAt: v.pipe(v.string(), v.description("ISO 8601 timestamp")),
});

type Dag = v.InferOutput<typeof dagSchema>;

const dagIdParamsSchema = v.object({
    id: v.pipe(v.string(), v.regex(/^\d+$/u), v.description("DAG id")),
});

const listDagsQuerySchema = v.object({
    limit: v.optional(
        v.pipe(
            v.string(),
            v.regex(/^(?:[1-9]|[1-9]\d|100)$/u),
            v.description("Page size, 1-100")
        ),
        "20"
    ),
    offset: v.optional(
        v.pipe(v.string(), v.regex(/^\d+$/u), v.description("Rows to skip")),
        "0"
    ),
});

const errorSchema = v.object({ message: v.string() });

const toDag = (row: typeof schema.dags.$inferSelect): Dag => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
});

export const dagRoutes = new Hono<{ Bindings: Env }>()
    /**
     * get dags
     */
    .get(
        "/",
        describeRoute({
            tags: ["dags"],
            summary: "List DAGs",
            responses: {
                200: {
                    description: "DAGs ordered by creation time",
                    content: {
                        "application/json": {
                            schema: resolver(v.array(dagSchema)),
                        },
                    },
                },
            },
        }),
        validator("query", listDagsQuerySchema),
        async (c) => {
            // `limit`/`offset` are validated digit strings; `valid()` is typed
            // from the valibot schema above.
            const { limit, offset } = c.req.valid("query");

            const rows = await getMainDB(c.env.MAIN_DB)
                .select()
                .from(schema.dags)
                .orderBy(desc(schema.dags.createdAt), desc(schema.dags.id))
                .limit(Number(limit))
                .offset(Number(offset));

            return c.json(rows.map(toDag));
        }
    )

    /**
     * get dags by id
     */
    .get(
        "/:id",
        describeRoute({
            tags: ["dags"],
            summary: "Get a DAG by id",
            responses: {
                200: {
                    description: "The DAG",
                    content: {
                        "application/json": { schema: resolver(dagSchema) },
                    },
                },
                404: {
                    description: "DAG not found",
                    content: {
                        "application/json": { schema: resolver(errorSchema) },
                    },
                },
            },
        }),
        validator("param", dagIdParamsSchema),
        async (c) => {
            const { id } = c.req.valid("param");

            const [row] = await getMainDB(c.env.MAIN_DB)
                .select()
                .from(schema.dags)
                .where(eq(schema.dags.id, Number(id)))
                .limit(1);

            if (!row) {
                return c.json({ message: "DAG not found" }, 404);
            }

            return c.json(toDag(row));
        }
    );
