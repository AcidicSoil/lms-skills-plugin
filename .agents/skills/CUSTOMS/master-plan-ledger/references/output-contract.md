# Output Contract

Return a single Markdown document with these blocks in this order.

## A) Master Plan Block

Start exactly:

```markdown
<<<MASTER_PLAN v1>>>
```

Use this canonical outline exactly. Do not rename, reorder, or delete headings.

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

If a category is absent from all sources, keep the heading and write `Unknown`.

## B) Merge Ledger Block

Start exactly:

```markdown
<<<MERGE_LEDGER v1>>>
```

Emit this Markdown table exactly:

| item_id | item_type | status | short_statement | sources | convergence_action | notes |
|---|---|---|---|---|---|---|

Then add:

```markdown
### Top Deltas
```

List up to 15 important `new`, `conflict`, or `variant` items in priority order.

## C) Next Iteration Focus Block

Start exactly:

```markdown
<<<NEXT_ITERATION_FOCUS v1>>>
```

Provide 3 to 10 bullets. Each bullet must reference one or more `item_id`s.
