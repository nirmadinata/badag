import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { COMMON_COLUMNS } from "../utils";
import { DEFAULT, LIST_TASK_EXECUTION_STATUS } from "./constants";

// One record per task execution in a DAG run.
export const taskExecutions = sqliteTable(
    "task_executions",
    {
        id: int("id").primaryKey({ autoIncrement: true }),

        taskId: int("task_id").notNull(),

        status: text("status", { enum: LIST_TASK_EXECUTION_STATUS })
            .notNull()
            .default(DEFAULT.TASK_EXECUTION_STATUS),

        attempt: int("attempt").notNull().default(0),

        input: text("input", { mode: "json" }).$type<Record<string, unknown>>(),

        output: text("output", { mode: "json" }).$type<
            Record<string, unknown>
        >(),

        error: text("error"),

        startedAt: int("started_at", { mode: "timestamp_ms" }),
        finishedAt: int("finished_at", { mode: "timestamp_ms" }),

        ...COMMON_COLUMNS,
    },
    (t) => [
        index("task_executions_status_created_idx").on(t.status, t.createdAt),
        index("task_executions_task_idx").on(t.taskId),
    ]
);
