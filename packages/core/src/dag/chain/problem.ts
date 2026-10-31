/**
 * Public type-level entry points for `DAG.chain()` and `DAG.parse()`.
 *
 * Direction is deliberately not checked in `ParseProblem`: TypeScript cannot
 * read the literal `>>`/`<<` segments, so cycles, self edges, and branch
 * routing stay runtime checks.
 */

import type {
    CheckBranches,
    FindBranchProblem,
    NextBranches,
} from "./branches";
import type { AddChainEdges, FindChainCycle } from "./edges";
import type {
    ChainGroup,
    FlattenGroups,
    HasBroadNames,
    TooManyGroups,
} from "./shared";
import type { RegisterAll } from "./signatures";

/**
 * `true` when a wiring expression registers no conflicting signature or branch
 * set, otherwise the error message.
 */
export type ParseProblem<
    DagName extends string,
    Signatures,
    Branches,
    Operands extends readonly ChainGroup[],
> =
    HasBroadNames<Operands> extends true
        ? true
        : TooManyGroups<Operands> extends true
          ? true
          : CheckBranches<DagName, Branches, Operands> extends infer BranchError
            ? BranchError extends string
                ? BranchError
                : RegisterAll<
                        Signatures,
                        FlattenGroups<Operands>,
                        DagName
                    > extends infer Next
                  ? Next extends string
                      ? Next
                      : true
                  : never
            : never;

/**
 * `true` when the wiring set sequence is valid, otherwise the error message.
 */
export type ChainProblem<
    DagName extends string,
    Signatures,
    Edges,
    Branches,
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
                : CheckBranches<
                        DagName,
                        Branches,
                        Groups
                    > extends infer BranchError
                  ? BranchError extends string
                      ? BranchError
                      : FindBranchProblem<
                              NextBranches<DagName, Branches, Groups>,
                              Groups
                          > extends infer BranchProblem
                        ? BranchProblem extends string
                            ? BranchProblem
                            : RegisterAll<
                                    Signatures,
                                    FlattenGroups<Groups>,
                                    DagName
                                > extends infer Next
                              ? Next extends string
                                  ? Next
                                  : true
                              : never
                        : never
                  : never
            : never;
