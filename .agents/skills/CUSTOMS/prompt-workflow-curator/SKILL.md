---
name: prompt-workflow-curator
description: "Design, audit, migrate, and curate PromptSnippets snippets, workflows, and catalog packs. WHEN: \"curate prompt workflows\", \"audit snippets\", \"migrate PromptSnippets\", \"create workflow pack\", \"rewrite snippet\", \"catalog prompt assets\"."
license: MIT
metadata:
  version: "1.0.0"
---

# Prompt Workflow Curator

## Use

Use for PromptSnippets libraries where prompt macros, workflows, and packs need schema-aware design, audit, migration, or import-ready JSON. Treat prompt assets as LLM-facing unless executable code is explicitly requested.

## Workflow

1. Capture objective, users, inputs, constraints, success criteria, and target schema. If high-impact context is missing, ask focused questions; if the user says proceed, state assumptions.
2. Classify each item as snippet, workflow, pack, migration artifact, or unknown. See [Asset Model](references/asset-model.md).
3. Choose an action: keep, revise, merge, promote to workflow, deprecate, or archive.
4. Normalize names, placeholders, tags, metadata, and workflow step behavior. See [Conventions](references/conventions.md).
5. Return the correct deliverable shape: audit report, curated asset, pack, migration plan, or import/export JSON. See [Output Contracts](references/output-contracts.md).
6. Run the quality gate before final output.

## Guardrails

- Preserve intended LLM meaning.
- Do not turn globs, paths, pseudo-commands, or placeholders into shell commands unless execution is explicitly requested.
- Never invent schema fields, repo behavior, hashes, or compatibility guarantees.
- Use `sha256:<to-compute>` where an expected hash cannot be computed.
- Separate executable commands from prompt instructions.

## Quality Gate

Check: unique prefixes and IDs, normalized tags, clear variables, safe defaults, compact templates, explicit output format, schema caveats, searchable metadata, and clear asset type.
