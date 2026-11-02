import { constants as dagConstants } from "@badag/db-schema/main-db";
import { constants as taskConstants } from "@badag/db-schema/orchestrator-db";
import { z } from "@hono/zod-openapi";

// Shared field schemas. Timestamps are ISO 8601 strings on the wire even
// though D1 stores them as epoch milliseconds.
const timestamp = z.iso.datetime().openapi({
    description: "ISO 8601 timestamp.",
    example: "2026-01-01T00:00:00.000Z",
});

const nullableTimestamp = timestamp.nullable();

const jsonObject = z
    .record(z.string(), z.unknown())
    .openapi({ description: "Arbitrary JSON object." });

const nullableJsonObject = jsonObject.nullable();

// Path and query values arrive as strings, so these schemas coerce them
// before validating the numeric constraints.
const numericParam = (description: string) =>
    z.coerce.number().int().min(1).openapi({ description, example: 1 });

const paginationProperties = {
    limit: z.coerce.number().int().min(1).max(100).default(20).openapi({
        description: "Maximum number of items to return. Defaults to 20.",
        example: 20,
    }),
    offset: z.coerce.number().int().min(0).default(0).openapi({
        // `zod-to-openapi` marks coerced numbers with a zero minimum as
        // nullable; pin the schema type and keep the runtime default.
        type: "integer",
        minimum: 0,
        default: 0,
        description: "Number of items to skip. Defaults to 0.",
        example: 0,
    }),
};

export const pageMetaSchema = z
    .object({
        limit: z.number().int().min(1).max(100),
        offset: z.number().int().min(0),
        total: z.number().int().min(0),
    })
    .openapi("PageMeta");

const dagRunStatusSchema = z
    .enum(dagConstants.LIST_DAG_RUN_STATUS)
    .openapi({ description: "Lifecycle state of a DAG run." });

const dagRunTriggerSchema = z
    .enum(dagConstants.LIST_DAG_RUN_TRIGGER)
    .openapi({ description: "Cause that created a DAG run." });

const taskExecutionStatusSchema = z
    .enum(taskConstants.LIST_TASK_EXECUTION_STATUS)
    .openapi({ description: "Lifecycle state of a single task execution." });

export const dagSchema = z
    .object({
        id: z.number().int().min(1),
        name: z
            .string()
            .min(1)
            .max(dagConstants.DAG_NAME_MAX_LENGTH)
            .openapi({ description: "Unique DAG name." }),
        description: z.string().nullable(),
        createdAt: timestamp,
        updatedAt: timestamp,
    })
    .openapi("Dag");

export const dagTaskSchema = z
    .object({
        id: z.number().int().min(1),
        dagId: z.number().int().min(1),
        key: z
            .string()
            .min(1)
            .max(dagConstants.DAG_TASK_KEY_MAX_LENGTH)
            .openapi({
                description: "Stable identifier used in dependency references.",
            }),
        name: z.string().min(1).max(dagConstants.DAG_TASK_NAME_MAX_LENGTH),
        type: z
            .string()
            .min(1)
            .max(dagConstants.DAG_TASK_TYPE_MAX_LENGTH)
            .openapi({ description: "Task kind." }),
        config: jsonObject,
        createdAt: timestamp,
        updatedAt: timestamp,
    })
    .openapi("DagTask");

export const dagEdgeSchema = z
    .object({
        dagId: z.number().int().min(1),
        fromTaskId: z.number().int().min(1),
        toTaskId: z.number().int().min(1),
        createdAt: timestamp,
    })
    .openapi("DagEdge");

export const dagRunSchema = z
    .object({
        id: z.number().int().min(1),
        dagId: z.number().int().min(1),
        currentTaskId: z.number().int().min(1),
        status: dagRunStatusSchema,
        triggerType: dagRunTriggerSchema,
        runKey: z.string().nullable().openapi({
            description:
                "Idempotency key, typically the scheduler slot for scheduled runs.",
        }),
        input: nullableJsonObject,
        output: nullableJsonObject,
        startedAt: nullableTimestamp,
        finishedAt: nullableTimestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
    })
    .openapi("DagRun");

export const taskExecutionSchema = z
    .object({
        id: z.number().int().min(1),
        taskId: z.number().int().min(1),
        status: taskExecutionStatusSchema,
        attempt: z.number().int().min(0),
        input: nullableJsonObject,
        output: nullableJsonObject,
        error: z
            .string()
            .nullable()
            .openapi({ description: "Failure reason for this attempt." }),
        startedAt: nullableTimestamp,
        finishedAt: nullableTimestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
    })
    .openapi("TaskExecution");

export const scheduleSchema = z
    .object({
        id: z.string().openapi({ description: "Schedule identifier." }),
        dagId: z.number().int().min(1),
        cron: z.string().min(1).openapi({
            description: "Cron expression controlling when the DAG runs.",
        }),
        timezone: z.string().min(1).openapi({
            description: "IANA timezone the cron expression is evaluated in.",
        }),
        enabled: z.boolean(),
        createdAt: timestamp,
        updatedAt: timestamp,
    })
    .openapi("Schedule");

export const dagDetailSchema = z
    .object({
        id: z.number().int().min(1),
        name: z.string().min(1).max(dagConstants.DAG_NAME_MAX_LENGTH),
        description: z.string().nullable(),
        tasks: z.array(dagTaskSchema),
        edges: z.array(dagEdgeSchema),
        createdAt: timestamp,
        updatedAt: timestamp,
    })
    .openapi("DagDetail");

