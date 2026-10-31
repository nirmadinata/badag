/** Kahn's algorithm over registered task edges. */

import type { DAGTask } from "./registered-task";

/**
 * Return tasks in a valid topological execution order.
 *
 * Throws when the graph is cyclic, so callers can rely on a complete order.
 */
export function sortTopologically(
    tasks: ReadonlyMap<string, DAGTask>,
    dagName: string
): DAGTask[] {
    const remainingDeps = new Map<DAGTask, number>();
    const ready: DAGTask[] = [];

    for (const task of tasks.values()) {
        remainingDeps.set(task, task.upstream.size);

        if (task.upstream.size === 0) {
            ready.push(task);
        }
    }

    const order: DAGTask[] = [];
    let index = 0;

    while (index < ready.length) {
        const task = ready[index];
        index += 1;

        order.push(task);

        for (const downstream of task.downstream) {
            const remaining = remainingDeps.get(downstream);

            if (remaining === undefined) {
                throw new Error(
                    `Task "${downstream.name}" is not registered in DAG "${dagName}"`
                );
            }

            const nextRemaining = remaining - 1;

            remainingDeps.set(downstream, nextRemaining);

            if (nextRemaining === 0) {
                ready.push(downstream);
            }
        }
    }

    if (order.length !== tasks.size) {
        throw new Error(`DAG "${dagName}" contains a cycle`);
    }

    return order;
}
