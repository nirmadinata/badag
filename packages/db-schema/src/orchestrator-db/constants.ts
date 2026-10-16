// oxlint-disable anti-slop/require-safety-comment-for-type-assertion

// Lifecycle of a task execution within a DAG run.
export const ENUM_TASK_EXECUTION_STATUS = {
    /**
     * Initial state: the row exists but the task is not runnable yet because
     * dependencies or dispatch conditions are unmet. The default status.
     */
    Pending: "pending",

    /**
     * Runnable and waiting for a worker. Separates dependency waits from
     * execution-capacity waits.
     */
    Queued: "queued",

    /**
     * Currently executing; `startedAt` and `attempt` identify the try.
     */
    Running: "running",

    /**
     * Terminal: completed successfully; result in `output`, `finishedAt` set.
     */
    Succeeded: "succeeded",

    /**
     * Terminal for this attempt: errored. The reason is in `error` and
     * `finishedAt` is set; retries use a new attempt, not a new status.
     */
    Failed: "failed",

    /**
     * Terminal: intentionally not executed, e.g. its branch was not selected
     * or an upstream dependency made it unreachable.
     */
    Skipped: "skipped",

    /**
     * Terminal: aborted because the DAG run was cancelled or the task was
     * stopped directly. Not an execution error.
     */
    Cancelled: "cancelled",
} as const;

export type TaskExecutionStatus =
    (typeof ENUM_TASK_EXECUTION_STATUS)[keyof typeof ENUM_TASK_EXECUTION_STATUS];

export const DEFAULT = {
    /**
     * Status assigned to every task execution created for a DAG run.
     */
    TASK_EXECUTION_STATUS:
        ENUM_TASK_EXECUTION_STATUS.Pending as TaskExecutionStatus,
};

export const LIST_TASK_EXECUTION_STATUS = [
    ENUM_TASK_EXECUTION_STATUS.Pending,
    ENUM_TASK_EXECUTION_STATUS.Queued,
    ENUM_TASK_EXECUTION_STATUS.Running,
    ENUM_TASK_EXECUTION_STATUS.Succeeded,
    ENUM_TASK_EXECUTION_STATUS.Failed,
    ENUM_TASK_EXECUTION_STATUS.Skipped,
    ENUM_TASK_EXECUTION_STATUS.Cancelled,
] as const;
