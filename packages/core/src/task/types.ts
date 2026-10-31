/**
 * Task callback, configuration, definition, and kind-specific types shared by
 * the factories and DAG registration.
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { TriggerRule } from "../trigger-rule";
import type { TASK_KIND_ENUM, TaskKind } from "./kind";

export type { TaskKind } from "./kind";

/**
 * A Standard Schema accepted wherever a task declares its input or output.
 *
 * Valibot schemas satisfy this directly, so `v.object({...})` can be passed
 * without a wrapper.
 */
export type TaskSchema = StandardSchemaV1;

/** A schema, or `undefined` when a task declares none. */
export type AnySchema = TaskSchema | undefined;

/**
 * The schemas a task declares for the value it receives and the value it
 * produces.
 *
 * Both default to `undefined`, meaning the task declares no schema.
 */
export interface TaskSchemas<
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> {
    /**
     * Schema for the value delivered in `ctx.payload`.
     */
    readonly input?: Input;
    /**
     * Schema for the value the task produces.
     */
    readonly output?: Output;
}

/**
 * The value a task receives in `ctx.payload` for an input schema.
 *
 * `undefined` when the task declares no input schema.
 */
export type TaskPayloadOf<Schema> = Schema extends StandardSchemaV1
    ? StandardSchemaV1.InferOutput<Schema>
    : undefined;

/**
 * The value a task produces for an output schema.
 *
 * `unknown` when the task declares no output schema.
 *
 * The schema is extracted rather than matched directly: a definition's
 * `output` is an optional property, so the argument is usually
 * `Schema | undefined`. Distributing over that union would pair the inferred
 * value with the `unknown` fallback and collapse to `unknown`.
 */
export type TaskProducedOf<Schema> = [
    Extract<Schema, StandardSchemaV1>,
] extends [never]
    ? unknown
    : StandardSchemaV1.InferOutput<Extract<Schema, StandardSchemaV1>>;

/**
 * A schema for a value that is only known at the type level.
 *
 * Kind-specific defaults use this to describe their produced value (a branch's
 * chosen names, a sensor's boolean) without requiring a runtime schema.
 */
export type SchemaOf<Value> = StandardSchemaV1<Value, Value>;

/**
 * A task callback with its name, payload, and result erased.
 *
 * `never` in both context positions is assignable to every concrete context, so
 * payload-carrying callbacks still flow into definition unions.
 */
export type AnyTaskFn = TaskFn<never, never, unknown>;

/**
 * Context passed as the first argument to every task callback.
 */
export interface TaskContext<
    TaskName extends string = string,
    Payload = undefined,
> {
    /**
     * Content-derived ID of the registered task.
     */
    readonly id: string;
    /**
     * Name of the task whose callback is running.
     */
    readonly name: TaskName;
    /**
     * Value supplied to the task; typed by the task's input schema.
     */
    readonly payload: Payload;
}

/**
 * A task callback.
 *
 * The task's context comes first; `name` narrows to the task's literal name
 * when a factory infers it, `Payload` comes from the input schema, and the
 * result is checked against the output schema.
 */
export type TaskFn<
    TaskName extends string = string,
    Payload = undefined,
    Result = unknown,
> = (ctx: TaskContext<TaskName, Payload>) => MaybePromise<Result>;

/** A value that may be returned synchronously or as a promise. */
export type MaybePromise<Value> = PromiseLike<Value> | Value;

/** Whitespace trimmed from a task name by the factories. */
type TaskNameWhitespace =
    | " "
    | "\n"
    | "\t"
    | "\r"
    | "\f"
    | "\v"
    | "\u00A0"
    | "\u1680"
    | "\u2000"
    | "\u2001"
    | "\u2002"
    | "\u2003"
    | "\u2004"
    | "\u2005"
    | "\u2006"
    | "\u2007"
    | "\u2008"
    | "\u2009"
    | "\u200A"
    | "\u2028"
    | "\u2029"
    | "\u202F"
    | "\u205F"
    | "\u3000"
    | "\uFEFF";

type TrimTaskNameEnd<Name extends string> =
    Name extends `${infer Rest}${TaskNameWhitespace}`
        ? TrimTaskNameEnd<Rest>
        : Name;

type TrimTaskNameStart<Name extends string> =
    Name extends `${TaskNameWhitespace}${infer Rest}`
        ? TrimTaskNameStart<Rest>
        : Name;

/** The task name after a factory trims surrounding whitespace. */
export type TrimTaskName<Name extends string> = TrimTaskNameStart<
    TrimTaskNameEnd<Name>
>;

