# Quality Gates

Run these checks before returning the final Markdown document.

| Gate | Check |
|---|---|
| V1 Output Contract | Blocks A, B, and C are present, in order, with exact markers |
| V2 Determinism | Stable ordering, stable IDs, and canonical headings are preserved |
| V3 Provenance | Every ledger row has at least one valid `{doc_id, section_ref}` source |
| V4 Conflict Preservation | Each conflict has Option A, Option B, provenance, and a resolution path |

## Unknowns

- Missing categories remain present and contain `Unknown`.
- Implied needs without specifics become `open_question` items.
- Do not invent scope, features, timelines, integrations, constraints, or metrics.

## Prior AM Handling

When a prior AM exists:

1. Preserve existing structure and item IDs.
2. Apply only source-grounded edits.
3. Record edits in `14. Change Log (iteration to iteration)`.
4. Use `Iteration N` when the user provides an iteration number; otherwise use `Iteration Unknown`.

## Token Pressure

Compress in this order:

1. Reduce details bullets.
2. Shorten optional quotes.
3. Limit Top Deltas to fewer items.
4. Never drop provenance, required headings, output markers, or conflict representation.
