/**
 * Public surface of the task module.
 *
 * Exports the factories, the kind enum, and the definition types. Internal
 * helpers (`taskMetadata`, `normalizeTaskName`, `taskBehaviorSource`, and the
 * duration assertions) stay module-private so importing this barrel never
 * widens the package's API.
 */

export { branch } from "./branch";

export { delay } from "./delay";

export { sensor } from "./sensor";

export { shortCircuit } from "./short-circuit";

export { task } from "./task";

export { trigger } from "./trigger";

export { TASK_KIND_ENUM } from "./kind";

export type {
    AnyBranchTaskDefinition,
    AnyDelayTaskDefinition,
    AnySchema,
    AnySensorTaskDefinition,
    AnyShortCircuitTaskDefinition,
    AnyTaskDefinition,
    AnyTaskFn,
    AnyTriggerTaskDefinition,
    BranchChoice,
    BranchChooser,
    BranchTaskDefinition,
    BranchTaskInput,
    CreateBranch,
    CreateDelay,
    CreateSensor,
    CreateShortCircuit,
    CreateTask,
    CreateTrigger,
    DelayTaskDefinition,
    DelayTaskInput,
    MaybePromise,
    RegisteredTaskDefinition,
    SchemaOf,
    SensorPredicate,
    SensorTaskDefinition,
    SensorTaskInput,
    ShortCircuitCondition,
    ShortCircuitTaskDefinition,
    ShortCircuitTaskInput,
    TaskConfig,
    TaskContext,
    TaskDefinitionBase,
    TaskFn,
    TaskKind,
    TaskMetadata,
    TaskParamInput,
    TaskParamOutput,
    TaskPayloadOf,
    TaskProducedOf,
    TaskSchema,
    TaskSchemas,
    TriggerTaskDefinition,
    TriggerTaskInput,
} from "./types";
