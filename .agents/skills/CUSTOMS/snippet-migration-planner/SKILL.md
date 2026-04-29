---
name: snippet-migration-planner
description: "Audit and migrate legacy PromptSnippets snippets into schema-aware snippets, workflows, and migration reports. WHEN: \"migrate snippets\", \"audit legacy snippets\", \"normalize PromptSnippets\", \"deduplicate snippets\", \"promote snippet to workflow\", \"migration report\"."
license: MIT
metadata:
  version: "1.0.0"
---

# Snippet Migration Planner

## Use

Use when a user provides a legacy PromptSnippets export, raw snippet list, or rough prompt library and wants it converted into a cleaner schema-aware library. Preserve LLM-facing meaning unless executable behavior is explicitly requested.

## Workflow

1. Confirm the migration target: source format, target schema, compatibility needs, and success criteria. If the user says proceed, state assumptions and continue.
2. Inventory before rewriting. Extract IDs, prefixes, names, content/templates, variables, tags, and apparent asset type. See [Migration Workflow](references/migration-workflow.md).
3. Normalize legacy fields, placeholders, tags, and metadata without changing intent. See [Schema Mapping](references/schema-mapping.md).
4. Deduplicate and classify every asset as keep, revise, merge, promote-to-workflow, deprecate, or archive. See [Classification Rules](references/classification-rules.md).
5. Produce the requested deliverable: migration report, revised snippets, workflow candidates, or import-ready JSON. Use [Report Templates](references/report-templates.md).
6. Run the final checks in [Quality Gate](references/quality-gate.md).

## Guardrails

- Do not invent schema guarantees, hashes, repo behavior, or importer support.
- Treat globs, paths, pseudo-commands, and placeholders as prompt text unless execution is requested.
- Separate prompt assets from shell commands or implementation code.
- Use `sha256:<to-compute>` when a wrapper requires hashes but no computation is requested.
