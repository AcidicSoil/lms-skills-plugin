# Routing and Activation

Use this guide when a model is confused about which skill to use, when `$skill-name` does not activate reliably, or when too many skills are shown to the model.

## Deterministic Routing

Build a metadata-only router before model reasoning:

| Signal | Use |
|---|---|
| Exact `$skill-name` token | Force activation and bypass ranking |
| Frontmatter `name` | Primary stable skill identifier |
| Frontmatter `description` | Main routing text |
| `when_to_use` or trigger phrases | High-weight routing text |
| Tags/path basename | Secondary routing hints |
| `disable-model-invocation` | Exclude from automatic routing unless explicitly activated |

Use thresholds and confidence labels. Inject only high-confidence or clearly top-ranked candidates. If confidence is low, inject a compact reminder instead of a catalog.

## Explicit Activation

For `$skill-name`:

1. Detect only skill-shaped tokens, preferably lowercase names with letters, numbers, hyphens, underscores, or dots.
2. Ignore shell/environment variables like `$HOME` and other uppercase variable tokens.
3. Resolve the skill directly by name/path before broad scans.
4. Read and strip `SKILL.md` frontmatter.
5. Rewrite the request into an invocation packet plus clean task payload.
6. Remove the `$skill-name` token from the payload.

The model-facing packet should state that the skill has already been selected and preloaded. It should not ask the model to decide whether to use it.

## Prompt Shape

Use a strong packet contract:

```xml
<skill_invocation_packet priority="highest" expanded="true">
  <model_contract>The activated skill is already preloaded.</model_contract>
  <expanded_skill_instructions name="example-skill">...</expanded_skill_instructions>
</skill_invocation_packet>
<task_payload for_expanded_skills="example-skill">...</task_payload>
```

Normal routed skills should not include full bodies. They should include rank, confidence, short descriptions, reasons, and an expected next action.
