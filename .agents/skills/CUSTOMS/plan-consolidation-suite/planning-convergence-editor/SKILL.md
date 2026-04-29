---
name: planning-convergence-editor
description: "Resolve planning variants into next-iteration priorities and assemble the final convergence document. WHEN: \"resolve plan conflicts\", \"next iteration focus\", \"planning convergence\", \"assemble master plan ledger\", \"convergence editor\"."
license: MIT
metadata:
  author: OpenAI
  version: "1.0.0"
---

# Planning Convergence Editor

Use this skill third in the Plan Consolidation Suite. It combines the Master Plan and Merge Ledger, preserves unresolved differences, and produces the final next-iteration focus.

## Workflow

1. Apply [convergence workflow](references/convergence-workflow.md).
2. Render the final document using [final output contract](references/final-output-contract.md).
3. Validate against [quality gates](references/quality-gates.md).

## Inputs

- Required: `<<<MASTER_PLAN v1>>>` and `<<<MERGE_LEDGER v1>>>`.
- Optional: `<<<ATOMIC_ITEM_REGISTER v1>>>`, source artifacts, prior master plan, prior ledger, and iteration context.

## Constraints

- Do not invent resolutions, priorities, scope, timelines, owners, metrics, or integrations.
- Preserve all conflicts with Option A vs Option B and provenance.
- Ask only if a decision blocks assembly; otherwise mark `Decision Needed` or `Unknown`.

## Output

Return one Markdown document with exactly: `<<<MASTER_PLAN v1>>>`, `<<<MERGE_LEDGER v1>>>`, and `<<<NEXT_ITERATION_FOCUS v1>>>`.
