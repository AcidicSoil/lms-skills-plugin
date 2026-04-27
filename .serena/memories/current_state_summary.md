# Current State Summary

As of the latest sync, `lms-plugin-skills` is a routed, context-safe LM Studio skills plugin with explicit skill expansion and full context-injection audit logging.

Most important current behaviors:
- No manual system prompt is required.
- Normal prompts are handled by deterministic metadata routing, not broad skill-list injection.
- Normal prompt context uses `<routed_skills>` and is capped to `DEFAULT_MAX_ROUTED_SKILLS = 3` candidates.
- If no route is confident, the plugin injects a compact `<skills_runtime_reminder>` only.
- Explicit `$skill-name` activation is a special fast path:
  - exact lowercase skill token is resolved directly,
  - uppercase shell variables like `$HOME` are ignored and preserved as payload,
  - matching `SKILL.md` is read internally,
  - YAML frontmatter is stripped,
  - the instruction body is injected as `<expanded_skill_instructions>` inside a `<skill_invocation_packet>` before the model starts reasoning,
  - the model-facing contract says the activated skill is already preloaded and should be treated as read/understood,
  - the `$skill-name` token is removed from model-facing payload,
  - remaining user text is wrapped in `<task_payload for_expanded_skills="...">` and treated as input to the expanded skill.
- Explicit `$skill-name` works even if normal internal context is disabled.
- Explicit `$skill-name` can activate skills with `disable-model-invocation: true` because the user directly requested them.
- `SKILL.md` frontmatter is the primary metadata source for routing:
  - `name`, `description`, `when_to_use` / `when-to-use`, `tags`, `disable-model-invocation`, `user-invocable`, and related fields are parsed.
- Metadata priority: `SKILL.md` frontmatter, then `skill.json`, then directory/markdown fallback.
- `read_skill_file` strips frontmatter from `SKILL.md` responses.
- `list_skills({ query, mode: "route" })` exposes the same router used by prompt injection.
- `run_command` is disabled by default and protected by schema validation plus command safety policy.
- Tool inputs are validated by Zod schemas in `src/toolSchemas.ts`.
- Tool requests have timeout guardrails.
- Default logs are human-readable route/tool/context summaries; JSON logs require `LMS_SKILLS_DEBUG=1`.

Context-injection proof logging:
- Every preprocessor injection logs a compact `context` line and a full `context_content` block.
- `kind=explicit_expanded` proves a `$skill-name` was expanded.
- `kind=routed` proves routed candidates were injected.
- `kind=reminder` proves only compact reminder context was injected.
- `kind=fallback` proves fallback context after scan/route issue.
- Compact context proof logs include:
  - packet type (`skill_invocation_packet`, `routed_skills`, etc.),
  - selected/expanded skill names,
  - source paths for expanded/routed skills when available,
  - injection character count,
  - short SHA-256 hash of injected context,
  - compact injection preview,
  - payload character count/hash/preview.
- Full context proof logs use `context_content` and print the complete injected context between `---BEGIN injected_context---` / `---END injected_context---`, plus the task payload when present. This is intended to prove exactly what model-facing context the preprocessor produced at activation/routing time.
- Default runtime subprocess completion logs are quieter: internal `runtime_exec_complete` events are no longer printed solely because `exitCode !== 0`; timeout and slow-runtime completions still print. Higher-level tool/route errors remain logged.

Key files:
- `src/preprocessor.ts`: normal routed context, no-route reminder, explicit `$skill` expansion, context-injection audit logging.
- `src/skillRouter.ts`: deterministic routing algorithm.
- `src/scanner.ts`: skill discovery, frontmatter parsing, exact lookup, read/list helpers.
- `src/toolsProvider.ts`: tool schemas/handlers and `list_skills(mode="route")`.
- `src/diagnostics.ts`: default human-readable logs, compact context proof logs, full context_content blocks, debug JSON logs.
- `src/commandSafety.ts`: command execution policy.
- `README.md`: should reflect routed context, explicit expansion, and context-injection proof logging.

Validation command:
- `npm run build`

Recommended smoke tests after routing/preprocessor/logging changes:
- Normal docs/readme-like prompt routes to a relevant skill and injects <=3 candidates.
- Casual prompt gets no-route reminder.
- `$create-plan ...` expands `create-plan/SKILL.md` body before model reasoning.
- Explicit expansion strips frontmatter and does not include unrelated skills.
- Explicit payload preserves shell variables like `$HOME` but removes the `$skill-name` activation token.
- Disabled skill does not auto-route but can be explicitly expanded.
- Logs contain `context kind=explicit_expanded ... sha=... payloadSha=...` and a matching `context_content` block for explicit activations.
- Noisy internal WSL/runtime `exit=1 stdout=0B stderr=0B` completion lines should not flood default logs.