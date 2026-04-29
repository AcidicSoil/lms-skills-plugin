---
name: skill-runtime-improvement
description: "Improve skill runtimes that activate, route, inject, validate, time out, log, and safely expose tools. WHEN: \"skill runtime\", \"skill activation\", \"route skills\", \"prompt injection\", \"tool schema\", \"timeout guardrail\", \"context overload\", \"model confused by skills\"."
---

# Skill Runtime Improvement

Use this skill to improve an agent or plugin runtime that discovers, activates, routes, injects, or executes skills for a model.

## Workflow

1. **Identify the failure boundary** — classify the issue as activation, routing, injection, tool schema, timeout, logging, command safety, or documentation drift.
2. **Prefer deterministic runtime logic** — implement the decision in code before model reasoning whenever possible.
3. **Protect context** — inject only explicit activations or a small ranked candidate set. Avoid broad skill catalogs.
4. **Use progressive disclosure** — rely on frontmatter and metadata for routing; load full instructions only for explicit activation or selected skills.
5. **Harden tool access** — validate inputs, enforce timeouts, honor aborts, and make command execution disabled or least-privilege by default.
6. **Log model-facing decisions** — log what was injected, why it was selected, hashes/previews, and the expected model action.
7. **Verify behavior** — add smoke tests for explicit activation, routed selection, no-route fallback, disabled skills, invalid schemas, and timeout paths.
8. **Sync docs and onboarding memory** — update README/onboarding notes after behavior changes.

## Reference Guides

- Use [Routing and Activation](references/routing-and-activation.md) when changing skill selection, `$skill-name` handling, or prompt rewriting.
- Use [Context and Guardrails](references/context-and-guardrails.md) when changing schemas, timeouts, command safety, or context budgets.
- Use [Logging and Verification](references/logging-and-verification.md) when making diagnostics useful or proving runtime behavior.

## Output Standard

Deliver code changes with:

- exact behavior change summary,
- files changed,
- build/test result,
- remaining caveats,
- documentation or memory updates if behavior changed.
