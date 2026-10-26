# Badag

A TypeScript SDK for declaring task graphs, wiring dependencies, and finding tasks ready to run.

## Language

**DAG**: A named directed acyclic graph whose nodes are tasks and whose edges are execution dependencies. _Avoid_: workflow, pipeline

**Task definition**: A name, callback, and optional metadata declared before the task belongs to any DAG. _Avoid_: task spec, task template, unregistered task

**Registered task**: A task definition attached to a specific DAG, with a task ID and any dependency edges. _Avoid_: node, vertex, job

**Task name**: The unique human-readable name of a task within one DAG; uniqueness is scoped to that DAG. _Avoid_: label, slug, key

**Task ID**: A stable identifier derived from a task definition's name and callback source; metadata does not affect it, and the same name and source produce the same task ID in every DAG. _Avoid_: content hash, content id, UUID

**Dependency edge**: A directed requirement that an upstream task finish before a downstream task becomes ready. Cycles are invalid. _Avoid_: link, connection

**Upstream task**: A task that must finish before a given task becomes ready. _Avoid_: parent, predecessor

**Downstream task**: A task that becomes ready only after a given task finishes. _Avoid_: child, successor

**Wiring set**: A set of tasks treated as one side of dependency wiring; every task in the set is wired to every task in the adjacent set, while membership in the same set implies no edge between its tasks. Wiring requires tasks on both sides. _Avoid_: task group, group, batch, stage

**Completion**: The fact that a task has finished executing; completion is supplied as a set of task IDs and carries no success, failure, or skip outcome. _Avoid_: done, terminal state

**Ready task**: A task that has not completed and whose upstream tasks have all completed. Readiness is structural and ignores trigger rules. _Avoid_: runnable task, eligible task

**Trigger rule**: A declared condition under which a scheduler may run a task, expressed in terms of upstream outcomes; the DAG stores it but does not evaluate it. _Avoid_: readiness rule, run condition

**Duplicate definition**: A task definition whose task ID and name match a task already registered in the same DAG; registering it again reuses the existing task. _Avoid_: duplicate task, repeated task

**Task name collision**: A task definition whose name matches another task in the same DAG but whose task ID differs; registration is rejected. _Avoid_: duplicate name

**Task ID collision**: A task definition whose task ID matches a task already registered in the same DAG but whose name differs; registration is rejected. _Avoid_: duplicate ID
