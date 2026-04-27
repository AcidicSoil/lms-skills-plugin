# Current State Summary

As of the latest sync, `lms-plugin-skills` is a routed, context-safe LM Studio skills plugin.

Most important current behaviors:
- No manual system prompt is required.
- Normal prompts are handled by deterministic metadata routing, not broad skill-list injection.
- Normal prompt context uses `<routed_skills>` and is capped to `DEFAULT_MAX_ROUTED_SKILLS = 3` candidates.
- If no route is confident, the plugin injects a compact `<skills_runtime_reminder>` only.
- Explicit `$skill-name` activation is a special fast path:
  - exact skill is resolved directly,
  - its `SKILL.md` is read internally,
  - YAML frontmatter is stripped,
  - the instruction body is injected as `<expanded_skill_instructions>` before the model starts reasoning,
  - all remaining user text is task payload for that expanded skill.
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
- Default logs are human-readable route/tool summaries; JSON logs require `LMS_SKILLS_DEBUG=1`.

Key files:
- `src/preprocessor.ts`: normal routed context, no-route reminder, explicit `$skill` expansion.
- `src/skillRouter.ts`: deterministic routing algorithm.
- `src/scanner.ts`: skill discovery, frontmatter parsing, exact lookup, read/list helpers.
- `src/toolsProvider.ts`: tool schemas/handlers and `list_skills(mode="route")`.
- `src/diagnostics.ts`: default human-readable logs and debug JSON logs.
- `src/commandSafety.ts`: command execution policy.
- `README.md`: should reflect routed context and explicit expansion.

Validation command:
- `npm run build`

Recommended smoke tests after routing/preprocessor changes:
- Normal docs/readme-like prompt routes to a relevant skill and injects <=3 candidates.
- Casual prompt gets no-route reminder.
- `$create-plan ...` expands `create-plan/SKILL.md` body before model reasoning.
- Explicit expansion strips frontmatter and does not include unrelated skills.
- Disabled skill does not auto-route but can be explicitly expanded.
