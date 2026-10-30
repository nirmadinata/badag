# Bitshift notation is runtime-validated

`DAG.parse` accepts Airflow-style wiring as a tagged template — `dag.parse`${a} >> ${b} >> ${c}`` — and validates the graph at runtime instead of at compile time. The obstacle is TypeScript, not the design: a tagged template infers the interpolated **values** as literals, but never the literal **segments** that hold the operators. Compiling several candidate signatures (`<const S extends readonly string[]>`, `S & TemplateStringsArray`, `readonly [...S] & TemplateStringsArray`) yields `TemplateStringsArray` or `readonly string[]` for the segments in every case, so the operator sequence — and therefore edge direction — is invisible to the type system. Operands are still typed: each interpolation must be a task or a flat list of tasks, so a string, a number, or a nested list fails to typecheck.

## Consequences

- `parse()` accumulates `Signatures` and `Branches` in the returned DAG type, exactly as `chain()` does. A duplicate definition registered by an earlier `parse()` or `chain()` call is therefore rejected at compile time, and a branch task's declared set is checked for consistency across calls. `ParseProblem` is `ChainProblem` without the cycle, self-edge, and branch-routing checks — the three that need to know which way an edge points.
- `parse()` never populates `Edges`. Operators are invisible to the type system, so any edge state it wrote would be guesswork; a later `chain()` cycle check would then see a graph that looks complete while missing real edges, and silently pass cycles. Leaving `Edges` empty keeps that check's false negatives predictable: it only ever under-reports parse-added edges, and runtime rejects every cycle regardless.
- The asymmetry is deliberate and visible: tasks from `parse()` are in the type system, edges are not.
- Every graph guarantee `chain()` has at runtime, `parse()` has too: self edges, cycles, cross-DAG handles, duplicate names and IDs, declared branch routing, and all-or-nothing rollback. Only the compile-time half is absent.
- The notation is one expression per call. A newline is an error rather than a statement separator, which keeps the grammar to a single left-associative operator chain and makes "one call, one wiring expression" a rule you can see in the source.
- The parser is a pure function (`parseWiringExpression`) that takes a DAG name, the template segments, and the operands, and returns steps plus the flattened operand list. The DAG feeds those into the same registration and edge-planning path as `chain()`, so the notation cannot drift from the method API.
- Edge steps are applied independently rather than as a chain of consecutive wiring sets, because `a >> b << c` produces two steps that share no direction. `#addEdges` was refactored onto the same batch-of-steps primitive so both paths share cycle planning and branch assertion.

## Considered options

- **Overload `chain` as a tagged template.** Rejected: `chain(...groups)` and `chain\`\`` would share a name with incompatible call shapes, and the returned DAG type would look like it had been statically checked when it had not.
- **A parallel, fully static builder** (`dag.wire(a).to([b, c])`) shipped alongside `parse`. Rejected as a second API surface for a check `chain()` already provides positionally; anyone who needs compile-time cycle detection should use `chain()`.
- **Recover operators by stringifying the raw template** with `String.raw` and `new Function`, or by requiring operators as interpolated values (`${">>"}`). Rejected: the first is not type-safe and breaks under minification; the second destroys the Airflow syntax that motivates the feature.
- **Allow multi-expression templates separated by newlines.** Rejected in favour of one call per expression: a second expression buys little over a second call, and it complicates both the grammar and the error messages.
