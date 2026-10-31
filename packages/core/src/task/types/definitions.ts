import type { TASK_KIND_ENUM } from "../kind";
import type { AnySchema, AnyTaskFn, TaskDefinitionBase, TaskFn } from "./base";
import type { BranchTaskDefinition } from "./branch";
import type { DelayTaskDefinition } from "./delay";
import type { SensorTaskDefinition } from "./sensor";
import type { ShortCircuitTaskDefinition } from "./short-circuit";
import type { TaskParamOutput } from "./task";
import type { TriggerTaskDefinition } from "./trigger";

/**
 * A sensor definition with its callback erased for registration.
 */
export interface AnySensorTaskDefinition extends TaskDefinitionBase<
    string,
    typeof TASK_KIND_ENUM.Sensor,
    AnySchema,
    AnySchema
> {
    readonly predicate: AnyTaskFn;
    readonly pokeIntervalMs?: number;
}

/**
 * A delay definition with its callback erased for registration.
 */
export interface AnyDelayTaskDefinition extends TaskDefinitionBase<
    string,
    typeof TASK_KIND_ENUM.Delay,
    AnySchema,
    AnySchema
> {
    readonly durationMs: number;
}

/**
 * A branch definition with its callback erased for registration.
 */
export interface AnyBranchTaskDefinition extends TaskDefinitionBase<
    string,
    typeof TASK_KIND_ENUM.Branch,
    AnySchema,
    AnySchema
> {
    readonly branches?: readonly string[];
    readonly choose: AnyTaskFn;
}

/**
 * A short-circuit definition with its callback erased for registration.
 */
export interface AnyShortCircuitTaskDefinition extends TaskDefinitionBase<
    string,
    typeof TASK_KIND_ENUM.ShortCircuit,
    AnySchema,
    AnySchema
> {
    readonly condition: AnyTaskFn;
}

/**
 * A trigger definition with its callback erased for registration.
 */
export interface AnyTriggerTaskDefinition extends TaskDefinitionBase<
    string,
    typeof TASK_KIND_ENUM.Trigger,
    AnySchema,
    AnySchema
> {
    readonly dagName: string;
    readonly waitForCompletion: boolean;
}

/**
 * Any task definition accepted by a DAG.
 */
export type AnyTaskDefinition =
    | TaskParamOutput<string, AnyTaskFn, AnySchema, AnySchema>
    | AnySensorTaskDefinition
    | AnyDelayTaskDefinition
    | AnyBranchTaskDefinition
    | AnyShortCircuitTaskDefinition
    | AnyTriggerTaskDefinition;

/**
 * A registered task definition with callbacks erased to the generic task name.
 *
 * Schemas are erased to `AnySchema` so a registered view keeps the declared
 * `input`/`output` fields without committing to their inferred types.
 */
export type RegisteredTaskDefinition =
    | TaskParamOutput<string, TaskFn, AnySchema, AnySchema>
    | SensorTaskDefinition<string, AnySchema, AnySchema>
    | DelayTaskDefinition<string, AnySchema, AnySchema>
    | BranchTaskDefinition<string, readonly string[], AnySchema, AnySchema>
    | ShortCircuitTaskDefinition<string, AnySchema, AnySchema>
    | TriggerTaskDefinition<string, AnySchema, AnySchema>;
