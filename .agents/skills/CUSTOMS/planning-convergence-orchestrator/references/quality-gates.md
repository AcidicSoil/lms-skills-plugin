# Quality Gates

Validate before final output.

| Gate | Requirement |
|---|---|
| V1 Output Contract | Blocks A, B, and C are present, ordered, and use required markers. Ledger has required columns. |
| V2 Determinism | Docs ordered by `DOC-##`; Master Plan uses canonical outline; section items sort by `item_type` then `item_id`; ledger rows sort lexicographically by `item_id`. |
| V3 Provenance | Every ledger row includes at least one `{doc_id, section_ref}` source. |
| V4 Conflict Preservation | Every conflict has Option A vs Option B with provenance and a resolution path or `Decision Needed`. |

## Source Grounding Check

Reject or remove any generated scope, feature, timeline, integration, constraint, or metric that is not present in source artifacts, prior AM, or iteration context.

## Token Pressure

Compress optional details first. Never drop provenance, conflicts, required markers, canonical headings, or ledger rows.

## Recovery

| Failure | Recovery |
|---|---|
| Missing source for an item | Remove the item or reclassify as open question only if source implies it. |
| Heading mismatch | Restore canonical outline exactly. |
| Unclear conflict | Mark `variant` unless options are incompatible. |
| Blocking decision | Ask one focused question; otherwise defer. |
