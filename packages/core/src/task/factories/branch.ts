import { taskMetadata } from "../definition/metadata";
import { taskSchemas } from "../definition/schemas";
import { normalizeTaskName } from "../definition/task-name";
import { TASK_KIND_ENUM } from "../kind";
import type { AnySchema, SchemaOf, TrimTaskName } from "../types/base";
import type {
    BranchChoice,
    BranchTaskDefinition,
    BranchTaskInput,
} from "../types/branch";

/**
 * Build a branch task definition.
 *
 * `choose` is stored on the definition and invoked by the task callback with
 * the task context. The returned branch name or names tell the scheduler which
 * downstream task(s) to run; the SDK itself does not prune edges.
 */
export function branch<
    const Name extends string,
    const Branches extends readonly string[] = readonly string[],
    Input extends AnySchema = undefined,
    Output extends AnySchema = SchemaOf<BranchChoice<Branches[number]>>,
>(
    name: Name,
    input: BranchTaskInput<TrimTaskName<Name>, Branches, Input, Output>
): BranchTaskDefinition<TrimTaskName<Name>, Branches, Input, Output> {
    const normalized = normalizeTaskName(name);
    const { branches } = input;

    const definition = {
        kind: TASK_KIND_ENUM.Branch,
        name: normalized,
        choose: input.choose,
        ...taskMetadata(input),
        ...taskSchemas(input),
    } satisfies BranchTaskDefinition<
        TrimTaskName<Name>,
        Branches,
        Input,
        Output
    >;

    return branches === undefined ? definition : { ...definition, branches };
}
