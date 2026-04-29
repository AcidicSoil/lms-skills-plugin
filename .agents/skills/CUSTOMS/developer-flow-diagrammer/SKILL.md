---
name: developer-flow-diagrammer
description: "Convert developer workflows, process notes, or session logs into clear Mermaid diagrams and repo-ready markdown. WHEN: \"diagram this flow\", \"create process diagrams\", \"make a decision tree\", \"write sequence diagram\", \"developer flow docs\", \"visualize workflow\"."
license: MIT
metadata:
  author: generated
  version: "1.0.0"
---

# Developer Flow Diagrammer

Use this skill to turn technical workflows, transcripts, architecture notes, or process descriptions into diagrams that developers can read and maintain.

## Workflow

1. **Extract the flow** - Identify actors, systems, states, decisions, loops, inputs, outputs, and failure paths.
2. **Choose diagrams** - Use [diagram selection](references/diagram-selection.md) to pick the smallest useful diagram set.
3. **Draft Mermaid** - Apply [Mermaid patterns](references/mermaid-patterns.md) for flowcharts, sequences, state diagrams, and mind maps.
4. **Write context** - Explain each diagram with short repo-ready markdown, assumptions, and usage notes.
5. **Verify readability** - Check that labels are action-oriented, branches are explicit, and the diagram matches the source evidence.

## Output Requirements

- Prefer Mermaid so diagrams live directly in markdown docs.
- Include a short purpose statement before each diagram.
- Use exact names for tools, snippets, services, files, or roles when source material provides them.
- Mark inferred edges or unsupported behavior as assumptions.
- Keep diagrams compact; split large flows into focused diagrams.

## Quality Bar

A good diagram package includes:

- decision tree for routing or mode selection
- sequence diagram for actor/tool interactions
- state diagram for lifecycle or stop/continue logic
- mind map only for concept inventory
- plain-language notes explaining how to use the diagrams

Use the [developer flow template](templates/developer-flow-diagram-template.md) when the user wants a complete markdown artifact.
