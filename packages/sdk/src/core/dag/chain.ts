/**
 * Type-level chain bookkeeping for `DAG.chain()`.
 *
 * A DAG carries the signatures of the definitions registered through
 * `chain()` and the edges added by it. `chain()` intersects its arguments with
 * a computed error string when a duplicate definition or an edge that closes a
 * cycle would be introduced, so invalid calls fail to typecheck. Names typed as
 * plain `string` (generic helpers) skip the checks.
 */

import type { TaskFn } from "@/core/task/types";

/** The structural shape the chain checks need from a handle or definition. */
interface ChainTask {
    readonly name: string;
}

/** A task, or a wiring set. */
type ChainGroup = ChainTask | readonly ChainTask[];

type TaskNameOf<Task> = Task extends {
    readonly name: infer TaskName extends string;
}
    ? TaskName
    : never;

type TaskFnOf<Task> = Task extends {
    readonly fn: infer Fn extends TaskFn<never>;
}
    ? Fn
    : TaskFn<never>;

type GroupNames<Group> = TaskNameOf<
    Group extends readonly (infer Task)[] ? Task : Group
>;

/** All argument names, including names inside wiring sets. */
type FlattenGroups<Groups extends readonly ChainGroup[]> =
    Groups extends readonly [
        infer Group extends ChainGroup,
        ...infer Rest extends readonly ChainGroup[],
    ]
        ? [
              ...(Group extends readonly ChainTask[] ? Group : [Group]),
              ...FlattenGroups<Rest>,
          ]
        : [];

type HasBroadNames<Groups extends readonly ChainGroup[]> =
    string extends GroupNames<Groups[number]> ? true : false;

/**
 * Type-level graph walking is bounded. TypeScript hits its instantiation
 * depth around 46 wiring sets, so calls with more than 40 positional wiring
 * sets skip the static checks and rely on runtime validation.
 */
type StaticCheckLength =
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40;

type TooManyGroups<Groups extends readonly ChainGroup[]> =
    Groups["length"] extends StaticCheckLength ? false : true;

type Equal<Left, Right> =
    (<Value>() => Value extends Left ? 1 : 2) extends <
        Value,
    >() => Value extends Right ? 1 : 2
        ? true
        : false;

/** Add source -> target edges to an adjacency map. */
type AddEdges<Edges, Sources extends string, Targets extends string> = {
    readonly [Name in keyof Edges | Sources]: Name extends Sources
        ? (Name extends keyof Edges ? Edges[Name] : never) | Targets
        : Name extends keyof Edges
          ? Edges[Name]
          : never;
};

/** Add the edges implied by consecutive wiring sets. */
type AddChainEdges<
    Edges,
    Groups extends readonly ChainGroup[],
> = Groups extends readonly [
    infer Group extends ChainGroup,
    infer Next extends ChainGroup,
    ...infer Rest extends readonly ChainGroup[],
]
    ? AddChainEdges<
          AddEdges<Edges, GroupNames<Group>, GroupNames<Next>>,
          [Next, ...Rest]
      >
    : Edges;

/** Whether `From` reaches any name in `Targets` through `Edges`. */
type ReachesAny<
    Edges,
    From extends string,
    Targets extends string,
    Seen extends string = never,
> = From extends Seen
    ? false
    : From extends Targets
      ? true
      : From extends keyof Edges
        ? true extends {
              [Task in Edges[From] & string]: ReachesAny<
                  Edges,
                  Task,
                  Targets,
                  Seen | From
              >;
          }[Edges[From] & string]
            ? true
            : false
        : false;

type AnyReaches<
    Edges,
    From extends string,
    Targets extends string,
> = true extends {
    [Task in From]: ReachesAny<Edges, Task, Targets>;
}[From]
    ? true
    : false;

/** Return a cycle message when any consecutive pair closes a cycle. */
type FindChainCycle<
    Edges,
    Groups extends readonly ChainGroup[],
> = Groups extends readonly [
    infer Group extends ChainGroup,
    infer Next extends ChainGroup,
    ...infer Rest extends readonly ChainGroup[],
]
    ? Extract<GroupNames<Group>, GroupNames<Next>> extends infer Overlap extends
          string
        ? [Overlap] extends [never]
            ? AnyReaches<
                  Edges,
                  GroupNames<Next>,
                  GroupNames<Group>
              > extends true
                ? `Dependency "${GroupNames<Group> & string}" -> "${GroupNames<Next> & string}" creates a cycle`
                : FindChainCycle<Edges, [Next, ...Rest]>
            : `Task "${Overlap}" cannot depend on itself`
        : never
    : true;

/**
 * Whether a function type is too broad to compare signatures.
 *
 * `TaskFn` assignable to `Fn` means `Fn` exposes no more than the generic task
 * function, so a signature comparison would produce false duplicates.
 */
type IsBroadFn<Fn extends TaskFn<never>> = TaskFn extends Fn ? true : false;

type DagLabel<DagName extends string> = string extends DagName
    ? "this DAG"
    : DagName;

type DuplicateTaskMessage<
    DagName extends string,
    TaskName extends string,
> = `Task "${TaskName}" already exists in DAG "${DagLabel<DagName>}"`;

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
type RegisterAll<
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

export type NextEdges<Edges, Groups extends readonly ChainGroup[]> =
    HasBroadNames<Groups> extends true
        ? Edges
        : TooManyGroups<Groups> extends true
          ? Edges
          : AddChainEdges<Edges, Groups>;

/**
 * `true` when the wiring set sequence is valid, otherwise the error message.
 */
export type ChainProblem<
    DagName extends string,
    Signatures,
    Edges,
    Groups extends readonly ChainGroup[],
> =
    HasBroadNames<Groups> extends true
        ? true
        : TooManyGroups<Groups> extends true
          ? true
          : FindChainCycle<
                  AddChainEdges<Edges, Groups>,
                  Groups
              > extends infer Cycle
            ? Cycle extends string
                ? Cycle
                : RegisterAll<
                        Signatures,
                        FlattenGroups<Groups>,
                        DagName
                    > extends infer Next
                  ? Next extends string
                      ? Next
                      : true
                  : never
            : never;
