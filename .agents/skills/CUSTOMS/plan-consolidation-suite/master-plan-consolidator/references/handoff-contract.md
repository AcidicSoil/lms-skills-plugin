# Handoff Contract

After the Master Plan, emit an internal handoff block:

```markdown
<<<ATOMIC_ITEM_REGISTER v1>>>
```

Each item must include:

| Field | Requirement |
|---|---|
| `item_id` | Stable `<TYPE>-<slug>` identifier |
| `item_type` | One valid atomic item type |
| `statement` | One normalized sentence |
| `details` | Optional short, source-grounded bullets |
| `sources` | One or more `{doc_id, section_ref, optional_quote}` entries |
| `status` | `aligned`, `variant`, `conflict`, `new`, `missing_from_others`, or `unknown` |
| `conflicts_with` | Item IDs only when incompatible |
| `supersedes` | Old IDs only when explicitly merged or replaced |
| `depends_on` | Item IDs only when explicitly stated |

## Stable ID Rules

Use prefixes: `G`, `S`, `FR`, `NFR`, `ARCH`, `DATA`, `WF`, `ART`, `MS`, `RISK`, `DEP`, `DP`, `Q`. Slugs are lowercase, hyphen-separated, under eight words, and stable across iterations.
