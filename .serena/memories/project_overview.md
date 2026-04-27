# Project Overview

`lms-plugin-skills` is an LM Studio plugin that implements a Claude-style local skill system.

Current purpose:
- Discover skill directories that contain a `SKILL.md` entry point.
- Internally supply skills context to the model through an LM Studio prompt preprocessor, without requiring users to paste any special system prompt.
- Expose LM Studio tools for listing skills, reading skill files, listing skill directory contents, and optionally executing commands.
- Support Windows, WSL, and Both runtime environments for path resolution, skill reads, directory listing, and command routing.
- Persist plugin configuration under `~/.lmstudio/plugin-data/lms-skills/settings.json` because LM Studio plugin settings may not persist across new chats.

Core behavior:
- Default skills directory is `~/.lmstudio/skills`.
- Skills can include optional `skill.json` metadata (`name`, `description`, `tags`) to override directory-derived metadata.
- Prompt preprocessor behavior is internal and automatic when `Internal Skills Context` is enabled:
  - Full `<skills_runtime_context>` + `<available_skills>` injection at startup, when skill fingerprint changes, and after the refresh interval.
  - Compact `<skills_runtime_reminder>` on intervening turns to avoid repeatedly growing chat history.
  - A 3-second preprocessor scan budget protects normal chat responsiveness.
  - If skill scanning times out/fails non-fatally, the compact reminder is still injected.
- Explicit skill activation notation is supported:
  - User can write `$skill-name` anywhere in a prompt.
  - The preprocessor resolves that skill directly and injects `<explicit_skill_activation>`.
  - Activated skills are treated as the highest-priority skill context for that request.
  - Activated skills are included even if outside normal `Max Skills in Context`.
  - Explicit activation works even if normal internal context injection is disabled.
- `Max Skills in Context` limits preprocessor skill gathering/injection, not broad `list_skills` search.
- Exact skill reads are optimized: `read_skill_file("skill-name")` checks `<root>/<skill-name>/SKILL.md` directly before broader scans.
- Skill search scores name, tags, description, and SKILL.md body excerpts using token scoring and IDF weighting.
- File reads are bounded/truncated by configured constants to avoid huge outputs.
- Tool input schemas are centralized in `src/toolSchemas.ts` using Zod and reject invalid/traversal/control-character inputs before implementation logic runs.
- Tool-level timeouts prevent model/tool requests from hanging indefinitely.
- Command execution is disabled by default and guarded by policy before any shell runtime is created.

Tech stack:
- TypeScript targeting ES2022.
- Node/CommonJS plugin runner.
- LM Studio SDK (`@lmstudio/sdk`).
- Zod for tool parameter schemas.
- Node built-ins: `fs`, `path`, `os`, `child_process`.

Package metadata:
- Main built entrypoint: `dist/index.js`.
- Source root: `src/`.
- Build output: `dist/`.
- TypeScript strict mode is enabled in `tsconfig.json`.
- Primary validation command: `npm run build`.

Repository structure:
- `src/index.ts`: plugin registration entrypoint.
- `src/config.ts`: LM Studio configuration schematics.
- `src/settings.ts`: persistent/effective configuration resolution and settings migration.
- `src/constants.ts`: paths and operational limits.
- `src/environment.ts`: host/runtime environment types and target derivation.
- `src/runtime/types.ts`: runtime adapter interfaces.
- `src/runtime/windowsRuntime.ts`: Windows filesystem and command adapter.
- `src/runtime/wslRuntime.ts`: WSL/Linux filesystem and command adapter.
- `src/runtime/index.ts`: runtime registry factory.
- `src/pathResolver.ts`: environment-aware skill root/path resolution.
- `src/scanner.ts`: skill discovery, exact lookup, manifest parsing, description/body extraction, search, safe reads, directory listing.
- `src/preprocessor.ts`: internal context injection, compact reminder, explicit `$skill` activation.
- `src/toolsProvider.ts`: LM Studio tools (`list_skills`, `read_skill_file`, `list_skill_files`, `run_command`), request logging, tool-level timeout wiring.
- `src/executor.ts`: target-aware command routing layer.
- `src/commandSafety.ts`: command execution mode and safety policy.
- `src/toolSchemas.ts`: reusable Zod schemas for tool inputs.
- `src/timeout.ts`: timeout AbortSignal helpers.
- `src/abort.ts`: abort/error helpers.
- `src/diagnostics.ts`: structured `[lms-skills]` logging.
- `src/types.ts`: shared interfaces.
- `src/pluginTypes.ts`: plugin context/controller types.
- `src/setup.ts`: default skills directory bootstrap compatibility.
- `README.md`: current user-facing documentation.
- `manifest.json`: LM Studio plugin manifest metadata.

No `AGENTS.md`, contributing guide, or obvious project-specific coding guide was found during onboarding.