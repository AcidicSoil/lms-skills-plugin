---
name: snippet-stack-guide-generator
description: "Create clear user guides for prompt or snippet libraries by documenting each snippet, when to use it, and how snippets connect. WHEN: \"document snippet stack\", \"prompt library guide\", \"snippet order\", \"which snippet to use\", \"workflow snippets\", \"promptsnippets docs\"."
license: MIT
metadata:
  author: generated
  version: "1.0.0"
---

# Snippet Stack Guide Generator

Use this skill to turn a prompt/snippet library or workflow stack into a concise guide users can follow.

## Workflow

1. **Inventory snippets** - List snippet names, purpose, inputs, outputs, and mode.
2. **Infer routing** - Identify the user's decision points and default path.
3. **Define order** - Convert the stack into canonical flows: start, branch, repeat, verify, stop.
4. **Write usage rules** - State when to use each snippet and what to avoid.
5. **Add visuals** - Include diagrams only when they clarify routing or lifecycle.
6. **Package docs** - Produce repo-ready markdown using the [guide template](templates/snippet-stack-guide-template.md).

## Required Output

Include:

- start-here decision table
- snippet inventory
- intended order of use
- copy-paste invocation examples
- stop/continue rules
- maintenance or compatibility notes
- Mermaid decision tree when routing is nontrivial

Use [stack analysis](references/stack-analysis.md) to extract the reusable flow and [guide patterns](references/guide-patterns.md) to choose sections and diagrams.

## Quality Bar

- Prefer user-facing labels over internal implementation detail.
- Mark legacy aliases as compatibility notes, not primary paths.
- Do not invent snippet behavior not supported by source material.
- Keep examples bounded and executable.
- End with the next documentation artifact to create.
