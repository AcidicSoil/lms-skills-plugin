# Suggested Commands

Development setup:
- `bun install` — install dependencies, as suggested by README.
- `npm install` — also works with the npm-compatible scripts. A package lock may exist depending on local install history.

Build and local development:
- `bun run build` or `npm run build` — compile TypeScript with `tsc`.
- `bun run dev` or `npm run dev` — run `tsc && lms dev` for LM Studio plugin development.
- `bun run push` or `npm run push` — run `lms push` to publish/push the plugin.

Required validation:
- `npm test` — preferred full local verification; runs `npm run build && node --test tests/*.test.js`.
- `npm run build` — minimum build/typecheck gate. Run this after code changes when a narrower check is sufficient.
- `npx tsc --noEmit` — optional no-output type check if build artifacts should be avoided.

Ad hoc smoke tests:
- Use `node - <<'NODE' ... NODE` against compiled `dist/` modules after `npm run build` for focused behavior checks.
- Useful smoke-test targets:
  - `dist/preprocessor.js` for internal context injection and `$skill-name` activation.
  - `dist/scanner.js` for exact skill lookup and scan limits.
  - `dist/toolSchemas.js` for Zod schema rejection/acceptance checks.
  - `dist/commandSafety.js` for command safety policy checks.
  - `dist/toolsProvider.js` for tool registration and blocked file/command behavior.

Runtime diagnostics:
- `LMS_SKILLS_DEBUG=1 npm run dev` — verbose `[lms-skills]` step/runtime logs.
- `LMS_SKILLS_SLOW_STEP_MS=250 npm run dev` — override slow step log threshold.
- `LMS_SKILLS_SLOW_RUNTIME_MS=500 npm run dev` — override slow runtime log threshold.

Testing/linting/formatting:
- `test` is defined in `package.json` and should be used for behavior changes. No `lint` or `format` scripts are currently defined.
- If such tooling is added, prefer package scripts and use those scripts as standard commands.

Useful Linux shell commands:
- `git status --short` — inspect working tree changes.
- `git diff` — review unstaged changes.
- `git diff --staged` — review staged changes.
- `git diff --stat` — compact changed-file summary.
- `ls -la` — list directory contents.
- `find . -maxdepth 2 -type f` — inspect shallow file structure.
- `grep -R "pattern" src` — search text in source files.
- `sed -n '1,160p' path/to/file` — print part of a file.
- `cat package.json` — view package metadata/scripts.

LM Studio/plugin context:
- `lms dev` is invoked by the dev script and is the likely local plugin entrypoint.
- `lms push` is invoked by the push script.

Notes:
- Avoid long-running server commands from automation unless explicitly requested and safe.
- Do not run potentially destructive commands as part of routine validation.
- The plugin itself now disables model-issued `run_command` by default; development shell usage should still follow normal repo safety practices.