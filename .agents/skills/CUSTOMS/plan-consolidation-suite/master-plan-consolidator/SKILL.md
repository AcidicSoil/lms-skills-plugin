---
name: master-plan-consolidator
description: "Extract source-grounded atomic planning statements and render an authoritative master plan. WHEN: \"create master plan\", \"consolidate planning docs\", \"extract requirements\", \"normalize plan artifacts\", \"build authoritative model\"."
license: MIT
metadata:
  author: OpenAI
  version: "1.0.0"
---

# Master Plan Consolidator

Use this skill first in the Plan Consolidation Suite. It converts planning documents into a deterministic Master Plan and atomic item register for downstream ledger generation.

## Workflow

1. Apply [source extraction](references/source-extraction.md).
2. Render the Master Plan using [master plan contract](references/master-plan-contract.md).
3. Emit the downstream register from [handoff contract](references/handoff-contract.md).

## Constraints

- Use only provided source artifacts, optional prior master plan, and optional iteration context.
- Preserve variants and conflicts; do not silently collapse competing ideas.
- Keep IDs stable across iterations when a prior master plan exists.
- Ask only when a decision blocks consolidation; otherwise write `Unknown` or add an open question.

## Output

Return `<<<MASTER_PLAN v1>>>` followed by `<<<ATOMIC_ITEM_REGISTER v1>>>`.
