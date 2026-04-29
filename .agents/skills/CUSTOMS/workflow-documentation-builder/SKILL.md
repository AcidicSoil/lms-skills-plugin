---
name: workflow-documentation-builder
description: "Create repo-ready workflow documentation from notes, transcripts, or process references. WHEN: \"document this workflow\", \"write user flow docs\", \"create workflow docs\", \"add decision tree\", \"document snippet stack\", \"make repo-ready docs\"."
license: MIT
metadata:
  author: skill-extraction assistant
  version: "1.0.0"
---

# Workflow Documentation Builder

Use this skill to convert workflow notes, chat exports, process specs, or implementation references into user-facing repo documentation.

## Workflow

1. **Extract the workflow** — Identify the actors, entry points, modes, ordering, decision gates, stop conditions, outputs, and verification steps.
2. **Choose the doc shape** — Use [documentation patterns](references/documentation-patterns.md) to select sections and file structure.
3. **Generate diagrams** — Add only diagrams that clarify routing, sequence, ownership, or concept structure. See [diagram patterns](references/diagram-patterns.md).
4. **Write repo-ready markdown** — Produce copy-pasteable files with headings, tables, examples, and Mermaid blocks.
5. **Check usability** — Verify that a new user can answer: what to use, when to use it, what order to follow, how to stop, and how to verify completion.

## Output Requirements

- Prefer `docs/<topic>/README.md` plus focused subpages for long content.
- Include a “Start Here” path when multiple workflow modes exist.
- Make decision rules explicit; avoid implied ordering.
- Include invocation examples or input/output examples when the workflow is tool-driven.
- State assumptions and edge cases separately from canonical flow.

## Quality Bar

The documentation is complete only when it includes:

- purpose and scope
- workflow inventory
- decision tree or routing table
- ordered flow steps
- examples
- stop/continue conditions
- verification or closeout expectations
- handoff or next-step guidance

Use the [repo-ready template](templates/workflow-doc-template.md) when the user wants a complete file.
