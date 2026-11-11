// oxlint-disable anti-slop/require-safety-comment-for-type-assertion

// Column length limits. SQLite does not enforce these; they document the
// application-level contract and are available for input validation.
export const DAG_NAME_MAX_LENGTH = 100;
export const DAG_TASK_KEY_MAX_LENGTH = 100;
export const DAG_TASK_NAME_MAX_LENGTH = 150;
export const DAG_TASK_TYPE_MAX_LENGTH = 50;

// Lifecycle of a single DAG execution.
export const ENUM_DAG_RUN_STATUS = {
    /**
     * Execution has started; the default for a newly inserted run.
     */
    Running: "running",

    /**
     * Terminal: every task execution succeeded; `finishedAt` records completion.
     */
    Succeeded: "succeeded",

    /**
     * Terminal: a task execution failed or the run itself errored. Task-level
     * diagnostics live in `task_executions.error`.
     */
    Failed: "failed",

    /**
     * Terminal: stopped before completion by a user or system action. Kept
     * separate from `Failed` so cancellations do not count as errors.
     */
    Cancelled: "cancelled",
} as const;

// What caused a DAG run to be created.
export const ENUM_DAG_RUN_TRIGGER = {
    /**
     * Created by an explicit user or API action; the default trigger.
     */
    Manual: "manual",

    /**
     * Created by a cron/timer scheduler. `runKey` can hold the scheduled slot
     * to make repeated firings idempotent per DAG.
     */
    Schedule: "schedule",

    /**
     * Created by an external event or webhook rather than a clock or person.
     */
    Event: "event",
} as const;

export type DagRunStatus =
    (typeof ENUM_DAG_RUN_STATUS)[keyof typeof ENUM_DAG_RUN_STATUS];

export type DagRunTrigger =
    (typeof ENUM_DAG_RUN_TRIGGER)[keyof typeof ENUM_DAG_RUN_TRIGGER];

export const DEFAULT = {
    /**
     * Status assigned to a newly created DAG run.
     */
    DAG_RUN_STATUS: ENUM_DAG_RUN_STATUS.Running as DagRunStatus,

    /**
     * Trigger assigned when a DAG run is created without an explicit cause.
     */
    DAG_RUN_TRIGGER: ENUM_DAG_RUN_TRIGGER.Manual as DagRunTrigger,
};

export const LIST_DAG_RUN_STATUS = [
    ENUM_DAG_RUN_STATUS.Running,
    ENUM_DAG_RUN_STATUS.Succeeded,
    ENUM_DAG_RUN_STATUS.Failed,
    ENUM_DAG_RUN_STATUS.Cancelled,
] as const;

export const LIST_DAG_RUN_TRIGGER = [
    ENUM_DAG_RUN_TRIGGER.Manual,
    ENUM_DAG_RUN_TRIGGER.Schedule,
    ENUM_DAG_RUN_TRIGGER.Event,
] as const;
