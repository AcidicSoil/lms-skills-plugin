# Ledger Workflow

## 1. Load Inputs

Prefer an existing `<<<ATOMIC_ITEM_REGISTER v1>>>`. If absent, derive atomic items from the source artifacts using the same source-grounded extraction rules: headings as anchors, ticket fields as item candidates, table rows as candidates, and only normative code-block statements.

## 2. Normalize Relationships

For each atomic item, populate supported relationships only:

| Field | Rule |
|---|---|
| `conflicts_with` | Use only when statements are incompatible. |
| `supersedes` | Use only when replacement or merge is explicit. |
| `depends_on` | Use only when dependency is explicitly stated. |

## 3. Classify Status

Classify each item as `aligned`, `variant`, `conflict`, `new`, `missing_from_others`, or `unknown`.

## 4. Select Convergence Action

Assign exactly one action: `accept`, `choose`, `merge`, or `defer`.

## 5. Identify Top Deltas

Prioritize conflicts first, then variants, then new items introduced by latest artifacts. Limit Top Deltas to 15 items.
