# Simplification Taxonomy

Use this file when deciding **what** to simplify.

The simplify promise is narrow: improve clarity, consistency, and maintainability while preserving exact behavior. Prefer obvious structure over compact cleverness.

## Categories

| Category | Look for | Prefer | Avoid |
|----------|----------|--------|-------|
| **Control flow complexity** | deep nesting, repeated branch conditions, nested ternaries, dense boolean expressions | guard clauses, one obvious happy path, extracted helpers only when they reduce noise | reordering side effects, collapsing branches that differ in behavior |
| **Pass-through indirection** | wrappers that only delegate, layers that forward data unchanged, one-use abstractions | inline the wrapper, collapse the indirection, keep the meaningful boundary | deleting boundaries that enforce policy, validation, or ownership |
| **State and parameter sprawl** | redundant state, derivable caches, too many flags/params, values mirrored in multiple places | derive state once, group related inputs, remove duplicate plumbing | changing lifecycle timing, mutability, or cache invalidation semantics |
| **Repetition and ceremony** | duplicate branches, repeated setup/cleanup, obvious comments, stale imports, dead code | shared paths, small helpers, deleting dead material, keeping only "why" comments | broad "cleanup everything" passes detached from the target scope |
| **Hand-rolled mechanics** | manual iteration for stdlib cases, ad hoc parsing/formatting, repeated list/set/map glue | existing helpers, stdlib, already-approved project utilities | adding new dependencies for tiny wins or rewriting stable library behavior |
| **Complexity that looks like perf work** | redundant computation, extra serialization hops, multi-pass logic, needless object churn | the simplest behavior-safe shape, especially when it also removes work | speculative perf rewrites, caching changes, concurrency changes without proof |

## High-Confidence Simplifications

These are usually safe when behavior is preserved:

- flatten nested conditionals into guard clauses
- remove dead code, dead imports, and dead comments
- inline single-use wrappers or pass-through abstractions
- extract duplicate logic across sibling branches into one shared path
- rename opaque variables and helper names to match intent
- replace hand-rolled mechanics with existing helpers or stdlib equivalents
- remove extension points or config branches that never vary in practice

## Medium-Risk Simplifications

These often help, but need closer review:

- merging or splitting functions
- changing where validation happens while claiming behavior is unchanged
- simplifying state machines or async flows
- consolidating error handling paths
- collapsing modules or moving logic across files

Use `references/behavior-preservation.md` before applying these.

## Signals From `honest-review`

The local `honest-review` skill already surfaces useful simplify heuristics:

- remove dead code, unused imports, and unreachable branches
- remove defensive checks for impossible states
- flatten complex conditionals into guard clauses
- remove wrappers that only delegate to a single implementation
- remove abstractions with only one concrete use
- collapse unnecessary layers of indirection
- replace reimplemented logic with stdlib or existing dependency equivalents
- eliminate pass-through plumbing where data flows unchanged across layers

Treat those heuristics as candidate transformations, not automatic edits.

## Anti-Patterns

Do not call the work "simplification" when it is actually:

- a bug fix
- a feature addition
- a validation rule change
- a permissions or security change
- a caching, concurrency, or topology redesign
- a repo-wide style sweep

If the best "simplification" would change semantics, stop and explain why.

## Choosing the Smallest Useful Move

Prefer the first transformation that meaningfully reduces cognitive load:

1. delete dead or redundant material
2. flatten control flow
3. collapse pass-through layers
4. unify duplicated paths
5. rename for intent
6. only then consider structural extraction or larger reshaping

Smaller, obvious wins beat grand refactors.
