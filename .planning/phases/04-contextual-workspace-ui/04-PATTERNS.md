# Phase 04 Pattern Map

**Execution mode:** Inline substitution for `gsd-pattern-mapper`.

## `src/settings.ts` — persistence and normalization

**Role:** Single source of truth for persisted plugin settings and backward-compatible defaults.

**Analog:** Existing `normalizeSettings`, `loadSettings`, `saveSettings`, and effective-config resolution.

**Reuse:** Extend the existing normalization path for workspace-profile/default fields. Preserve empty `wslDistribution` as system-default semantics. Do not introduce a second settings store.

## `src/workspace.ts` / new `src/workspaceSelection.ts` — workspace domain model

**Role:** Backend-aware resolution plus pure user-visible selection/status derivation.

**Analog:** Existing `resolveWorkspaceContext` discriminates Host and WSL paths and enforces deterministic workspace behavior.

**Reuse:** Keep filesystem probing in backend-specific workspace/capability modules. Make the new status derivation pure and consume validation facts rather than calling Host APIs directly.

## `src/wslCapability.ts` — WSL capability state

**Role:** Detect executable, installed distributions, default distribution, and selected-override availability.

**Analog:** Existing capability detector and error-code contract.

**Reuse:** Extend the existing discriminated union; do not duplicate `wsl.exe` probing in config or tool code. Refresh returns a transient new probe result and never mutates settings.

## `src/config.ts` — static bootstrap configuration

**Role:** Register stable per-chat/global fields through `createConfigSchematics()`.

**Analog:** Current static field chain and official LM Studio plugin examples.

**Reuse:** Retain execution-environment bootstrap and explanatory defaults. Do not attempt unsupported conditional visibility in schematics.

## `src/toolsProvider.ts` — contextual configuration and status surface

**Role:** Construct tools for the current chat/environment and enforce the same active workspace context used by execution.

**Analog:** Existing tools array construction and controller-based per-chat config reads.

**Reuse:** Read the current execution environment before constructing the tool list. Register only the Host configuration tool in Host mode and only the WSL configuration tool in WSL mode. Add read-only status/refresh tools that delegate to `workspaceSelection.ts` and `wslCapability.ts`.

## Tests

- `test/settings.test.ts`: normalization and compatibility analog.
- `test/wslCapability.test.ts`: capability-code analog.
- `test/toolsProvider.integration.test.ts`: per-chat tool-list and execution behavior analog.
- New `test/workspaceSelection.test.ts`: pure status-state coverage.

## Data Flow

`LM Studio per-chat config` → `settings normalization` → `active profile/selection` → selected backend validation → pure workspace status → environment-specific tool list/status response → workspace-facing execution.
