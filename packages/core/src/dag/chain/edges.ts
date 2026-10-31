/** Type-level edge and cycle tracking for `DAG.chain()`. */

import type {
    ChainGroup,
    GroupNames,
    HasBroadNames,
    TooManyGroups,
} from "./shared";

/** Add source -> target edges to an adjacency map. */
type AddEdges<Edges, Sources extends string, Targets extends string> = {
    readonly [Name in keyof Edges | Sources]: Name extends Sources
        ? (Name extends keyof Edges ? Edges[Name] : never) | Targets
        : Name extends keyof Edges
          ? Edges[Name]
          : never;
};

/** Add the edges implied by consecutive wiring sets. */
export type AddChainEdges<
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
export type FindChainCycle<
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

export type NextEdges<Edges, Groups extends readonly ChainGroup[]> =
    HasBroadNames<Groups> extends true
        ? Edges
        : TooManyGroups<Groups> extends true
          ? Edges
          : AddChainEdges<Edges, Groups>;
