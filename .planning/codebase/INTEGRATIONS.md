---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: tech
---
# Integrations

## LM Studio Runtime

The primary external integration is LM Studio through `@lmstudio/sdk`.

- `src/index.ts` registers configuration, tools, and prompt preprocessing.
- `src/config.ts` constructs host-visible settings.
- `src/toolsProvider.ts` creates callable tools with Zod schemas.
- `src/preprocessor.ts` transforms user messages before model execution.

## Local Filesystem

- `src/scanner.ts` discovers `SKILL.md` and optional `skill.json` files.
- `src/settings.ts` persists JSON at `~/.lmstudio/plugin-data/lms-skills/settings.json`.
- `src/setup.ts` copies `samples/` into the default skill root.
- `src/toolsProvider.ts` exposes read, write, patch, append, delete, move, rename, create, and list operations.

## Shell and Operating System

`src/executor.ts` integrates with platform shells. Unix prefers `$SHELL` and known shell paths. Windows supports `cmd.exe` and PowerShell and can expand PATH from the registry. `run_command` delegates to this executor with time and output caps.

## File Watching

`src/scanner.ts` uses `fs.watch` to invalidate cached skill metadata. It attempts recursive watching and falls back to non-recursive watching.

## External Services

No direct HTTP client, database driver, authentication provider, webhook endpoint, telemetry SDK, or cloud-service client appears in `src/` or `package.json`.

Network behavior can occur indirectly through programs launched by `run_command`, but it is not a first-class integration.

## Data Formats

- JSON: manifests, package metadata, skill metadata, and settings.
- Markdown: skill entry points and documentation.
- XML-like prompt blocks: `<available_skills>` and `<skill_context>`.

## Boundaries

- Host boundary: `src/index.ts`, `src/pluginTypes.ts`, `src/config.ts`.
- Skill-content boundary: `src/scanner.ts`.
- Prompt boundary: `src/preprocessor.ts`.
- Operating-system boundary: `src/executor.ts` and filesystem tools.
