---
name: master-plan-ledger
description: "Consolidate planning artifacts into a source-grounded Master Plan and Merge Ledger. WHEN: \"merge planning docs\", \"consolidate PRDs\", \"create master plan\", \"produce merge ledger\", \"resolve plan conflicts\", \"update prior master plan\"."
license: MIT
metadata:
  version: "1.0.0"
---

# Master Plan Ledger

Use this skill to ingest one or more planning artifacts and return one deterministic Markdown document containing a consolidated Master Plan, Merge Ledger, and Next Iteration Focus.

## Workflow

1. **Load inputs** — Accept `source_artifacts` or `plan_docs`, optional `prior_am` or `prior_master_plan`, and optional `iteration_context`.
2. **Extract atomic items** — Follow [Extraction Workflow](references/extraction-workflow.md) to register documents, normalize statements, and classify item relationships.
3. **Render output** — Follow [Output Contract](references/output-contract.md) exactly for markers, canonical headings, ledger columns, and next-iteration bullets.
4. **Apply rules** — Use [Determinism and Convergence Rules](references/determinism-convergence.md) for IDs, statuses, provenance, conflicts, and convergence actions.
5. **Validate** — Run [Quality Gates](references/quality-gates.md) before final response.

## Non-Negotiables

- Use only source-provided information and optional prior AM content.
- Preserve disagreements as explicit variants or conflicts; never silently collapse them.
- Keep canonical outline headings and output markers unchanged.
- Ask questions only when a decision blocks consolidation; otherwise mark `Unknown` and continue.
- Every ledger row must include provenance.

## Expected Output

Return only the consolidated Markdown document unless the user explicitly asks for commentary.
