# Behavior Preservation

Use this file when deciding **whether** a simplification is safe to apply.

## Non-Negotiable Promise

`simplify` preserves exact behavior. If the edit would change outputs, public contracts, ordering, validation rules, side effects, or security posture, it is not a simplification pass.

## Verification Hierarchy

Use the strongest available signal, but always explain what you relied on.

| Level | Use When Available | What to Confirm |
|-------|--------------------|-----------------|
| **Existing tests** | The target already has tests | Behavior still matches before/after |
| **Targeted checks** | A narrow build/test/lint command exists for the touched surface | The edited scope still compiles, runs, or formats correctly |
| **Type/interface checks** | Strong typing or interface contracts exist | Inputs, outputs, and contracts are unchanged |
| **Invariant reasoning** | No automation exists | Branch behavior, side effects, and error boundaries are unchanged |
| **Manual explanation** | Last resort | State clearly what was not verified and why the edit is still low risk |

Prefer the narrowest relevant existing validation. Do not invent new tooling.

## Stop Conditions

Pause and ask instead of editing when simplification would touch:

| Risk | Why it stops the pass |
|------|-----------------------|
| Public API shape | Callers may depend on the current contract |
| Validation rules | "Cleaner" often hides a behavior change |
| Error semantics | Different exceptions, status codes, or log paths change behavior |
| Ordering guarantees | Reordered side effects are semantic changes |
| Security or permission checks | These are correctness changes, not simplification |
| Concurrency or transaction boundaries | Timing and isolation changes are behavior changes |
| Generated, vendor, or framework-owned files | The right fix is usually elsewhere |

## Approval Boundaries

Ask before applying when:

- the target scope is ambiguous
- the edit would cross more than one module boundary
- the work spans 6+ files
- a "simpler" shape removes an abstraction that clearly encodes policy
- the request smells like review, debugging, debt analysis, or performance work
- verification is weaker than invariant reasoning on a clearly bounded target
- the request mixes a pasted snippet with file-backed code and the true edit scope is unclear

When the proof is weak, prefer `analyze` over `apply`. If even analysis depends on
unstated assumptions, ask instead of inferring behavior.

## Safe Simplification Loop

1. Identify the smallest confusing area.
2. State the behavior that must remain unchanged.
3. Choose the least invasive transformation from `simplification-taxonomy.md`.
4. Make one coherent pass, not a mixed cleanup sweep.
5. Verify using the strongest available signal.
6. Summarize what changed, why it is simpler, and what stayed the same.

## Recent-Scope Default

Default to the current diff, current task, or explicit target. Avoid wandering into untouched code unless the simplification is impossible without a directly adjacent change.

## What Counts as "Too Risky"

The following frequently masquerade as simplification but are out of scope:

- collapsing error handling paths that produce different user-visible outcomes
- replacing custom logic with a helper that normalizes data differently
- removing "redundant" checks that actually enforce security or invariants
- changing async/sequential ordering for readability alone
- widening or narrowing accepted inputs while cleaning up parsing

When in doubt, explain the trade-off and stop short of editing.
