# Phase 05 Pattern Map

**Execution mode:** Inline substitution for `gsd-pattern-mapper`.

## `src/executor.ts`

Use `execCommand` exclusively for raw shell strings and `execProgram` for structured program/argument execution. Preserve the existing WSL argv patterns and keep Host shell resolution out of WSL branches.

## `src/workspaceFs.ts`

Treat `WorkspaceFileSystem` as the only workspace-facing filesystem boundary. Extend its dependencies or wrap it in a backend context rather than allowing tool implementations to call Node filesystem APIs directly.

## `src/workspace.ts` and `src/workspaceSelection.ts`

Compose resolved workspace context with Phase 4 status/capability facts. Preflight should consume these contracts and return structured failures before execution.

## `src/skillStore.ts`

Retain separate Host and WSL stores, but construct/select them from the same invocation backend used by commands and filesystem tools.

## `src/toolsProvider.ts`

Central orchestration seam. Build one invocation context per active chat/workspace and pass it to tools. Do not let individual tools independently rediscover environment, distribution, or workspace paths.

## Tests

- `test/executor.test.ts`: argv and shell semantics.
- `test/workspaceFs.test.ts`: no Host API use for WSL-native paths.
- `test/toolsProvider.integration.test.ts`: command/filesystem/discovery consistency.
- `test/skillStore.test.ts`: selected-backend skill behavior.
- New preflight/error tests: decision matrix and stable recovery codes.

## Data Flow

Per-chat config → workspace/capability resolution → preflight → selected backend context → command/filesystem/discovery/skill operation → structured success or recovery error.
