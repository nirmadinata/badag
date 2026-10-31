/**
 * Graph audit: read a DAG and report every structural problem without throwing.
 */

import type { DAGTask } from "../registered-task";
import { findBranchViolations } from "./branches";
import { findCycleViolations } from "./cycles";
import { findEdgeViolations } from "./edges";
import { findTriggerViolations } from "./triggers";
import type { DAGViolation } from "./violation";

/**
 * Return every violation in a graph, in registration order.
 *
 * Pure: the graph is only read, so calling this is always safe and never
 * throws. Edges are reported before cycles and branch findings.
 */
export function findViolations(
    dagName: string,
    tasks: readonly DAGTask[]
): readonly DAGViolation[] {
    const registered = new Set(tasks);

    return [
        ...findEdgeViolations(dagName, tasks, registered),
        ...findCycleViolations(dagName, tasks, registered),
        ...findBranchViolations(tasks, registered),
        ...findTriggerViolations(dagName, tasks),
    ];
}
