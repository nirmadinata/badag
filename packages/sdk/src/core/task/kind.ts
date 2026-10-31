/**
 * Supported task kinds.
 *
 * Use these values wherever a kind is written or compared so the set stays
 * centralized.
 */
export const TASK_KIND_ENUM = {
    Task: "task",
    Sensor: "sensor",
    Delay: "delay",
    Branch: "branch",
    ShortCircuit: "short_circuit",
    Trigger: "trigger",
} as const;

/** A supported task kind. */
export type TaskKind = (typeof TASK_KIND_ENUM)[keyof typeof TASK_KIND_ENUM];
