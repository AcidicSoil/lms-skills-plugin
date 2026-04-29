# Schema Mapping

Use this mapping when converting legacy snippet records.

| Legacy Field | Canonical Field | Rule |
|---|---|---|
| `prefix` | `id` or metadata alias | Keep if stable; otherwise map to namespaced ID. |
| `name` / `title` | `metadata.title` | Convert to short catalog title. |
| `content` | `template` | Preserve LLM-facing intent. |
| comma-string `tags` | `metadata.tags[]` | Convert to lowercase facet tags where possible. |
| `{{var}}` patterns | `variables[]` | Infer required variables unless a safe default exists. |
| workflow `mode` | `insertMode` | Normalize to `insert`, `append`, or `replace`. |

## Canonical ID Pattern

```text
snippet.<domain>.<intent>.v1
workflow.<domain>.<intent>.v1
```

Use compact domains such as `pe`, `audit`, `catalog`, `repo`, `debug`, `research`, and `handoff`.

## Placeholder Rules

Use `{{snake_case}}` for required variables. Use `{{snake_case:default}}` only for short, safe defaults. Replace vague names like `{{thing}}`, `{{stuff}}`, or generic `{{input}}` when the purpose is clear.

## Tag Rules

Use 4-8 controlled tags. Prefer facets such as `asset:snippet`, `asset:workflow`, `domain:catalog`, `mode:audit`, `surface:chat`, `pack:core`, `status:stable`, and `risk:medium`.
