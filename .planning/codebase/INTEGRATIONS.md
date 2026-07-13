---
mapped_at: 2026-07-13
focus: tech
---

# Integrations

## LM Studio SDK

The primary external integration is LM Studio through `@lmstudio/sdk`.

- `.lmstudio/entry.ts` creates an `LMStudioClient` using `LMS_PLUGIN_CLIENT_IDENTIFIER`, `LMS_PLUGIN_CLIENT_PASSKEY`, and `LMS_PLUGIN_BASE_URL` environment variables.
- The self-registration host receives configuration schematics, a tools provider, and a prompt preprocessor.
- `src/index.ts` registers those capabilities during plugin startup.
- `src/pluginTypes.ts` provides a narrow local interface for the subset of LM Studio context APIs used by the plugin.

## Local Filesystem

The plugin integrates deeply with the host filesystem.

- `src/scanner.ts` discovers skills, reads `SKILL.md`, parses optional `skill.json`, and walks skill directories.
- `src/settings.ts` reads and writes persistent JSON configuration.
- `src/setup.ts` creates the default skill directory and copies bundled samples when present.
- `src/toolsProvider.ts` exposes file reading, writing, patching, moving, renaming, appending, deleting, directory creation, and directory listing.
- `src/scanner.ts` installs `fs.watch` watchers to invalidate cached skill metadata.

## Shell and Process Execution

- `src/executor.ts` launches operating-system shells with `child_process.spawn`.
- Unix platforms prefer `$SHELL`, then common bash/sh/zsh paths.
- Windows supports `cmd.exe` and PowerShell selection, with an optional explicit shell override.
- Windows PATH values are augmented by querying registry environment values.
- `src/toolsProvider.ts` exposes this integration as the `run_command` model tool.

## Operating System APIs

- `os.homedir()` determines default skill, plugin-data, and fallback working directories.
- `process.platform` selects Windows, macOS, or Linux behavior.
- Platform-specific command handling is centralized in `src/executor.ts`.
- Filesystem tools use Node `fs` and `path` APIs in `src/toolsProvider.ts` and `src/scanner.ts`.

## Skill File Contract

- Each skill is a directory containing `SKILL.md`.
- Optional `skill.json` can override name, description, and tags.
- Skill instructions are injected into prompts or returned through LM Studio tools.
- The contract is documented in `README.md` and implemented in `src/scanner.ts` and `src/preprocessor.ts`.

## External Services Not Present

- No database integration exists.
- No HTTP client or third-party API integration exists beyond LM Studio SDK transport.
- No authentication provider is implemented here; LM Studio passes plugin connection credentials through environment variables.
- No webhook, queue, remote cache, telemetry, or cloud storage integration is present.
