# Migration Workflow

Follow this order. Do not rewrite before inventory and classification.

| Stage | Action | Output |
|---|---|---|
| Intake | Identify source format, target schema, compatibility goal, and risk level. | Assumptions or blocking questions |
| Inventory | Parse each item as-is. Capture `id`, `prefix`, `name`, `title`, `content`, `template`, `tags`, variables, and comments. | Raw inventory table |
| Normalize | Convert legacy fields to canonical equivalents while preserving meaning. | Proposed normalized metadata |
| Deduplicate | Detect exact duplicates, semantic overlaps, and prefix collisions. | Duplicate/overlap findings |
| Classify | Choose keep, revise, merge, promote, deprecate, or archive. | Migration action table |
| Rewrite | Rewrite only approved/recommended assets. | Revised snippets/workflows |
| Package | Group by namespace, tags, metadata, and import/export shape. | Import-ready or review-ready package |
| Validate | Check naming, placeholders, tags, links, schema caveats, and searchability. | Final quality notes |

## Inventory Columns

Use: old ID, old prefix/name, apparent type, variables, tags, content summary, issue, recommended action.

## Error Handling

| Problem | Recovery |
|---|---|
| Target schema unknown | State assumptions and use a review-ready generic schema. |
| Ambiguous item type | Mark as `unknown` and classify after reading content. |
| Same prefix, different behavior | Treat as collision; rename or split. |
| Missing content | Preserve record and mark `archive` or `needs-source`. |
