/** Detect cycles in a graph audit. */

import { quoteNames } from "../format";
import type { DAGTask } from "../registered-task";
import { DAG_VIOLATION_ENUM } from "./violation";
import type { DAGViolation } from "./violation";

/** One task on the depth-first path, plus how far its children were walked. */
interface Frame {
    readonly task: DAGTask;
    readonly children: readonly DAGTask[];
    index: number;
}

/**
 * Report one violation per simple cycle in the graph.
 *
 * Each cycle is emitted once, at the back edge that closes it: a task is
 * explored once, then closed and never re-entered, so no cycle can be found
 * from two entry points. Distinct cycles that share tasks are separate
 * findings, because each closes on its own back edge.
 */
export function findCycleViolations(
    dagName: string,
    tasks: readonly DAGTask[],
    registered: ReadonlySet<DAGTask>
): DAGViolation[] {
    const violations: DAGViolation[] = [];
    const open = new Set<DAGTask>();
    const closed = new Set<DAGTask>();

    for (const root of tasks) {
        if (open.has(root) || closed.has(root)) {
            continue;
        }

        const frames: Frame[] = [];

        const enter = (task: DAGTask): void => {
            open.add(task);
            frames.push({
                task,
                children: [...task.downstream].filter(
                    (child) =>
                        child !== task &&
                        registered.has(child) &&
                        !closed.has(child)
                ),
                index: 0,
            });
        };

        enter(root);

        while (frames.length > 0) {
            const frame = frames.at(-1);

            if (frame === undefined) {
                break;
            }

            if (frame.index >= frame.children.length) {
                open.delete(frame.task);
                closed.add(frame.task);
                frames.pop();
                continue;
            }

            const child = frame.children[frame.index];
            frame.index += 1;

            if (closed.has(child)) {
                continue;
            }

            if (!open.has(child)) {
                enter(child);
                continue;
            }

            const start = frames.findIndex((entry) => entry.task === child);

            const cycle = [
                ...frames.slice(start).map((entry) => entry.task),
                child,
            ];

            violations.push({
                code: DAG_VIOLATION_ENUM.Cycle,
                message: `DAG "${dagName}" contains a cycle: ${quoteNames(
                    cycle.map((task) => task.name)
                )}`,
                subjects: cycle.map((task) => task.name),
            });
        }
    }

    return violations;
}
