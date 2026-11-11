import { relations, sql } from "drizzle-orm";
import {
    sqliteTable,
    int,
    text,
    index,
    uniqueIndex,
    primaryKey,
    foreignKey,
    check,
} from "drizzle-orm/sqlite-core";

import { COMMON_COLUMNS } from "../utils";
import {
    DAG_NAME_MAX_LENGTH,
    DEFAULT,
    LIST_DAG_RUN_STATUS,
    LIST_DAG_RUN_TRIGGER,
    DAG_TASK_KEY_MAX_LENGTH,
    DAG_TASK_NAME_MAX_LENGTH,
    DAG_TASK_TYPE_MAX_LENGTH,
} from "./constants";

// Logical DAG
export const dags = sqliteTable(
    "dags",
    {
        id: int("id").primaryKey({ autoIncrement: true }),
        name: text("name", { length: DAG_NAME_MAX_LENGTH }).notNull(),
        description: text("description"),
        ...COMMON_COLUMNS,
    },
    (t) => [uniqueIndex("dags_name_idx").on(t.name)]
);

// Tasks belong directly to a DAG.
export const dagTasks = sqliteTable(
    "dag_tasks",
    {
        id: int("id").primaryKey({ autoIncrement: true }),

        dagId: int("dag_id")
            .notNull()
            .references(() => dags.id, { onDelete: "cascade" }),

        // Stable identifier used in code and dependency references.
        key: text("key", { length: DAG_TASK_KEY_MAX_LENGTH }).notNull(),
        name: text("name", { length: DAG_TASK_NAME_MAX_LENGTH }).notNull(),
        type: text("type", { length: DAG_TASK_TYPE_MAX_LENGTH }).notNull(),

        config: text("config", { mode: "json" })
            .$type<Record<string, unknown>>()
            .notNull()
            .default({}),

        ...COMMON_COLUMNS,
    },
    (t) => [
        uniqueIndex("dag_tasks_dag_key_idx").on(t.dagId, t.key),
        // Required for composite foreign keys on graph edges.
        uniqueIndex("dag_tasks_dag_id_id_idx").on(t.dagId, t.id),
        index("dag_tasks_dag_type_idx").on(t.dagId, t.type),
    ]
);

// Directed edge: fromTaskId -> toTaskId.
// Composite FKs ensure both tasks belong to the same dagId.
export const dagEdges = sqliteTable(
    "dag_edges",
    {
        dagId: int("dag_id").notNull(),
        fromTaskId: int("from_task_id").notNull(),
        toTaskId: int("to_task_id").notNull(),

        // Edges are immutable; only the creation timestamp applies.
        createdAt: COMMON_COLUMNS.createdAt,
    },
    (t) => [
        primaryKey({
            columns: [t.dagId, t.fromTaskId, t.toTaskId],
        }),
        foreignKey({
            columns: [t.dagId, t.fromTaskId],
            foreignColumns: [dagTasks.dagId, dagTasks.id],
            name: "dag_edges_from_task_fk",
        }).onDelete("cascade"),
        foreignKey({
            columns: [t.dagId, t.toTaskId],
            foreignColumns: [dagTasks.dagId, dagTasks.id],
            name: "dag_edges_to_task_fk",
        }).onDelete("cascade"),
        check("dag_edges_no_self_loop", sql`${t.fromTaskId} <> ${t.toTaskId}`),
        index("dag_edges_downstream_idx").on(t.dagId, t.fromTaskId),
        index("dag_edges_upstream_idx").on(t.dagId, t.toTaskId),
    ]
);

// One record per execution of a DAG.
export const dagRuns = sqliteTable(
    "dag_runs",
    {
        id: int("id").primaryKey({ autoIncrement: true }),

        dagId: int("dag_id")
            .notNull()
            .references(() => dags.id),

        currentTaskId: int("current_task_id")
            .notNull()
            .references(() => dagTasks.id),

        status: text("status", { enum: LIST_DAG_RUN_STATUS })
            .notNull()
            .default(DEFAULT.DAG_RUN_STATUS),

        triggerType: text("trigger_type", { enum: LIST_DAG_RUN_TRIGGER })
            .notNull()
            .default(DEFAULT.DAG_RUN_TRIGGER),

        // Optional idempotency key or scheduler-generated run key.
        runKey: text("run_key"),

        input: text("input", { mode: "json" }).$type<Record<string, unknown>>(),

        output: text("output", { mode: "json" }).$type<
            Record<string, unknown>
        >(),

        startedAt: int("started_at", { mode: "timestamp_ms" }),
        finishedAt: int("finished_at", { mode: "timestamp_ms" }),

        ...COMMON_COLUMNS,
    },
    (t) => [
        uniqueIndex("dag_runs_run_key_idx").on(t.dagId, t.runKey),
        index("dag_runs_status_created_idx").on(t.status, t.createdAt),
        index("dag_runs_dag_created_idx").on(t.dagId, t.createdAt),
    ]
);

// Relational query metadata. `task_id` is a globally unique primary key, so a
// relation on that column alone is exact even though the graph edges are
// enforced by the composite `(dag_id, task_id)` foreign keys.
export const dagsRelations = relations(dags, ({ many }) => ({
    tasks: many(dagTasks),
    runs: many(dagRuns),
}));

export const dagTasksRelations = relations(dagTasks, ({ one, many }) => ({
    dag: one(dags, {
        fields: [dagTasks.dagId],
        references: [dags.id],
    }),
    outgoingEdges: many(dagEdges, { relationName: "dag_edges_from_task" }),
    incomingEdges: many(dagEdges, { relationName: "dag_edges_to_task" }),
}));

export const dagEdgesRelations = relations(dagEdges, ({ one }) => ({
    dag: one(dags, {
        fields: [dagEdges.dagId],
        references: [dags.id],
    }),
    fromTask: one(dagTasks, {
        fields: [dagEdges.fromTaskId],
        references: [dagTasks.id],
        relationName: "dag_edges_from_task",
    }),
    toTask: one(dagTasks, {
        fields: [dagEdges.toTaskId],
        references: [dagTasks.id],
        relationName: "dag_edges_to_task",
    }),
}));

export const dagRunsRelations = relations(dagRuns, ({ one }) => ({
    dag: one(dags, {
        fields: [dagRuns.dagId],
        references: [dags.id],
    }),
}));
