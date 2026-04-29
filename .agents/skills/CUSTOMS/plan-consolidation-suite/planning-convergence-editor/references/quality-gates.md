# Quality Gates

Validate before final response.

| Gate | Requirement |
|---|---|
| V1 Output Contract | Blocks A, B, C are present, ordered, and use required markers. Ledger has required columns. |
| V2 Determinism | Docs ordered by `DOC-##`; Master Plan uses canonical outline; section items sort by `item_type`, then `item_id`; ledger rows sort by `item_id`. |
| V3 Provenance | Every ledger row has at least one `{doc_id, section_ref}` source. |
| V4 Conflict Preservation | Every conflict has Option A vs Option B with provenance and a resolution path or `Decision Needed`. |

## Source-Grounding Check

Remove any generated scope, feature, timeline, integration, constraint, metric, owner, or decision that is not present in the provided sources, prior plan, ledger, or iteration context.

## Recovery

| Failure | Recovery |
|---|---|
| Missing source | Remove item or convert to open question only if source implies it. |
| Heading mismatch | Restore canonical outline exactly. |
| Ambiguous incompatibility | Mark `variant` unless options are truly incompatible. |
| Blocking decision | Ask one focused question only if assembly cannot continue. |
