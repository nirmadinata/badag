/**
 * Report every self edge, foreign edge, and half-recorded edge.
 */

import type { DAGTask } from "../registered-task";
import { DAG_VIOLATION_ENUM } from "./violation";
import type { DAGViolation } from "./violation";

/**
 * The two walks report disjoint conditions on the same directed edge: the
 * downstream walk reports a missing upstream record, the upstream walk a
 * missing downstream record, so an edge yields at most one finding.
 *
 * Only `downstream` and `upstream` are read, so the walk sees exactly the
 * graph a scheduler would.
 */
export function findEdgeViolations(
    dagName: string,
    tasks: readonly DAGTask[],
    registered: ReadonlySet<DAGTask>
): DAGViolation[] {
    const violations: DAGViolation[] = [];

    for (const task of tasks) {
        for (const downstream of task.downstream) {
            if (downstream === task) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.SelfEdge,
                    message: `Task "${task.name}" depends on itself`,
                    subjects: [task.name],
                });
                continue;
            }

            if (!registered.has(downstream)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.ForeignEdge,
                    message: `Edge "${task.name}" -> "${downstream.name}" crosses DAG boundaries; "${downstream.name}" is not registered in DAG "${dagName}"`,
                    subjects: [task.name, downstream.name],
                });
                continue;
            }

            if (!downstream.upstream.has(task)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.InconsistentEdge,
                    message: `Edge "${task.name}" -> "${downstream.name}" is recorded on only one side`,
                    subjects: [task.name, downstream.name],
                });
            }
        }

        for (const upstream of task.upstream) {
            if (upstream === task) {
                // The downstream walk reports a self edge from either side;
                // here it is reported only when that side was missing.
                if (!task.downstream.has(task)) {
                    violations.push({
                        code: DAG_VIOLATION_ENUM.SelfEdge,
                        message: `Task "${task.name}" depends on itself`,
                        subjects: [task.name],
                    });
                }

                continue;
            }

            if (!registered.has(upstream)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.ForeignEdge,
                    message: `Edge "${upstream.name}" -> "${task.name}" crosses DAG boundaries; "${upstream.name}" is not registered in DAG "${dagName}"`,
                    subjects: [upstream.name, task.name],
                });
                continue;
            }

            if (!upstream.downstream.has(task)) {
                violations.push({
                    code: DAG_VIOLATION_ENUM.InconsistentEdge,
                    message: `Edge "${upstream.name}" -> "${task.name}" is recorded on only one side`,
                    subjects: [upstream.name, task.name],
                });
            }
        }
    }

    return violations;
}
