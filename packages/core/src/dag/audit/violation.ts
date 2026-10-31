/**
 * Machine-readable categories and the finding shape returned by
 * `DAG.validate()`.
 */

/**
 * Machine-readable category for one `DAG.validate()` finding.
 */
export const DAG_VIOLATION_ENUM = {
    /** An edge joins a task back to one of its own ancestors. */
    Cycle: "cycle",
    /** A task lists itself as an upstream or downstream task. */
    SelfEdge: "self-edge",
    /** An edge endpoint is not registered in this DAG. */
    ForeignEdge: "foreign-edge",
    /** One side of the edge records a dependency the other side does not. */
    InconsistentEdge: "inconsistent-edge",
    /** A branch task declares a branch name it never routes to. */
    UnroutedBranch: "unrouted-branch",
    /** A branch task routes to a task it never declared. */
    UndeclaredBranchTarget: "undeclared-branch-target",
    /** A branch task declares the same branch name more than once. */
    DuplicateDeclaredBranch: "duplicate-declared-branch",
    /** A branch task declares a name that can never be a task name. */
    InvalidDeclaredBranch: "invalid-declared-branch",
    /** A trigger task starts the DAG that contains it. */
    SelfTrigger: "self-trigger",
} as const;

/**
 * A category reported by `DAG.validate()`.
 */
export type DAGViolationCode =
    (typeof DAG_VIOLATION_ENUM)[keyof typeof DAG_VIOLATION_ENUM];

/**
 * One problem found in a DAG.
 *
 * `subjects` holds the names the finding involves, in the order the message
 * names them. Every entry is a task name except in the branch and trigger
 * findings, where the second entry is a declared branch name or a DAG name:
 * both endpoints for an edge, the traversal path (closing task repeated) for a
 * cycle, and `[task, declaredName]` for a branch or trigger finding.
 */
export interface DAGViolation {
    readonly code: DAGViolationCode;
    readonly subjects: readonly string[];
    readonly message: string;
}
