# Final Output Contract

Return one Markdown document with these blocks in this exact order.

## A) Master Plan

Start with:

```markdown
<<<MASTER_PLAN v1>>>
```

Use the canonical outline exactly:

```markdown
1. Overview
2. Goals
3. Non-Goals
4. Scope
5. Assumptions
6. Requirements
   6.1 Functional Requirements
   6.2 Non-Functional Requirements
7. Architecture & Design
8. Data Contracts & Schemas
9. Workflows & Operational Semantics
10. Milestones & Phasing
11. Risks & Mitigations
12. Open Questions
13. Decision Log
14. Change Log (iteration to iteration)
```

## B) Merge Ledger

Start with:

```markdown
<<<MERGE_LEDGER v1>>>
```

Use exactly these table columns:

```markdown
item_id | item_type | status | short_statement | sources | convergence_action | notes
```

Then add `### Top Deltas` with up to 15 items.

## C) Next Iteration Focus

Start with:

```markdown
<<<NEXT_ITERATION_FOCUS v1>>>
```

Include 3 to 10 bullets. Each bullet must reference item IDs.
