# Style and Conventions

Language and compiler settings:
- TypeScript with `strict: true`.
- Target is ES2022, module is CommonJS.
- Source files live under `src/`; compiled files go to `dist/`.
- Declaration files, declaration maps, and source maps are emitted.

Observed code style:
- Use double quotes for strings.
- Use semicolons consistently.
- Prefer named exports over default exports.
- Use `import type` for type-only imports.
- Keep shared interfaces in `src/types.ts` or focused local modules when specific to a feature.
- Use explicit interfaces/types for public data shapes and command/tool results.
- Functions are generally small and focused; helper functions are private unless shared across modules.
- Defensive programming is common: filesystem/parsing operations often catch failures and return safe defaults, except AbortError/TimeoutError paths should propagate or return structured timeout results as designed.
- Tool implementations return structured JSON-like objects with `success`, `error`, `note`, `hint`, `timedOut`, `blocked`, or metadata as appropriate.
- Constants and operational limits are centralized in `src/constants.ts`; avoid hardcoding limits/path names in feature code.
- Tool input validation is centralized in `src/toolSchemas.ts` with Zod schemas.
- Use `AbortSignal` plumbing for any potentially slow path; timeout helpers live in `src/timeout.ts` and abort helpers in `src/abort.ts`.
- Node path handling must be environment-aware:
  - Windows paths use `path.win32`.
  - WSL/Linux paths use `path.posix`.
  - Do not use host `path` semantics for runtime-target paths unless intentionally operating on the host.

Naming conventions:
- `camelCase` for variables and functions.
- `PascalCase` for interfaces and type aliases.
- `UPPER_SNAKE_CASE` for exported constants.
- Plugin tool names use snake_case (`list_skills`, `read_skill_file`, `list_skill_files`, `list_skill_roots`, `search_skill_roots`, `read_file`, `write_file`, `edit_file`, `run_command`).
- Runtime targets use lowercase literals: `windows`, `wsl`, `both` where applicable.

Security and robustness patterns:
- Prevent path traversal and root escape when reading or writing within skill/configured root directories.
- Restrict absolute skill file/directory access to configured skills roots.
- Validate tool inputs with Zod before implementation logic.
- Keep runtime path containment checks even when schemas reject invalid paths; schemas are not the only safety layer.
- Command execution must remain disabled by default.
- `run_command` must call `validateCommandSafety` before runtime registry creation or shell execution.
- Read-only command mode should remain conservative: no shell metacharacters, redirects, pipes, command chaining, variable expansion, or mutating args.
- Bound command length, timeout, setup budget, and output size.
- Tool requests should use tool-level timeout budgets from `src/constants.ts` and return structured timeout responses.
- Subprocesses should be killed on abort where possible.
- Truncate large file reads rather than loading/returning unbounded content; bound write/edit content by UTF-8 byte length.
- Normalize command output line endings.
- Avoid leaking noisy stack traces in normal logs; verbose logs are gated by `LMS_SKILLS_DEBUG=1`.

Prompt/preprocessor conventions:
- The plugin should not require a user-provided system prompt.
- Internal context injection happens in `src/preprocessor.ts`.
- Normal prompt path should use deterministic routing from `src/skillRouter.ts`.
- Normal prompt injection should emit `<routed_skills>` with a tiny candidate set, not broad `<available_skills>` catalogs.
- Full `SKILL.md` bodies should not be injected for normal routed candidates; the model should call `read_skill_file` if needed.
- Explicit `$skill-name` activation is the exception: resolve exact skill and expand stripped `SKILL.md` body before model reasoning.
- `$skill-name` activation should work even when normal auto-injection is disabled.
- `Max Skills in Context` should cap discovery work, while `DEFAULT_MAX_ROUTED_SKILLS` caps normal prompt injection.

Diagnostics conventions:
- Use `logDiagnostic` from `src/diagnostics.ts` for structured logs.
- Default logs should be concise, human-readable, and route/tool focused.
- Step/runtime traces should be debug-only or slow/error/timeout events.
- Preserve request IDs across related tool steps.
- Prefer wide/canonical route events over scattered logs.

Documentation conventions:
- README should explain routed context, explicit `$skill` expansion, frontmatter metadata, command safety, timeouts, and diagnostics.
- Avoid hard-coding a real user skill name as a special example. Use neutral placeholders such as `example-skill` or `create-plan` only as generic illustrations.
- If behavior changes, update README and project memories in the same task when feasible.

Testing conventions:
- Node test scripts are configured in `package.json`; `npm test` runs `npm run build && node --test tests/*.test.js`.
- Use `npm test` as the preferred verification step when behavior changes; `npm run build` remains the minimum typecheck/build gate.
- For focused validation, prefer adding/using Node tests under `tests/*.test.js`; ad hoc Node smoke tests against compiled `dist/` modules are acceptable when a permanent test would be overkill.
- Current important smoke-test targets:
  - deterministic route selection and no-route behavior,
  - max routed candidates <= 3,
  - `$skill-name` expansion includes stripped body before model reasoning,
  - `disable-model-invocation` excluded from automatic routing but usable explicitly,
  - tool schemas reject traversal/control/malformed command inputs,
  - command safety blocks dangerous commands by default,
  - filesystem tools stay inside configured skill roots,
  - `write_file` / `edit_file` are blocked unless command execution safety is `guarded`.