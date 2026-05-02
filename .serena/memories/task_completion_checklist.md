# Task Completion Checklist

Before considering a code task complete:
1. Review changed files for consistency with existing TypeScript style, runtime-target path handling, deterministic routing rules, explicit expansion behavior, and defensive error handling patterns.
2. Run `npm test` for behavior changes; it runs `npm run build && node --test tests/*.test.js`. Use `npm run build` or `bun run build` as the minimum compile/typecheck gate for docs-only or very narrow code checks.
3. Optionally run `npx tsc --noEmit` if build artifacts should be avoided.
4. For behavior changes, run a focused ad hoc smoke test against compiled `dist/` modules when practical.
5. Run `git status --short` to see all modified/untracked/deleted files.
6. Run `git diff` or `git diff --stat` to review changes before handing off.
7. If behavior changed, mention affected plugin flows in the summary, especially:
   - prompt preprocessor/internal skills context,
   - deterministic skill routing,
   - explicit `$skill-name` expansion and task payload rewrite,
   - context-injection proof logging,
   - SKILL.md frontmatter parsing,
   - scanner/exact skill lookup,
   - runtime environment/path handling,
   - tool schemas,
   - command safety,
   - runtime filesystem tools,
   - tool/preprocessor timeouts,
   - diagnostics/logging.
8. If README-facing behavior changes, update `README.md` in the same task when feasible.
9. If settings/config behavior changes, update settings persistence/migration logic in `src/settings.ts` and docs/memories as needed.
10. If tests/lint/format scripts are added later, run the relevant package scripts and update `suggested_commands`.

Routing/preprocessor checks:
- Confirm normal prompts do not receive broad `<available_skills>` catalogs.
- Confirm normal prompts inject at most `DEFAULT_MAX_ROUTED_SKILLS` routed candidates.
- Confirm no-route prompts receive compact reminder only.
- Confirm routed candidates require `read_skill_file` before covered work.
- Confirm `$skill-name` explicit activations expand the matching stripped `SKILL.md` body before model reasoning.
- Confirm `$skill-name` expansion emits a `<skill_invocation_packet>` and `<expanded_skill_instructions>`.
- Confirm explicit expansion tells the model the skill is already preloaded/read/understood.
- Confirm explicit expansion rewrites remaining user text into `<task_payload for_expanded_skills="...">`.
- Confirm explicit expansion removes the `$skill-name` token from task payload.
- Confirm uppercase shell variables such as `$HOME` are preserved as payload and not treated as skill activations.
- Confirm `$skill-name` expansion does not route unrelated supplemental skills first.
- Confirm unresolved `$skill-name` instructs `list_skills` lookup.
- Confirm `disable-model-invocation: true` is excluded from auto-routing but still works with explicit activation.

Context-injection log checks:
- Every preprocessor injection should emit a `[lms-skills] context ...` line.
- Explicit expansion should log `kind=explicit_expanded packet=skill_invocation_packet`.
- Routed context should log `kind=routed packet=routed_skills`.
- Reminder/fallback should log `kind=reminder` or `kind=fallback`.
- Context logs should include injection size/hash/preview and payload size/hash/preview.
- Explicit context logs should include expanded skill proof: name, bytes, source path, short hash, preview.
- The expected activation log is similar to: `prompt activation tokens=$example-skill resolved=example-skill unresolved=- expanded=1 action=expanded_before_model`.

Security-specific checks:
- Confirm `run_command` remains disabled by default unless intentionally changed.
- Confirm `validateCommandSafety` runs before runtime registry creation or shell execution.
- Confirm schemas reject invalid path traversal/control-character/malformed command inputs and enforce UTF-8 byte limits for file operations.
- Confirm slow tool paths receive `AbortSignal`/timeout wiring.
- Confirm absolute path access remains restricted to configured skills roots.
- Confirm `write_file` and `edit_file` are blocked unless command execution safety is `guarded`.

Current limitations:
- `npm test` is configured in `package.json` and runs the Node test suite after build.
- No lint or formatting scripts are configured in `package.json`.
- Command safety is policy-level hardening, not a full OS sandbox.
- Windows+WSL behavior should be tested manually in LM Studio when runtime/path behavior changes.
- Deterministic routing is lexical/metadata based; embeddings are intentionally not used yet.