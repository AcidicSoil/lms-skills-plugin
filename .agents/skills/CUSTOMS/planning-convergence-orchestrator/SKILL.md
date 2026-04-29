---
name: planning-convergence-orchestrator
description: "Consolidate planning artifacts into a source-grounded master plan, merge ledger, and next-iteration focus. WHEN: \"merge plans\", \"consolidate planning docs\", \"create master plan\", \"generate merge ledger\", \"resolve plan conflicts\", \"planning convergence\"."
license: MIT
metadata:
  author: OpenAI
  version: "1.0.0"
---

# Planning Convergence Orchestrator

Use this skill to consolidate one or more planning documents into a deterministic Master Plan, Merge Ledger, and Next Iteration Focus.

## Workflow

1. Load [workflow](references/workflow.md).
2. Apply [ID and status rules](references/id-status-rules.md).
3. Render exactly with [output contract](references/output-contract.md).
4. Validate against [quality gates](references/quality-gates.md) before responding.

## Operating Constraints

- Use only source artifacts, optional prior master plan, and optional iteration context.
- Preserve disagreements; do not collapse variants or conflicts silently.
- Ask only if a decision blocks consolidation; otherwise mark `Unknown` or create an open question.
- Keep output deterministic: stable IDs, stable ordering, exact markers, exact canonical headings.

## Inputs

- `source_artifacts` or `plan_docs`: one or more planning documents.
- `prior_am` or `prior_master_plan`: optional previous Master Plan + Ledger.
- `iteration_context`: optional iteration number, focus, constraints, or audience.

## Example

Input: three draft PRDs with overlapping requirements and conflicting scope notes.
Output: one Markdown document containing `<<<MASTER_PLAN v1>>>`, `<<<MERGE_LEDGER v1>>>`, and `<<<NEXT_ITERATION_FOCUS v1>>>`.
