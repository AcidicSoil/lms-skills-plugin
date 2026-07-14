<!-- refreshed: 2026-07-14 -->
# Architecture

**Analysis Date:** 2026-07-14

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│ LM Studio Plugin Host                                       │
│ `.lmstudio/entry.ts` → `src/index.ts`                       │
├──────────────────┬──────────────────┬───────────────────────┤
│ Config           │ Prompt pipeline  │ Public tools          │
│ `src/config.ts`  │ `src/preprocessor.ts`                    │
│ `src/settings.ts`│                  │ `src/toolsProvider.ts` │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Environment-aware services                                  │
│ `src/skillStore.ts` · `src/workspace.ts`                    │
│ `src/workspaceFs.ts` · `src/executor.ts`                    │
└────────┬───────────────────────────┬────────────────────────┘
         │                           │
         ▼                           ▼
┌──────────────────────┐   ┌──────────────────────────────────┐
│ Host filesystem/shell│   │ WSL via `wsl.exe` + `/bin/bash` │
└──────────────────────┘   └──────────────────────────────────┘
```

## Entry and Registration

- `.lmstudio/entry.ts` creates the LM Studio client and registration host.
- `src/index.ts` is the application entry point.
- Register exactly one configuration schema, tools provider, and prompt preprocessor.
- Keep startup orchestration thin; place behavior in dedicated modules.

## Configuration Layer

- `src/config.ts` defines LM Studio-visible fields and defaults.
- `src/settings.ts` merges live plugin settings with persisted settings and normalizes environment-specific paths.
- `src/constants.ts` centralizes limits, paths, regexes, and timeouts.
- `src/types.ts` owns cross-module domain types.

Use `resolveEffectiveConfig()` as the single configuration read boundary. Do not read LM Studio config directly from feature modules.

## Skill Pipeline

- `src/scanner.ts` implements Host skill scanning, manifests, metadata extraction, search indexing, and Host directory reads.
- `src/skillStore.ts` abstracts Host and WSL skill access behind one async contract.
- `src/preprocessor.ts` uses the same `SkillStore` contract for automatic skill injection and explicit `/skill-name` activation.
- `src/toolsProvider.ts` uses the same store for `list_skills`, `read_skill_file`, and `list_skill_files`.

Environment selection must apply equally to tools and prompt preprocessing. New skill features should be added to `SkillStore`, not directly to Host scanner APIs.

## Workspace Pipeline

- `src/workspace.ts` derives deterministic workspace identity and creates Host or WSL-native roots.
- `src/pathPolicy.ts` classifies paths and applies environment/path containment rules.
- `src/workspaceFs.ts` exposes one filesystem contract for Host and WSL implementations.
- `src/toolsProvider.ts` lazily resolves one workspace and one filesystem instance per provider.

Project file tools remain rooted at `workspace.nativeRoot`. `change_directory` mutates only the default command cwd, not file-tool resolution.

## Execution Pipeline

- `src/executor.ts` builds execution specs and runs Host or WSL commands.
- Host Windows supports `cmd`, PowerShell, Git Bash, or explicit shell paths.
- WSL always runs `/bin/bash -lc` inside the selected distribution.
- `execProgram()` is the structured argv/stdin boundary for non-shell operations.
- `execCommand()` is the raw command-string boundary for `run_command`.

Preserve this split: use `execProgram()` for filesystem/capability operations and `execCommand()` only for model-requested shell commands.

## Public Tool Layer

`src/toolsProvider.ts` defines 15 public tools and their Zod schemas. It also owns:

- lazy dependency creation;
- shared workspace state;
- persistent command cwd;
- tool-level response shaping;
- dependency injection seams for tests.

The exported `PUBLIC_TOOL_NAMES` array is the compatibility contract. Add or rename tools deliberately and update compatibility tests.

## Dependency Direction

Preferred dependency flow:

```text
index/config/tools/preprocessor
        ↓
settings + domain services
        ↓
path/executor/scanner primitives
        ↓
Node APIs and WSL
```

Avoid importing `toolsProvider.ts` from lower-level modules. Keep primitives independent from LM Studio SDK types where possible.

## State and Caching

- Global config cache: `src/settings.ts`.
- Host scanner/search caches: `src/scanner.ts`.
- Prompt injection state: `WeakMap`-style provider state in `src/preprocessor.ts`.
- Per-provider workspace and cwd state: closures in `src/toolsProvider.ts`.

Any new cache must document invalidation. Environment changes must never reuse stale Host/WSL state.

## Error Model

- Lower-level services throw contextual `Error` objects for failed operations.
- Tools catch errors and return `{ success: false, error }`.
- WSL readiness uses typed capability results before workspace mutation.
- Timeout results distinguish `timedOut` and `terminationIncomplete`.

Prefer contextual errors naming the environment, distribution, path, and operation.

## Security Boundaries

- Canonical containment is enforced by `src/pathPolicy.ts` and `src/workspaceFs.ts`.
- Skill roots and project workspaces are separate trust boundaries.
- WSL wrong-environment paths are rejected rather than translated.
- Structured argv/stdin is required for WSL file operations.
- The workspace is containment policy, not an OS sandbox; shell commands retain user permissions.

## Where to Add New Code

- New plugin setting: `src/config.ts`, `src/settings.ts`, `src/types.ts`, and settings tests.
- New project file operation: extend `WorkspaceFileSystem` in `src/workspaceFs.ts`, then add a tool in `src/toolsProvider.ts`.
- New skill operation: extend `SkillStore` in `src/skillStore.ts`, with Host primitives in `src/scanner.ts` if needed.
- New execution backend behavior: `src/executor.ts` and `src/pathPolicy.ts`.
- New WSL capability: `src/wslCapability.ts` and workspace diagnostics tests.

---

*Architecture analysis: 2026-07-14*
