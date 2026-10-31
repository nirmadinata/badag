/** Type-level declared-branch checks for `DAG.chain()`. */

import type {
    ChainGroup,
    ChainTask,
    DuplicateTaskMessage,
    FlattenGroups,
    GroupNames,
    HasBroadNames,
    TaskNameOf,
    TooManyGroups,
} from "./shared";

/**
 * The declared branch names of a task, or `never` when it declares none.
 *
 * A branch whose `branches` set is omitted (or erased by a handle) carries
 * `readonly string[]`; that is not a declaration, so it opts out of the check.
 */
type DeclaredBranchesOf<Task> = "branches" extends keyof Task
    ? Task extends {
          readonly branches?: infer Branches extends readonly string[];
      }
        ? string extends Branches[number]
            ? never
            : Branches
        : never
    : never;

/**
 * Whether two declared branch sets are identical.
 *
 * Order matters: `["us", "eu"]` and `["eu", "us"]` are different behavior
 * sources, so runtime rejects the second as a name collision. The type check
 * must agree, or it would accept a call the runtime throws on.
 */
type SameBranchSet<Left, Right> = Left extends readonly string[]
    ? Right extends readonly string[]
        ? Left extends Right
            ? Right extends Left
                ? true
                : false
            : false
        : false
    : false;

/** Register every declared branch set in a flattened chain. */
type RegisterBranches<
    DagName extends string,
    Branches,
    Tasks extends readonly ChainTask[],
> = Tasks extends readonly [
    infer Task extends ChainTask,
    ...infer Rest extends readonly ChainTask[],
]
    ? DeclaredBranchesOf<Task> extends infer Declared
        ? [Declared] extends [never]
            ? RegisterBranches<DagName, Branches, Rest>
            : TaskNameOf<Task> extends infer TaskName extends string
              ? TaskName extends keyof Branches
                  ? SameBranchSet<Branches[TaskName], Declared> extends true
                      ? RegisterBranches<DagName, Branches, Rest>
                      : DuplicateTaskMessage<DagName, TaskName>
                  : RegisterBranches<
                        DagName,
                        Branches & {
                            readonly [Name in TaskName]: Declared;
                        },
                        Rest
                    >
              : RegisterBranches<DagName, Branches, Rest>
        : never
    : Branches;

export type NextBranches<
    DagName extends string,
    Branches,
    Groups extends readonly ChainGroup[],
> =
    HasBroadNames<Groups> extends true
        ? Branches
        : TooManyGroups<Groups> extends true
          ? Branches
          : RegisterBranches<
                  DagName,
                  Branches,
                  FlattenGroups<Groups>
              > extends infer Next
            ? Next extends string
                ? Branches
                : Next
            : Branches;

type BranchRouteProblem<
    Branches,
    Source extends string,
    Targets extends string,
> = Source extends keyof Branches
    ? Branches[Source] extends infer Declared extends readonly string[]
        ? [Declared[number]] extends [never]
            ? `Branch "${Source}" cannot route to "${Targets & string}"; it declares no branches`
            : [Exclude<Targets, Declared[number]>] extends [never]
              ? [Exclude<Declared[number], Targets>] extends [never]
                  ? true
                  : `Branch "${Source}" must route to declared branch "${Exclude<Declared[number], Targets> & string}"`
              : `Branch "${Source}" cannot route to "${Exclude<Targets, Declared[number]> & string}"; "${Exclude<Targets, Declared[number]> & string}" is not a declared branch`
        : never
    : true;

/**
 * The problem one wiring step has with a declared branch set, or `true`.
 *
 * Downstream tasks are not inspected: a branch constrains what it routes to.
 */
type BranchStepProblem<
    Branches,
    Sources extends string,
    Targets extends string,
> = [Targets] extends [never]
    ? true
    : {
            [Source in Sources]: BranchRouteProblem<Branches, Source, Targets>;
        }[Sources] extends infer Problems
      ? [Extract<Problems, string>] extends [never]
          ? true
          : Extract<Problems, string>
      : never;

/** Return the first branch-wiring message in a wiring set sequence. */
export type FindBranchProblem<
    Branches,
    Groups extends readonly ChainGroup[],
> = Groups extends readonly [
    infer Group extends ChainGroup,
    infer Next extends ChainGroup,
    ...infer Rest extends readonly ChainGroup[],
]
    ? BranchStepProblem<
          Branches,
          GroupNames<Group>,
          GroupNames<Next>
      > extends infer Problem
        ? Problem extends string
            ? Problem
            : FindBranchProblem<Branches, [Next, ...Rest]>
        : never
    : true;

/** The first problem registering a chain's declared branch sets, or `true`. */
export type CheckBranches<
    DagName extends string,
    Branches,
    Groups extends readonly ChainGroup[],
> =
    RegisterBranches<
        DagName,
        Branches,
        FlattenGroups<Groups>
    > extends infer Next
        ? Next extends string
            ? Next
            : true
        : true;
