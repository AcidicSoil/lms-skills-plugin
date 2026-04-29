---
name: merge-ledger-generator
description: "Generate a deterministic merge ledger from atomic planning statements and plan sources. WHEN: \"generate merge ledger\", \"track plan differences\", \"classify conflicts\", \"compare planning artifacts\", \"ledger convergence actions\"."
license: MIT
metadata:
  author: OpenAI
  version: "1.0.0"
---

# Merge Ledger Generator

Use this skill second in the Plan Consolidation Suite. It converts the atomic register and source provenance into a machine-friendly convergence ledger.

## Workflow

1. Load [ledger workflow](references/ledger-workflow.md).
2. Apply [status and action rules](references/status-action-rules.md).
3. Render with [ledger contract](references/ledger-contract.md).

## Inputs

- Required: source artifacts or `<<<ATOMIC_ITEM_REGISTER v1>>>`.
- Preferred: `<<<MASTER_PLAN v1>>>` from `master-plan-consolidator`.
- Optional: prior master plan, prior ledger, and iteration context.

## Constraints

- Every ledger row must include at least one source.
- Preserve variants and conflicts; do not choose a winner unless the source artifacts or user context provide the decision.
- If the atomic register is missing, extract only the minimum atomic items needed to produce a valid ledger.

## Output

Return `<<<MERGE_LEDGER v1>>>` with the required table and Top Deltas subsection.