export const dagListSchema = z
    .object({
        items: z.array(dagSchema),
        meta: pageMetaSchema,
    })
    .openapi("DagList");

export const dagTaskListSchema = z
    .object({
        items: z.array(dagTaskSchema),
        meta: pageMetaSchema,
    })
    .openapi("DagTaskList");

export const dagEdgeListSchema = z
    .object({
        items: z.array(dagEdgeSchema),
        meta: pageMetaSchema,
    })
    .openapi("DagEdgeList");

export const dagRunListSchema = z
    .object({
        items: z.array(dagRunSchema),
        meta: pageMetaSchema,
    })
    .openapi("DagRunList");

export const taskExecutionListSchema = z
    .object({
        items: z.array(taskExecutionSchema),
        meta: pageMetaSchema,
    })
    .openapi("TaskExecutionList");

export const scheduleListSchema = z
    .object({
        items: z.array(scheduleSchema),
        meta: pageMetaSchema,
    })
    .openapi("ScheduleList");

export const apiErrorSchema = z
    .object({
        code: z
            .string()
            .openapi({ description: "Machine-readable error code." }),
        message: z
            .string()
            .openapi({ description: "Human-readable error message." }),
    })
    .openapi("ApiError");

export const healthSchema = z
    .object({
        status: z.literal("ok"),
    })
    .openapi("Health");

// Path parameters.

export const dagIdParamsSchema = z.object({
    dagId: numericParam("DAG identifier.").openapi({
        param: { name: "dagId", in: "path" },
        example: 1,
    }),
});

export const runIdParamsSchema = z.object({
    runId: numericParam("DAG run identifier.").openapi({
        param: { name: "runId", in: "path" },
        example: 1,
    }),
});

export const taskExecutionParamsSchema = z.object({
    runId: numericParam("DAG run identifier.").openapi({
        param: { name: "runId", in: "path" },
        example: 1,
    }),
    taskExecutionId: numericParam("Task execution identifier.").openapi({
        param: { name: "taskExecutionId", in: "path" },
        example: 1,
    }),
});

export const scheduleIdParamsSchema = z.object({
    scheduleId: z
        .string()
        .min(1)
        .openapi({
            param: { name: "scheduleId", in: "path" },
            description: "Schedule identifier.",
        }),
});

// Query parameters.

export const dagListQuerySchema = z.object({
    ...paginationProperties,
    search: z
        .string()
        .max(dagConstants.DAG_NAME_MAX_LENGTH)
        .optional()
        .openapi({ description: "Case-insensitive DAG name filter." }),
});

export const dagScopedRunListQuerySchema = z.object({
    ...paginationProperties,
    status: dagRunStatusSchema.optional(),
    triggerType: dagRunTriggerSchema.optional(),
});

export const runListQuerySchema = z.object({
    ...paginationProperties,
    dagId: numericParam("Filter by DAG identifier.").optional(),
    status: dagRunStatusSchema.optional(),
    triggerType: dagRunTriggerSchema.optional(),
});

export const taskExecutionListQuerySchema = z.object({
    ...paginationProperties,
    status: taskExecutionStatusSchema.optional(),
});

export const scheduleListQuerySchema = z.object({
    ...paginationProperties,
    dagId: numericParam("Filter by DAG identifier.").optional(),
    enabled: z.enum(["true", "false"]).optional().openapi({
        description: "Filter by enabled state. Defaults to all schedules.",
        example: "true",
    }),
});

// Request bodies.

export const createDagBodySchema = z.object({
    name: z
        .string()
        .min(1)
        .max(dagConstants.DAG_NAME_MAX_LENGTH)
        .openapi({ description: "Unique DAG name." }),
    description: z.string().optional(),
});

export const updateDagBodySchema = z.object({
    name: z.string().min(1).max(dagConstants.DAG_NAME_MAX_LENGTH).optional(),
    description: z.string().nullable().optional(),
});

export const createDagTasksBodySchema = z.object({
    tasks: z
        .array(
            z.object({
                key: z
                    .string()
                    .min(1)
                    .max(dagConstants.DAG_TASK_KEY_MAX_LENGTH)
                    .openapi({
                        description:
                            "Stable identifier used in dependency references.",
                    }),
                name: z
                    .string()
                    .min(1)
                    .max(dagConstants.DAG_TASK_NAME_MAX_LENGTH),
                type: z
                    .string()
                    .min(1)
                    .max(dagConstants.DAG_TASK_TYPE_MAX_LENGTH)
                    .openapi({ description: "Task kind." }),
                config: jsonObject.optional(),
            })
        )
        .min(1),
});

export const createDagEdgeBodySchema = z.object({
    fromTaskId: z.number().int().min(1),
    toTaskId: z.number().int().min(1),
});

export const triggerDagRunBodySchema = z.object({
    runKey: z.string().min(1).optional().openapi({
        description:
            "Idempotency key; repeated triggers with the same key reuse the run.",
    }),
    input: jsonObject.optional(),
});

export const upsertScheduleBodySchema = z.object({
    dagId: z.number().int().min(1),
    cron: z.string().min(1).openapi({
        description: "Cron expression controlling when the DAG runs.",
    }),
    timezone: z.string().min(1).default("UTC").openapi({
        description: "IANA timezone the cron expression is evaluated in.",
    }),
    enabled: z.boolean().default(true),
});
