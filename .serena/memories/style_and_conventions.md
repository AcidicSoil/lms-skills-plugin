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
- Plugin tool names use snake_case (`list_skills`, `read_skill_file`, `list_skill_files`, `run_command`).
- Runtime targets use lowercase literals: `windows`, `wsl`, `both` where applicable.

Security and robustness patterns:
- Prevent path traversal when reading within skill directories.
- Restrict absolute skill file/directory access to configured skills roots.
- Validate tool inputs with Zod before implementation logic.
- Keep runtime path containment checks even when schemas reject invalid paths; schemas are not the only safety layer.
- Command execution must remain disabled by default.
- `run_command` must call `validateCommandSafety` before runtime registry creation or shell execution.
- Read-only command mode should remain conservative: no shell metacharacters, redirects, pipes, command chaining, variable expansion, or mutating args.
- Bound command length, timeout, setup budget, and output size.
- Tool requests should use tool-level timeout budgets from `src/constants.ts` and return structured timeout responses.
- Subprocesses should be killed on abort where possible.
- Truncate large file reads rather than loading/returning unbounded content.
- Normalize command output line endings.
- Avoid leaking noisy stack traces in normal logs; verbose logs are gated by `LMS_SKILLS_DEBUG=1`.

Prompt/preprocessor conventions:
- The plugin should not require a user-provided system prompt.
- Internal context injection happens in `src/preprocessor.ts`.
- Full context is injected on first use/change/refresh; compact reminder is used on intervening turns.
- Explicit `$skill-name` activation must be treated as high-priority for the request and should work even when normal auto-injection is disabled.
- `Max Skills in Context` should cap preprocessor gathering/injection work.

Diagnostics conventions:
- Use `logDiagnostic` from `src/diagnostics.ts` for structured logs.
- Default logs should be concise and high-value.
- Step/runtime traces should be debug-only or slow/error/timeout events.
- Preserve request IDs across related tool steps.

Docstrings/comments:
- There are few inline comments/docstrings. Prefer readable function names and straightforward control flow. Add comments only where logic is non-obvious.

Testing conventions:
- No test framework or test scripts are currently configured in `package.json`.
- Use `npm run build` as the required verification step.
- For focused validation, ad hoc Node smoke tests against compiled `dist/` modules are acceptable and have been used during development.
- If tests are added later, add package scripts and update `suggested_commands` / `task_completion_checklist` memories.