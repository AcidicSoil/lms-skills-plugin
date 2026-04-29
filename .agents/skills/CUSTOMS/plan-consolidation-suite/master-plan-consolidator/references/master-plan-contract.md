# Master Plan Contract

Start the rendered plan with:

```markdown
<<<MASTER_PLAN v1>>>
```

Use this outline exactly; do not rename headings:

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

## Rendering Rules

- If a category is absent in all artifacts, keep the heading and write `Unknown`.
- If artifacts imply a need but lack specifics, create an open question.
- If `prior_am` exists, preserve existing item IDs and structure where possible.
- Record necessary edits in the Change Log.
- If iteration number is provided, use `Iteration N`; otherwise use `Iteration Unknown`.
- Sort items inside each section by `item_type`, then `item_id` lexicographically.

## Conflict Rendering

When sources are incompatible, include Option A and Option B with provenance and a `Decision Needed` or source-grounded proposed path.
