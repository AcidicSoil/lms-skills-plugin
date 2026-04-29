# Catalog Model

Use the smallest asset model that satisfies the request.

| Asset | Use | Required design focus |
|---|---|---|
| Snippet | Atomic prompt macro | Prefix/ID, compact template, clear variables, tags |
| Workflow | Ordered multi-step routine | Step order, `insertMode`, variables, expected output |
| Pack | Versioned collection | Namespace, taxonomy, assets, compatibility notes |
| Catalog index | Remote browsing/search | Item IDs, item type, metadata, checksum/signature placeholders |
| Import/export package | Local portability | Schema version, exported timestamp, wrapped items |

## Canonical Item Fields

Prefer these fields when supported:

- `id`
- `template` for snippets
- `steps` for workflows
- `variables`
- `metadata.title`
- `metadata.description`
- `metadata.tags`
- `metadata.allowedSurfaces`
- `createdAt`, `updatedAt`
- `usage.totalUses`

## Workflow Steps

Use `insertMode` values:

- `insert` for the first prompt or buffer replacement setup
- `append` for continuation prompts
- `replace` only when overwriting the current input is intended

Do not use frontend/demo aliases such as `mode` in final canonical output unless documenting migration compatibility.
