# Ledger Contract

Start with:

```markdown
<<<MERGE_LEDGER v1>>>
```

Render a Markdown table with exactly these columns:

```markdown
item_id | item_type | status | short_statement | sources | convergence_action | notes
```

## Column Rules

| Column | Content |
|---|---|
| `item_id` | Stable item ID from atomic register. |
| `item_type` | Atomic item type. |
| `status` | One valid status value. |
| `short_statement` | Compact normalized statement. |
| `sources` | One or more `{doc_id, section_ref}` entries; optional quote is allowed. |
| `convergence_action` | `accept`, `choose`, `merge`, or `defer`. |
| `notes` | Variants, conflicts, dependencies, superseded IDs, or decision path. |

Sort rows lexicographically by `item_id`.

After the table, add:

```markdown
### Top Deltas
```

List up to 15 conflict, variant, or new items in priority order.
