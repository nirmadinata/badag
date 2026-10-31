import { TASK_KIND_ENUM } from "@/task/kind";

import type { DAGTask } from "./dag-task";

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

export function quoteNames(names: readonly string[]): string {
    return names.map((name) => `"${name}"`).join(", ");
}

/**
 * Assert that one wiring step matches every declared branch set on its
 * upstream side.
 *
 * A branch task declares the branch names a scheduler may follow, so its
 * direct downstream tasks must name exactly those branches. Both directions
 * are checked: routing to an undeclared task, and declaring a branch the
 * branch task does not route to.
 *
 * `routed` holds the downstream tasks the enclosing batch plans to add, so
 * branches wired by an earlier call still count; that keeps repeating a
 * successful wiring call a no-op instead of an error. Downstream tasks are
 * never inspected: a branch constrains what it routes to, not what those
 * tasks then require.
 */
export function assertBranchWiring(
    sources: readonly DAGTask[],
    added: readonly DAGTask[],
    routed: ReadonlyMap<DAGTask, ReadonlySet<DAGTask>>
): void {
    if (added.length === 0) {
        return;
    }

    for (const source of sources) {
        const declared = declaredBranches(source);

        if (declared === undefined) {
            continue;
        }

        for (const target of added) {
            if (declared.includes(target.name)) {
                continue;
            }

            throw new Error(
                declared.length === 0
                    ? `Branch "${source.name}" cannot route to "${target.name}"; it declares no branches`
                    : `Branch "${source.name}" cannot route to "${target.name}"; declared branches are ${quoteNames(declared)}`
            );
        }

        const wired = routed.get(source) ?? source.downstream;

        for (const name of declared) {
            if (![...wired].some((task) => task.name === name)) {
                throw new Error(
                    `Branch "${source.name}" must route to declared branch "${name}"`
                );
            }
        }
    }
}
