/**
 * Supported trigger rules, keyed for use as an enum.
 *
 * The SDK stores the selected rule on a task but does not evaluate it;
 * schedulers are responsible for interpreting these values.
 */
export const TRIGGER_RULE_ENUM = {
    /**
     * Run after every upstream task succeeds.
     */
    AllSuccess: "all_success",
    /**
     * Run after every upstream task finishes, regardless of outcome.
     */
    AllDone: "all_done",
    /**
     * Run when at least one upstream task succeeds.
     */
    OneSuccess: "one_success",
    /**
     * Run when at least one upstream task fails.
     */
    OneFailed: "one_failed",
    /**
     * Run when no upstream task fails.
     */
    NoneFailed: "none_failed",
    /**
     * Run when no upstream task fails and at least one succeeds.
     */
    NoneFailedMinOneSuccess: "none_failed_min_one_success",
    /**
     * Run when every upstream task is skipped.
     */
    AllSkipped: "all_skipped",
} as const;

/**
 * A trigger rule accepted by `TaskParamInput.triggerRule`.
 */
export type TriggerRule =
    (typeof TRIGGER_RULE_ENUM)[keyof typeof TRIGGER_RULE_ENUM];

/** Applied when a task definition omits `triggerRule`. */
export const DEFAULT_TRIGGER_RULE = TRIGGER_RULE_ENUM.AllSuccess;
