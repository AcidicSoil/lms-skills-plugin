# Plan Consolidation Suite

Three linked Agent Skills for deterministic planning-artifact convergence.

## Skills

1. [Master Plan Consolidator](master-plan-consolidator/SKILL.md) — Extracts source artifacts into an authoritative Master Plan and atomic item register.
2. [Merge Ledger Generator](merge-ledger-generator/SKILL.md) — Converts atomic items into a machine-friendly ledger with provenance, status, conflicts, and convergence actions.
3. [Planning Convergence Editor](planning-convergence-editor/SKILL.md) — Assembles the final Master Plan + Merge Ledger + Next Iteration Focus and validates convergence gates.

## Execution Order

Run the skills in this order when the workflow must do all three jobs:

```text
source_artifacts + optional prior_am + optional iteration_context
  -> master-plan-consolidator
  -> merge-ledger-generator
  -> planning-convergence-editor
  -> final Markdown document
```

## Handoff Contract

- `master-plan-consolidator` emits `<<<MASTER_PLAN v1>>>` plus `<<<ATOMIC_ITEM_REGISTER v1>>>`.
- `merge-ledger-generator` consumes the atomic register and emits `<<<MERGE_LEDGER v1>>>`.
- `planning-convergence-editor` consumes the Master Plan and Merge Ledger, then emits the final required blocks:
  - `<<<MASTER_PLAN v1>>>`
  - `<<<MERGE_LEDGER v1>>>`
  - `<<<NEXT_ITERATION_FOCUS v1>>>`

## Source-Grounding Rule

All skills must use only provided source artifacts, optional prior master plan, and optional iteration context. Unknown categories remain `Unknown`; implied but unspecified needs become open questions.
