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
- Keep shared interfaces in `src/types.ts` or local files when specific to a module.
- Use explicit interfaces/types for public data shapes and command results.
- Functions are generally small and focused; helper functions are kept private unless used across modules.
- Defensive programming is common: many filesystem and parsing operations are wrapped in `try/catch` and return safe defaults rather than throwing.
- Tool implementations return structured JSON-like objects with `success`, `error`, `note`, `hint`, or metadata as appropriate.
- Constants and operational limits are centralized in `src/constants.ts`; avoid hardcoding limits/path names in feature code.
- External LM Studio tool parameters are validated with Zod schemas.
- Node path handling uses `path.resolve`, `path.join`, `path.relative`, and `path.sep` for portability.

Naming conventions:
- `camelCase` for variables and functions.
- `PascalCase` for interfaces and type aliases.
- `UPPER_SNAKE_CASE` for exported constants.
- Plugin tool names use snake_case, matching external tool naming (`list_skills`, `read_skill_file`, `list_skill_files`, `run_command`).

Security and robustness patterns:
- Prevent path traversal when reading within skill directories.
- Restrict absolute skill file/directory access to configured skills paths.
- Bound command length, timeout, and output size.
- Truncate large file reads rather than loading arbitrarily large files.
- Normalize command output line endings.
- Avoid leaking exceptions to the user in core plugin flows; return structured errors or safe fallbacks.

Docstrings/comments:
- There are few inline comments or docstrings. Prefer readable function names and straightforward control flow. Add comments only where logic is non-obvious.

Testing conventions:
- No test framework or test scripts are currently configured in `package.json`. When adding tests, update `package.json` scripts and document the command in memories/README.