---
name: catalog-asset-designer
description: "Design searchable, import-ready PromptSnippets catalog assets with stable IDs, metadata, tags, variables, and pack formats. WHEN: \"create catalog asset\", \"design prompt pack\", \"make import-ready JSON\", \"define snippet metadata\", \"catalog prompt assets\", \"remote catalog\"."
license: MIT
metadata:
  version: "1.0.0"
---

# Catalog Asset Designer

## Use

Use when a user wants PromptSnippets snippets, workflows, or packs designed for palette search, remote catalog browsing, import/export, and reuse across chat or extension surfaces.

## Workflow

1. Identify the asset scope: snippet, workflow, pack, catalog index, or import/export package. If the target schema is unknown and precision matters, ask once; if the user says proceed, label assumptions.
2. Design stable IDs, titles, descriptions, variables, tags, categories, and allowed surfaces. See [Metadata Conventions](references/metadata-conventions.md).
3. Choose the asset shape and required fields. See [Catalog Model](references/catalog-model.md).
4. Produce the requested output: individual asset, pack spec, catalog index, import-ready JSON, or review table. See [Output Formats](references/output-formats.md).
5. Add compatibility notes for schema drift, hash handling, origin semantics, and legacy aliases.
6. Run [Quality Gate](references/quality-gate.md) before final output.

## Guardrails

- Preserve LLM-facing meaning unless executable behavior is explicit.
- Treat paths, globs, placeholders, and pseudo-commands as prompt text by default.
- Do not invent real hashes, signatures, schema support, provider behavior, or repository facts.
- Use `sha256:<to-compute>` when wrappers require hashes and computation is not requested.
- Keep assets compact enough for extension insertion and searchable enough for catalog discovery.
