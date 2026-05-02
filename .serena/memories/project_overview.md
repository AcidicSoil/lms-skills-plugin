# Project Overview

`lms-plugin-skills` is an LM Studio plugin that implements a Claude-style local skill system with deterministic routing, explicit skill expansion, and auditable model-context injection.

Current purpose:
- Discover local skill directories that contain a `SKILL.md` entry point.
- Internally supply skills context to the model through an LM Studio prompt preprocessor, without requiring users to paste anything into the system prompt.
- Protect model context from overload by routing each normal prompt to a tiny candidate set instead of dumping a full skills catalog.
- Expand explicitly requested `$skill-name` activations before model reasoning so the model receives the relevant `SKILL.md` body immediately and is told the skill is preloaded/read/understood.
- Log proof of every model-facing context injection, including packet type, selected/expanded skills, content hashes, sizes, previews, and payload summaries.
- Expose LM Studio tools for listing/routing skills, reading skill files, listing skill directory contents, sandboxed file read/write/edit operations, and optionally executing commands.
- Support Windows, WSL, and Both runtime environments for path resolution, skill reads, directory listing, and command routing.
- Persist plugin configuration under `~/.lmstudio/plugin-data/lms-skills/settings.json` because LM Studio plugin settings may not persist across new chats.

Core behavior:
- Default skills directory is `~/.lmstudio/skills`.
- A skill is a directory containing `SKILL.md`.
- `SKILL.md` frontmatter is parsed and used as high-level routing metadata:
  - `name`
  - `description`
  - `when_to_use` / `when-to-use`
  - `tags`
  - `disable-model-invocation`
  - `user-invocable`
  - additional Claude-style fields such as `allowed-tools`, `context`, `agent`, `model`, `effort`, `argument-hint`, `arguments` are parsed when present.
- Metadata priority is: `SKILL.md` frontmatter, then `skill.json`, then directory name plus markdown first paragraph.
- `read_skill_file` strips YAML frontmatter from `SKILL.md` results so the model sees the instruction body after metadata has already been consumed.
- Normal prompt injection uses deterministic routing:
  - `src/skillRouter.ts` scores skills by exact name/directory match, tag match, description/when-to-use token overlap, name/path token overlap, and small generic-description penalties.
  - Prompt injection is capped to `DEFAULT_MAX_ROUTED_SKILLS = 3`, even though `Max Skills in Context` remains an upper bound for discovery work.
  - Normal prompt injection emits `<routed_skills>` rather than a broad `<available_skills>` catalog.
  - If no confident route exists, only a compact `<skills_runtime_reminder>` is injected.
  - Skills with `disable-model-invocation: true` are excluded from automatic routing.
- Explicit `$skill-name` activation is a special fast path:
  - Supported tokens are lowercase skill-like names. Uppercase shell variables like `$HOME` are ignored and preserved as payload.
  - The preprocessor resolves the exact matching skill directly.
  - The plugin reads and expands that skill’s stripped `SKILL.md` body inside `<expanded_skill_instructions>` within a `<skill_invocation_packet>` before the model starts reasoning.
  - The packet says the skill is already preloaded/read/understood and that the plugin already decided to use it.
  - No extra routing/scanning is done before explicit expansion beyond what is needed to resolve the skill.
  - The `$skill-name` token is removed from the model-facing task payload.
  - Remaining user text is wrapped in `<task_payload for_expanded_skills="...">`.
  - Explicit activation works even when normal internal context injection is disabled.
  - Explicit activation can still use skills marked `disable-model-invocation: true` because the user directly requested them.
- `list_skills({ query, mode: "route" })` exposes the same deterministic router used by prompt injection for debugging/testability.
- Exact skill reads are optimized: `read_skill_file("skill-name")` checks `<root>/<skill-name>/SKILL.md` directly before broader scans.
- File reads are bounded/truncated by configured constants to avoid huge outputs.
- Tool input schemas are centralized in `src/toolSchemas.ts` using Zod and reject invalid/traversal/control-character inputs before implementation logic runs.
- Tool-level timeouts and bounded recovery behavior prevent model/tool requests from hanging indefinitely. `list_skills` has a short recovery path; file-operation tools use `TOOL_FILE_OPERATION_TIMEOUT_MS = 30_000`.
- Command execution is disabled by default and guarded by policy before any shell runtime is created.
- Default diagnostics are human-readable route/tool/context summaries. Full JSON diagnostics are available with `LMS_SKILLS_DEBUG=1`.

Context-injection proof logging:
- Every prompt injection logs a `context_injection` event.
- Default human-readable format starts with `[lms-skills] context ...`.
- Logs prove whether model received:
  - explicit expanded skill packet,
  - routed skill candidates,
  - compact reminder,
  - fallback context.
- Logs include injection kind, packet name, selected/expanded skill names, source paths when available, char counts, short SHA-256 hashes, previews, and payload summaries.

Tech stack:
- TypeScript targeting ES2022.
- Node/CommonJS plugin runner.
- LM Studio SDK (`@lmstudio/sdk`).
- Zod for tool parameter schemas.
- Node built-ins: `fs`, `path`, `os`, `child_process`, `crypto`.

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
- `src/constants.ts`: paths and operational limits, including routing/timeouts.
- `src/environment.ts`: host/runtime environment types and target derivation.
- `src/runtime/types.ts`: runtime adapter interfaces, including read/write filesystem primitives.
- `src/runtime/windowsRuntime.ts`: Windows filesystem and command adapter.
- `src/runtime/wslRuntime.ts`: WSL/Linux filesystem and command adapter.
- `src/runtime/index.ts`: runtime registry factory.
- `src/pathResolver.ts`: environment-aware skill root/path resolution.
- `src/scanner.ts`: skill discovery, frontmatter parsing, exact lookup, manifest parsing, description/body extraction, search, safe reads, directory listing.
- `src/skillRouter.ts`: deterministic metadata router for prompt injection and `list_skills(mode="route")`.
- `src/preprocessor.ts`: internal routed context injection, compact reminder, explicit `$skill` expansion, context-injection proof logging.
- `src/toolsProvider.ts`: LM Studio tools (`list_skills`, `read_skill_file`, `list_skill_files`, `list_skill_roots`, `search_skill_roots`, `read_file`, `write_file`, `edit_file`, `run_command`), request logging, tool-level timeout wiring.
- `src/executor.ts`: target-aware command routing layer.
- `src/commandSafety.ts`: command execution mode and safety policy.
- `src/toolSchemas.ts`: reusable Zod schemas for tool inputs.
- `src/timeout.ts`: timeout AbortSignal helpers.
- `src/abort.ts`: abort/error helpers.
- `src/diagnostics.ts`: structured/human-readable `[lms-skills]` logging and context proof formatting.
- `src/types.ts`: shared interfaces.
- `src/pluginTypes.ts`: plugin context/controller types.
- `src/setup.ts`: default skills directory bootstrap compatibility.
- `README.md`: current user-facing documentation.
- `manifest.json`: LM Studio plugin manifest metadata.

No `AGENTS.md`, contributing guide, or formal test suite was found during onboarding.