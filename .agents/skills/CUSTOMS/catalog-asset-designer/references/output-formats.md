# Output Formats

## Individual Snippet

Return:

- ID or prefix
- title
- description
- template
- variables
- tags
- usage note
- compatibility note

## Workflow

Return:

- workflow ID
- title
- description
- variables
- ordered steps
- `insertMode` per step
- tags
- expected output
- fallback behavior

## Pack Spec

Return:

- pack name and namespace
- purpose and target users
- taxonomy
- snippets
- workflows
- metadata strategy
- import/export notes
- migration notes

## Import/Export Wrapper

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-28T00:00:00.000Z",
  "snippets": [{ "hash": "sha256:<to-compute>", "item": {} }],
  "workflows": [{ "hash": "sha256:<to-compute>", "item": {} }]
}
```

## Catalog Index

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-04-28T00:00:00.000Z",
  "items": [
    { "id": "core:snippet:pe.sys.create", "type": "snippet", "item": {} }
  ],
  "itemsByPage": {},
  "checksum": "sha256:<to-compute>",
  "signature": "<optional>"
}
```

Use deterministic placeholders for timestamps, hashes, and signatures unless the user requests computation.
