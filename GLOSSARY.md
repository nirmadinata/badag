# Badag

A TypeScript SDK for declaring task graphs, wiring dependencies, and finding tasks ready to run.

## Language

**DAG**: A named directed acyclic graph whose nodes are tasks and whose edges are execution dependencies. _Avoid_: workflow, pipeline

**Task definition**: A name, behavior, and optional metadata declared before the task belongs to any DAG. _Avoid_: task spec, task template, unregistered task

**Task metadata**: The optional, non-behavioral part of a task definition — description, config, trigger rule, and kind-specific timing such as a polling interval. Metadata never affects task identity. _Avoid_: options, settings, attributes

**Behavior source**: The declared behavior of a task definition: its callback for callback kinds, its declared fields for declarative kinds. Two definitions with the same name and behavior source are the same task, whatever their metadata. _Avoid_: behavior, body, implementation

**Payload**: The value a task receives, delivered in `ctx.payload` and typed by its input schema. Without an input schema the payload is `undefined`. _Avoid_: argument, params, data

**Input schema**: An optional Standard Schema declared on a task that types its payload. The SDK stores it but never validates the payload against it. _Avoid_: validator, parser, params schema

**Output schema**: An optional Standard Schema declared on a task that constrains the value the task produces. Kinds with a fixed result carry a default output schema, which is a type-level description only — the task declares no schema at runtime. _Avoid_: result schema, return type

**Produced value**: The value a task yields, typed by its output schema. Without one the value is `unknown`. _Avoid_: result, return value, output

**Task kind**: The category that determines how a task behaves and which kind-specific metadata it carries. _Avoid_: task type, operator

**Sensor task**: A task that polls a predicate until it returns true. _Avoid_: poller, watcher

**Delay task**: A task that waits for a fixed duration before completing. _Avoid_: sleep task, timer task

**Branch task**: A task that chooses one or more named branches for a scheduler to follow. _Avoid_: router, switch

**Declared branch**: A branch name listed in a branch task's `branches` set, which the wiring step immediately after that task must route to exactly. A branch task with no declared branches is unconstrained. _Avoid_: branch target, branch child, branch task

**Short-circuit task**: A task whose condition tells a scheduler whether downstream tasks should run. _Avoid_: gate, guard

**Trigger task**: A task that starts another DAG, optionally waiting for that DAG to finish. _Avoid_: child DAG task, launcher

**Registered task**: A task definition attached to a specific DAG, with a task ID and any dependency edges. _Avoid_: node, vertex, job

**Task name**: The unique human-readable name of a task within one DAG; uniqueness is scoped to that DAG. _Avoid_: label, slug, key

**Task ID**: An identifier derived from a task definition's name and behavior source; metadata does not affect it, and the same name and behavior produce the same task ID in every DAG within one build. _Avoid_: content hash, content id, UUID

**Dependency edge**: A directed requirement that an upstream task finish before a downstream task becomes ready. Cycles are invalid. _Avoid_: link, connection

**Upstream task**: A task that must finish before a given task becomes ready. _Avoid_: parent, predecessor

**Downstream task**: A task that becomes ready only after a given task finishes. _Avoid_: child, successor

**Wiring set**: A set of tasks treated as one side of dependency wiring; every task in the set is wired to every task in the adjacent set, while membership in the same set implies no edge between its tasks. Wiring requires tasks on both sides. _Avoid_: task group, group, batch, stage

**Completion**: The fact that a task has finished executing; completion is supplied as a set of task IDs and carries no success, failure, or skip outcome. _Avoid_: done, terminal state

**Ready task**: A task that has not completed and whose upstream tasks have all completed. Readiness is structural and ignores trigger rules. _Avoid_: runnable task, eligible task

**Trigger rule**: A declared condition under which a scheduler may run a task, expressed in terms of upstream outcomes; the DAG stores it but does not evaluate it. _Avoid_: readiness rule, run condition

**Duplicate definition**: A task definition whose task ID and name match a task already registered in the same DAG. Registering it reuses the existing registered task: the first registration's metadata is kept and the duplicate's metadata is discarded. _Avoid_: duplicate task, repeated task

**Task name collision**: A task definition whose name matches another task in the same DAG but whose task ID differs; registration is rejected. _Avoid_: duplicate name

**Task ID collision**: A task definition whose task ID matches a task already registered in the same DAG but whose name differs; registration is rejected. Effectively unreachable: because the name is part of the ID, a definition that reuses an ID under a new name has no ordinary cause. _Avoid_: duplicate ID
