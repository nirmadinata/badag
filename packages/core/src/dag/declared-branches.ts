/** Read branch declarations from a registered task. */

import { TASK_KIND_ENUM } from "../task/kind";
import type { DAGTask } from "./registered-task";

/**
 * The declared branch names of a branch task.
 *
 * `undefined` for every other kind, and for a branch that declares no
 * `branches` set — an undeclared branch set means the wiring is unchecked.
 */
export function declaredBranches(task: DAGTask): readonly string[] | undefined {
    const { definition } = task;

    return definition.kind === TASK_KIND_ENUM.Branch
        ? definition.branches
        : undefined;
}
