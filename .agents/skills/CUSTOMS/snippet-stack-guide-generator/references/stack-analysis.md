# Stack Analysis

Use this procedure to extract the reusable logic from a prompt/snippet stack.

## Inputs to Collect

| Source | Extract |
|---|---|
| Snippet files | names, variables, triggers, outputs |
| README/docs | intended use, examples, warnings |
| Chat/session notes | actual workflow decisions |
| Task graph/tooling docs | external dependencies or routing constraints |

## Extraction Steps

1. **Normalize names** - Preserve exact snippet names. Group aliases under the canonical snippet.
2. **Classify modes** - Manual, checkpointed, autonomous, repair, verify, audit, handoff, or compatibility.
3. **Map dependencies** - Identify prerequisite snippets, required files, tools, and state.
4. **Find decision points** - Capture user-facing questions such as “Taskmaster or no Taskmaster?”.
5. **Derive canonical paths** - Express each path as `snippet → snippet → verification → handoff`.
6. **Record stop rules** - Separate blocking conditions from normal continuation.
7. **Flag uncertainty** - Mark unsupported behavior as unknown instead of filling gaps.

## Output Shape

For each snippet, capture:

```md
## snippet.name

Purpose:
Use when:
Do not use when:
Inputs:
Outputs:
Next snippets:
Notes:
```

## Selection Rule

The primary path is the one that is most reusable, safest for new users, and best supported by the source material.
