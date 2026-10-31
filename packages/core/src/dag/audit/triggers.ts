/** Audit trigger tasks that target their own DAG. */

import { TASK_KIND_ENUM } from "../../task/kind";
import type { DAGTask } from "../registered-task";
import { DAG_VIOLATION_ENUM } from "./violation";
import type { DAGViolation } from "./violation";

/**
 * Report trigger tasks that start the DAG containing them.
 *
 * A trigger task names a target DAG, so a task pointing at its own DAG starts
 * a copy of itself; the SDK does not run DAGs, but no scheduler can execute
 * that request. The target name is compared after trimming, matching how
 * `createDAG` treats a name.
 */
export function findTriggerViolations(
    dagName: string,
    tasks: readonly DAGTask[]
): DAGViolation[] {
    const violations: DAGViolation[] = [];
    const target = dagName.trim();

    for (const task of tasks) {
        const { definition } = task;

        if (definition.kind !== TASK_KIND_ENUM.Trigger) {
            continue;
        }

        if (definition.dagName.trim() === target) {
            violations.push({
                code: DAG_VIOLATION_ENUM.SelfTrigger,
                message: `Trigger task "${task.name}" starts DAG "${target}", which contains it`,
                subjects: [task.name, target],
            });
        }
    }

    return violations;
}
