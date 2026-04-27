# Project Overview

`lms-plugin-skills` is an LM Studio plugin that implements a Claude-style skill system.

Purpose:
- Discover skill directories that contain a `SKILL.md` entry point.
- Inject an `<available_skills>` block into prompts so the model can see relevant skills.
- Expose LM Studio tools for listing skills, reading skill files, listing skill directory contents, and executing shell commands.
- Persist plugin configuration under `~/.lmstudio/plugin-data/lms-skills/settings.json` because LM Studio plugin settings may not persist across new chats.

Key behavior:
- Default skills directory is `~/.lmstudio/skills`.
- Skills can include an optional `skill.json` manifest to override name, description, and tags.
- The prompt preprocessor injects available skill metadata only when auto-injection is enabled, prompt length is above the minimum, skills exist, and either the skill set changed or the reinjection interval elapsed.
- Skill search scores name, tags, description, and SKILL.md body excerpts using token scoring and IDF weighting.
- File reads are bounded/truncated by configured constants to avoid huge outputs.
- Shell commands are exposed through a `run_command` plugin tool with platform-specific shell detection and bounded timeout/output limits.

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

Repository structure:
- `src/index.ts`: plugin registration entrypoint.
- `src/config.ts`: LM Studio configuration schematics.
- `src/settings.ts`: persistent/effective configuration resolution.
- `src/constants.ts`: paths and operational limits.
- `src/scanner.ts`: skill discovery, manifest parsing, description/body extraction, search, safe reads, directory listing.
- `src/preprocessor.ts`: prompt injection logic.
- `src/toolsProvider.ts`: LM Studio tools (`list_skills`, `read_skill_file`, `list_skill_files`, `run_command`).
- `src/executor.ts`: shell detection and command execution.
- `src/types.ts`: shared interfaces.
- `src/pluginTypes.ts`: plugin context/controller types.
- `src/setup.ts`: default skills directory bootstrap.
- `scripts/`: local utility scripts, currently task-master related.
- `samples/`: sample data/skills, if present.
- `manifest.json`: LM Studio plugin manifest metadata.

No `AGENTS.md`, contributing guide, or obvious project-specific coding guide was found during onboarding.