/**
 * Per-task execution settings stored on the task; the SDK never interprets them.
 */
export interface TaskConfig {
    /**
     * Optional timeout in milliseconds; stored but not enforced by the SDK.
     */
    timeout_ms?: number;
    /**
     * Additional application-specific settings, stored as-is.
     */
    [key: string]: unknown;
}

/**
 * Optional metadata shared by every task kind.
 */
export interface TaskMetadata {
    /**
     * Optional human-readable description.
     */
    readonly description?: string;
    /**
     * Optional per-task settings; stored but not interpreted by the SDK.
     */
    readonly config?: TaskConfig;
    /**
     * When the task becomes ready; defaults to "all_success".
     */
    readonly triggerRule?: TriggerRule;
}

/**
 * Input to the regular task factory after the name.
 */
export interface TaskParamInput<
    Fn extends AnyTaskFn = AnyTaskFn,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Task callback, invoked with a task context.
     */
    readonly fn: Fn;
}

/**
 * The shape shared by every task definition.
 */
export interface TaskDefinitionBase<
    Name extends string,
    Kind extends TaskKind,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Discriminates the task kind.
     */
    readonly kind: Kind;
    /**
     * Unique name within the owning DAG.
     */
    readonly name: Name;
    /**
     * Normalized trigger rule; always present on a definition.
     */
    readonly triggerRule: TriggerRule;
}

/**
 * A regular task definition; ids are assigned to registered `DAGTask` handles.
 */
export interface TaskParamOutput<
    Name extends string,
    Fn extends AnyTaskFn = TaskFn<Name>,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> extends TaskDefinitionBase<Name, typeof TASK_KIND_ENUM.Task, Input, Output> {
    /**
     * Task callback, invoked with a task context.
     */
    readonly fn: Fn;
}

/**
 * Call signature of `task()`.
 *
 * The name is trimmed; the returned definition has a normalized
 * `triggerRule` and no task ID. `ctx.payload` is typed from `input`, and the
 * callback result is checked against `output`.
 */
export type CreateTask = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
    Fn extends TaskFn<
        TrimTaskName<Name>,
        TaskPayloadOf<Input>,
        TaskProducedOf<Output>
    > = TaskFn<
        TrimTaskName<Name>,
        TaskPayloadOf<Input>,
        TaskProducedOf<Output>
    >,
>(
    name: Name,
    params: TaskParamInput<Fn, Input, Output>
) => TaskParamOutput<TrimTaskName<Name>, Fn, Input, Output>;

/**
 * Predicate polled by a sensor until it returns true.
 */
export type SensorPredicate<
    Name extends string = string,
    Payload = undefined,
> = (ctx: TaskContext<Name, Payload>) => MaybePromise<boolean>;

/**
 * Input to the sensor factory after the name.
 */
export interface SensorTaskInput<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Predicate evaluated by the sensor.
     */
    readonly predicate: SensorPredicate<Name, TaskPayloadOf<Input>>;
    /**
     * Delay between predicate evaluations in milliseconds.
     */
    readonly pokeIntervalMs?: number;
}

/**
 * A sensor task definition.
 *
 * A sensor produces a boolean when no output schema is declared, since its
 * result is whether the predicate became true.
 */
export interface SensorTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
> extends TaskDefinitionBase<
    Name,
    typeof TASK_KIND_ENUM.Sensor,
    Input,
    Output
> {
    /**
     * Predicate evaluated by the sensor.
     */
    readonly predicate: SensorPredicate<Name, TaskPayloadOf<Input>>;
    /**
     * Delay between predicate evaluations in milliseconds.
     */
    readonly pokeIntervalMs?: number;
}

/**
 * Call signature of `sensor()`.
 */
export type CreateSensor = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
>(
    name: Name,
    input: SensorTaskInput<TrimTaskName<Name>, Input, Output>
) => SensorTaskDefinition<TrimTaskName<Name>, Input, Output>;

/**
 * Input to the delay factory after the name.
 */
export interface DelayTaskInput<
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Delay duration in milliseconds.
     */
    readonly durationMs: number;
}

/**
 * A delay task definition.
 *
 * A delay declares no schemas by default; it produces no value of its own.
 */
export interface DelayTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> extends TaskDefinitionBase<Name, typeof TASK_KIND_ENUM.Delay, Input, Output> {
    /**
     * Delay duration in milliseconds.
     */
    readonly durationMs: number;
}

/**
 * Call signature of `delay()`.
 */
export type CreateDelay = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>(
    name: Name,
    input: DelayTaskInput<Input, Output>
) => DelayTaskDefinition<TrimTaskName<Name>, Input, Output>;

