# Conventions

## Naming

Use stable namespaced prefixes:

```text
<domain>.<intent>[.<variant>]
```

Good: `pe.sys.create`, `pe.snippet.rewrite`, `audit.snippets`, `catalog.pack.create`, `skill.lookup`.
Avoid broad names such as `gpt`, `help`, `fix`, `prompt`, spaces, and model-specific names unless required.

## Placeholders

Use `{{snake_case}}` for required variables and `{{snake_case:default}}` only for short safe defaults.
Prefer: `{{task_goal}}`, `{{repo_context}}`, `{{target_files}}`, `{{constraints:none}}`, `{{output_format:markdown}}`.
Avoid vague variables such as `{{thing}}`, `{{stuff}}`, and generic `{{input}}` when a specific name exists.

If an optional variable can be empty, define fallback behavior in the template.

## Tags

Use facet tags, lowercase after the colon:

```text
asset:snippet
asset:workflow
domain:prompt-engineering
domain:catalog
mode:audit
mode:review
mode:handoff
surface:chat
pack:core
status:stable
risk:medium
```

Use 4-8 tags per asset. Avoid near-duplicate synonyms.

## Workflow Steps

Use `insertMode`, not `mode`, for canonical step behavior. Valid values are `insert`, `append`, and `replace`. Use `replace` sparingly because it may destroy the active input buffer.

## Import and Catalog Notes

When outputting import-ready JSON, ask for the exact schema if precision matters. If the user says proceed, use the closest known schema and label assumptions.

Use `sha256:<to-compute>` for placeholder hashes. Distinguish import/export packages from catalog indexes. Preserve local/remote origin semantics when known.
