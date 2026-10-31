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