/**
 * A branch name, or a set of branch names.
 */
export type BranchChoice<BranchName extends string> =
    | BranchName
    | readonly BranchName[];

/**
 * Chooses the downstream branch or branches for a branch task.
 */
export type BranchChooser<
    Name extends string = string,
    BranchName extends string = string,
    Payload = undefined,
> = (ctx: TaskContext<Name, Payload>) => MaybePromise<BranchChoice<BranchName>>;

/**
 * Input to the branch factory after the name.
 */
export interface BranchTaskInput<
    Name extends string = string,
    Branches extends readonly string[] = readonly string[],
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<BranchChoice<Branches[number]>>,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Branch names this task may choose; inferred as a literal tuple so the
     * chooser and the produced value narrow to those names.
     */
    readonly branches?: Branches;
    /**
     * Chooses the branch or branches to run.
     */
    readonly choose: BranchChooser<
        Name,
        Branches[number],
        TaskPayloadOf<Input>
    >;
}

/**
 * A branch task definition.
 *
 * A branch produces the branch name or names it chose when no output schema is
 * declared.
 */
export interface BranchTaskDefinition<
    Name extends string = string,
    Branches extends readonly string[] = readonly string[],
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<BranchChoice<Branches[number]>>,
> extends TaskDefinitionBase<
    Name,
    typeof TASK_KIND_ENUM.Branch,
    Input,
    Output
> {
    /**
     * Branch names this task may choose.
     */
    readonly branches?: Branches;
    /**
     * Chooses the branch or branches to run.
     */
    readonly choose: BranchChooser<
        Name,
        Branches[number],
        TaskPayloadOf<Input>
    >;
}

/**
 * Call signature of `branch()`.
 */
export type CreateBranch = <
    const Name extends string,
    const Branches extends readonly string[] = readonly string[],
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<BranchChoice<Branches[number]>>,
>(
    name: Name,
    input: BranchTaskInput<TrimTaskName<Name>, Branches, Input, Output>
) => BranchTaskDefinition<TrimTaskName<Name>, Branches, Input, Output>;

/**
 * Condition evaluated by a short-circuit task.
 */
export type ShortCircuitCondition<
    Name extends string = string,
    Payload = undefined,
> = (ctx: TaskContext<Name, Payload>) => MaybePromise<boolean>;

/**
 * Input to the short-circuit factory after the name.
 */
export interface ShortCircuitTaskInput<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Condition that controls whether downstream tasks run.
     */
    readonly condition: ShortCircuitCondition<Name, TaskPayloadOf<Input>>;
}

/**
 * A short-circuit task definition.
 *
 * A short-circuit produces a boolean when no output schema is declared, since
 * its result is whether downstream tasks should run.
 */
export interface ShortCircuitTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
> extends TaskDefinitionBase<
    Name,
    typeof TASK_KIND_ENUM.ShortCircuit,
    Input,
    Output
> {
    /**
     * Condition that controls whether downstream tasks run.
     */
    readonly condition: ShortCircuitCondition<Name, TaskPayloadOf<Input>>;
}

/**
 * Call signature of `shortCircuit()`.
 */
export type CreateShortCircuit = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<boolean>,
>(
    name: Name,
    input: ShortCircuitTaskInput<TrimTaskName<Name>, Input, Output>
) => ShortCircuitTaskDefinition<TrimTaskName<Name>, Input, Output>;

/**
 * Input to the trigger factory after the name.
 */
export interface TriggerTaskInput<
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>
    extends TaskMetadata, TaskSchemas<Input, Output> {
    /**
     * Name of the DAG to trigger.
     */
    readonly dagName: string;
    /**
     * Whether the trigger waits for the target DAG to finish; defaults to false.
     */
    readonly waitForCompletion?: boolean;
}

/**
 * A trigger task definition.
 */
export interface TriggerTaskDefinition<
    Name extends string = string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
> extends TaskDefinitionBase<
    Name,
    typeof TASK_KIND_ENUM.Trigger,
    Input,
    Output
> {
    /**
     * Name of the DAG to trigger.
     */
    readonly dagName: string;
    /**
     * Whether the trigger waits for the target DAG to finish.
     */
    readonly waitForCompletion: boolean;
}

/**
 * Call signature of `trigger()`.
 */
export type CreateTrigger = <
    const Name extends string,
    Input extends AnySchema = undefined,
    Output extends AnySchema = undefined,
>(
    name: Name,
    input: TriggerTaskInput<Input, Output>
) => TriggerTaskDefinition<TrimTaskName<Name>, Input, Output>;

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
