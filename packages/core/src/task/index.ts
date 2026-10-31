/**
 * Public surface of the task module.
 *
 * Exports the factories, the kind enum, and the definition types. Internal
 * helpers (`taskMetadata`, `normalizeTaskName`, `taskBehaviorSource`, and the
 * duration assertions) stay module-private so importing this barrel never
 * widens the package's API.
 */

export { branch } from "./factories/branch";

export { delay } from "./factories/delay";

export { sensor } from "./factories/sensor";

export { shortCircuit } from "./factories/short-circuit";

export { task } from "./factories/task";

export { trigger } from "./factories/trigger";

export { TASK_KIND_ENUM } from "./kind";

export type { TaskKind } from "./kind";

export type {
    AnySchema,
    AnyTaskFn,
    MaybePromise,
    SchemaOf,
    TaskConfig,
    TaskContext,
    TaskDefinitionBase,
    TaskFn,
    TaskMetadata,
    TaskPayloadOf,
    TaskProducedOf,
    TaskSchema,
    TaskSchemas,
} from "./types/base";

export type {
    AnyBranchTaskDefinition,
    AnyDelayTaskDefinition,
    AnySensorTaskDefinition,
    AnyShortCircuitTaskDefinition,
    AnyTaskDefinition,
    AnyTriggerTaskDefinition,
    RegisteredTaskDefinition,
} from "./types/definitions";

export type {
    BranchChoice,
    BranchChooser,
    BranchTaskDefinition,
    BranchTaskInput,
    CreateBranch,
} from "./types/branch";

export type {
    CreateDelay,
    DelayTaskDefinition,
    DelayTaskInput,
} from "./types/delay";

export type {
    CreateSensor,
    SensorPredicate,
    SensorTaskDefinition,
    SensorTaskInput,
} from "./types/sensor";

export type {
    CreateShortCircuit,
    ShortCircuitCondition,
    ShortCircuitTaskDefinition,
    ShortCircuitTaskInput,
} from "./types/short-circuit";

export type { CreateTask, TaskParamInput, TaskParamOutput } from "./types/task";

export type {
    CreateTrigger,
    TriggerTaskDefinition,
    TriggerTaskInput,
} from "./types/trigger";
