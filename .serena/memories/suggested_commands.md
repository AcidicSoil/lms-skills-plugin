# Suggested Commands

Development setup:
- `bun install` — install dependencies, as suggested by README.
- `npm install` — also likely works because scripts are npm-compatible, but no lockfile is present.

Build and local development:
- `bun run build` or `npm run build` — compile TypeScript with `tsc`.
- `bun run dev` or `npm run dev` — run `tsc && lms dev` for LM Studio plugin development.
- `bun run push` or `npm run push` — run `lms push` to publish/push the plugin.

Validation:
- `npx tsc --noEmit` — type-check without writing `dist/` files.
- `npm run build` — primary completion check currently available in package scripts.

Testing/linting/formatting:
- No `test`, `lint`, or `format` scripts are currently defined in `package.json`.
- If such tooling is added, prefer adding package scripts and using those scripts as the standard commands.

Useful Linux shell commands:
- `git status --short` — inspect working tree changes.
- `git diff` — review unstaged changes.
- `git diff --staged` — review staged changes.
- `ls -la` — list directory contents.
- `find . -maxdepth 2 -type f` — inspect shallow file structure.
- `grep -R "pattern" src` — search text in source files.
- `sed -n '1,160p' path/to/file` — print part of a file.
- `cat package.json` — view package metadata/scripts.

LM Studio/plugin context:
- `lms dev` is invoked by the dev script and is the likely local plugin entrypoint.
- `lms push` is invoked by the push script.

Notes:
- The README uses Bun examples, but `package.json` scripts are standard and there is no visible lockfile at onboarding time.
- Avoid long-running server commands from automation unless explicitly requested and safe to do so.