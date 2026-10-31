import type { TASK_KIND_ENUM } from "../kind";
import type {
    AnySchema,
    MaybePromise,
    SchemaOf,
    TaskContext,
    TaskDefinitionBase,
    TaskMetadata,
    TaskPayloadOf,
    TaskSchemas,
    TrimTaskName,
} from "./base";

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
