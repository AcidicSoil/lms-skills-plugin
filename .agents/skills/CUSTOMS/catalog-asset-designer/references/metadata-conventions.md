# Metadata Conventions

## IDs and Prefixes

Use stable, compact, namespaced IDs.

```text
snippet.<domain>.<intent>.v1
workflow.<domain>.<intent>.v1
pack.<namespace>.v1
```

Use prefix shape:

```text
<domain>.<intent>[.<variant>]
```

Examples: `pe.sys.create`, `catalog.pack.create`, `skill.lookup`, `repo.context.extract`.

Avoid vague names such as `gpt`, `help`, `fix`, or `prompt`.

## Variables

Use `{{snake_case}}` for required variables. Use `{{snake_case:default}}` only when the default is short and safe.

Prefer: `{{task_goal}}`, `{{target_users}}`, `{{repo_context}}`, `{{constraints:none}}`, `{{output_format:markdown}}`.

Avoid: `{{thing}}`, `{{stuff}}`, vague `{{input}}`, nested placeholders, or long defaults.

## Tags

Use 4-8 controlled facet tags:

- `asset:snippet`, `asset:workflow`
- `domain:prompt-engineering`, `domain:catalog`, `domain:repo`, `domain:research`
- `mode:create`, `mode:audit`, `mode:review`, `mode:handoff`
- `surface:chat`, `surface:extension`, `surface:repo`
- `pack:core`, `status:draft`, `status:stable`, `risk:low`, `risk:medium`

Use lowercase kebab-case after the facet prefix. Do not create near-duplicate tags.
