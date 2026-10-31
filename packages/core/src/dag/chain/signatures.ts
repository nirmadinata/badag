/** Type-level registration of task signatures for `DAG.chain()`. */

import type { TaskFn } from "../../task/types/base";
import type {
    ChainGroup,
    ChainTask,
    DuplicateTaskMessage,
    Equal,
    FlattenGroups,
    HasBroadNames,
    IsBroadFn,
    TaskFnOf,
    TaskNameOf,
    TooManyGroups,
} from "./shared";

/** Successful registration of a definition signature. */
interface RegistrationOk<Signatures> {
    readonly error: never;
    readonly signatures: Signatures;
}

/** Failed registration; the message mirrors the runtime error. */
interface RegistrationError<Message extends string> {
    readonly error: Message;
    readonly signatures: never;
}

/**
 * Register one task signature.
 *
 * Handles exposed by the SDK carry `TaskFn`, so they are treated as opaque and
 * only contribute edges. A definition (or a handle with a known function type)
 * already registered with an equal signature is reused; a different signature
 * is the duplicate error.
 */
type RegisterTask<DagName extends string, Signatures, Task extends ChainTask> =
    IsBroadFn<TaskFnOf<Task>> extends true
        ? RegistrationOk<Signatures>
        : TaskNameOf<Task> extends infer TaskName extends string
          ? TaskName extends keyof Signatures
              ? IsBroadFn<Signatures[TaskName] & TaskFn> extends true
                  ? RegistrationOk<Signatures>
                  : Equal<TaskFnOf<Task>, Signatures[TaskName]> extends true
                    ? RegistrationOk<Signatures>
                    : RegistrationError<DuplicateTaskMessage<DagName, TaskName>>
              : RegistrationOk<
                    Signatures & {
                        readonly [Name in TaskName]: TaskFnOf<Task>;
                    }
                >
          : RegistrationOk<Signatures>;

/** Register every definition in a flattened chain, stopping at the first error. */
export type RegisterAll<
    Signatures,
    Tasks extends readonly ChainTask[],
    DagName extends string,
> = Tasks extends readonly [
    infer Task extends ChainTask,
    ...infer Rest extends readonly ChainTask[],
]
    ? RegisterTask<DagName, Signatures, Task> extends {
          readonly error: infer Error;
          readonly signatures: infer Next;
      }
        ? [Error] extends [never]
            ? RegisterAll<Next, Rest, DagName>
            : Error
        : never
    : Signatures;

export type NextSignatures<
    DagName extends string,
    Signatures,
    Groups extends readonly ChainGroup[],
> =
    HasBroadNames<Groups> extends true
        ? Signatures
        : TooManyGroups<Groups> extends true
          ? Signatures
          : RegisterAll<
                  Signatures,
                  FlattenGroups<Groups>,
                  DagName
              > extends infer Next
            ? Next extends string
                ? Signatures
                : Next
            : Signatures;
