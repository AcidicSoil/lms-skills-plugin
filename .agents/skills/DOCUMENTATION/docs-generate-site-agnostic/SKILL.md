---
name: docs-generate-site-agnostic
description: Generate Level 3 documentation sites from design docs in a portable, agent-agnostic format. Use when creating feature-rich, interactive documentation for RSPress, Docusaurus, or VitePress without coupling the workflow to a specific AI tool or workspace layout.
license: Apache-2.0
allowed-tools: Read Glob Edit Write
metadata:
  author: relayforge
  version: "1.0"
  derived-from: docs-generate-site
  optimized-with: agentskills-io
---

# Generate Documentation Site (Agnostic)

Generate Level 3 documentation site content from design docs while keeping the workflow portable across agent runtimes and repository layouts.

## Structure

```text
docs-generate-site-agnostic/
├── SKILL.md
├── references/
│   ├── instructions.md
│   └── examples.md
└── assets/
    └── site-doc.template.mdx
```

## Use This Skill When

- Converting design documents into full documentation-site content
- Creating landing pages, getting-started guides, concept docs, and how-to guides
- Targeting RSPress, Docusaurus, or VitePress
- You need a skill that is portable across Claude Code, Cursor, Copilot, OpenAI-based tools, or custom runners

## Inputs

- `module`: Module, package, product, or documentation area to document
- `framework`: Documentation framework (`rspress`, `docusaurus`, `vitepress`)
- `api_docs`: Optional path to generated API docs to integrate
- `dry_run`: Optional flag to preview structure without writing files
- `design_config_path`: Optional path to repository design-doc config
- `design_docs_path`: Optional path to the source design docs when not discoverable from config
- `output_path`: Optional destination for generated site docs

## Core Workflow

1. Resolve inputs and repository paths.
2. Load documentation and design configuration from repository-local sources.
3. Read source design docs for the selected module or documentation area.
4. Extract material for landing page, getting started, concepts, guides, and examples.
5. Generate framework-appropriate MDX or Markdown files.
6. Create navigation metadata and API-doc links when applicable.
7. Validate syntax, cross-links, and framework-specific frontmatter.

## Path Resolution Rules

Check these sources in order and use the first valid match:

1. Explicit inputs (`design_config_path`, `design_docs_path`, `output_path`)
2. Repository-local config declared by the current project
3. Conventional project docs paths such as `docs/`, `design/`, or package-local design docs

Do not assume `.claude/` paths or any vendor-specific workspace layout unless the repository actually contains them.

## Output Expectations

Generate content such as:

- `index.mdx` or `index.md` for the landing page
- `guides/getting-started.mdx`
- `guides/*.mdx` for task-oriented documentation
- `concepts/*.mdx` for architecture and mental-model content
- navigation metadata appropriate to the selected framework

## Writing Rules

- Prefer imperative, concrete instructions over abstract prose.
- Translate internal architecture into user-facing concepts.
- Keep examples runnable and complete.
- Use framework-specific UI primitives only when they improve clarity.
- Keep tool-specific assumptions out of the generated content unless the repository itself requires them.

## Supporting Files

Read these files as needed:

- `references/instructions.md` for implementation steps
- `references/examples.md` for generated-output patterns
- `assets/site-doc.template.mdx` for page scaffolding

## Validation Checklist

- Frontmatter is valid for the selected framework.
- MDX or Markdown syntax parses.
- Navigation links resolve.
- Code fences specify languages.
- Interactive elements are supported by the selected framework.
- Generated examples match the documented API or usage patterns.

## Success Criteria

Generated site documentation is successful when it provides:

- An engaging landing page with clear value proposition
- A progressive getting-started guide
- User-friendly concept documentation
- Task-oriented how-to guides
- Clear navigation structure
- Valid, framework-specific syntax
- API docs integration when available

## Related Skills

- `docs-generate-readme`
- `docs-generate-repo`
- `rspress-page`
- `docs-sync`
