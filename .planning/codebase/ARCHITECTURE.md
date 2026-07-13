---
mapped_at: 2026-07-13
focus: arch
---

# Architecture

## Architectural Style

The project is a small modular plugin organized around three LM Studio extension points: configuration, tool provisioning, and prompt preprocessing. It uses synchronous filesystem services around a thin asynchronous plugin boundary.

## Entry Points

- `.lmstudio/entry.ts` establishes the LM Studio client and self-registration host.
- `src/index.ts` is the application composition root.
- `main()` bootstraps the default skills directory and registers `configSchematics`, `toolsProvider`, and `promptPreprocessor`.

## Main Components

### Configuration Layer

- `src/config.ts` declares UI-visible settings.
- `src/settings.ts` merges LM Studio values with persisted disk state and caches the result for five seconds.
- `src/constants.ts` contains defaults, limits, paths, regexes, and search weights.

### Skill Discovery Layer

- `src/scanner.ts` scans configured directories and builds `SkillInfo` records.
- It extracts descriptions and body excerpts from Markdown when no manifest override exists.
- It maintains module-level caches and filesystem watchers.
- It provides search, resolution, file reading, and directory listing primitives.

### Prompt Processing Layer

- `src/preprocessor.ts` extracts text from multiple message shapes.
- Explicit `/skill-name` references are resolved first and expanded inline into `<skill_context>`.
- Otherwise, an `<available_skills>` block can be injected based on configuration and reinjection state.

### Tool Layer

- `src/toolsProvider.ts` constructs LM Studio tools with Zod parameter schemas.
- Skill tools delegate to `src/scanner.ts`.
- General filesystem tools call Node `fs` and `path` APIs directly.
- Command execution delegates to `src/executor.ts`.

### Execution Layer

- `src/executor.ts` detects platform and shell, resolves working directories, launches commands, enforces timeouts, and truncates output.

## Data Flow

1. LM Studio loads `.lmstudio/entry.ts` and imports `src/index.ts`.
2. `main()` registers plugin capabilities.
3. On a message, `promptPreprocessor()` resolves configuration and scans skills.
4. Explicit skill references are expanded; otherwise the available-skill list may be injected.
5. During model execution, LM Studio invokes tools created by `toolsProvider()`.
6. Tools read configuration, access skill/workspace files, or spawn a shell command.
7. Results are returned as structured objects to LM Studio.

## State and Caching

- Effective configuration cache: `src/settings.ts`.
- Skill list and search index caches: `src/scanner.ts`.
- Active filesystem watchers: `src/scanner.ts`.
- Prompt reinjection state: `src/preprocessor.ts`.
- All are process-local module state; there is no explicit lifecycle manager.

## Boundaries

- LM Studio boundary: `.lmstudio/entry.ts`, `src/index.ts`, `src/pluginTypes.ts`.
- Persistent user-state boundary: `src/settings.ts` and `src/constants.ts`.
- Host filesystem boundary: `src/scanner.ts`, `src/setup.ts`, `src/toolsProvider.ts`.
- Process boundary: `src/executor.ts`.
