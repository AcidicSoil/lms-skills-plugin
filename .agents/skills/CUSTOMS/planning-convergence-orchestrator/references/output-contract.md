# Output Contract

Return one Markdown document with the blocks below, in this exact order.

## A) Master Plan

Start with:

```markdown
<<<MASTER_PLAN v1>>>
```

Use this canonical outline exactly; do not rename headings:

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

If a category is absent in all artifacts, keep the heading and write `Unknown`. If artifacts imply a need without specifics, add an open question instead of inventing details.

Change Log rule: if iteration number is provided, use `Iteration N`; otherwise use `Iteration Unknown`.

## B) Merge Ledger

Start with:

```markdown
<<<MERGE_LEDGER v1>>>
```

Then render a Markdown table with exactly these columns:

```markdown
item_id | item_type | status | short_statement | sources | convergence_action | notes
```

After the table, add:

```markdown
### Top Deltas
```

Include up to 15 items in priority order, favoring conflicts, variants, and new items from the latest artifacts.

## C) Next Iteration Focus

Start with:

```markdown
<<<NEXT_ITERATION_FOCUS v1>>>
```

Include 3 to 10 bullets. Each bullet must reference one or more `item_id` values.
