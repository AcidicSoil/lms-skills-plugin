# Phase 5: Backend Guarantees and Validation - Research

**Researched:** 2026-07-14
**Domain:** Host/WSL backend routing, command contracts, preflight validation, and structured recovery errors
**Execution mode:** Inline substitution for `gsd-phase-researcher`

## Findings

- `src/executor.ts` already separates raw shell execution (`execCommand`) from structured program/argument execution (`execProgram`). WSL raw commands use `wsl.exe --exec /bin/bash -lc <command>`, while structured WSL execution uses `wsl.exe --exec <program> <args...>`. [VERIFIED: codebase]
- Host shell settings affect only `execCommand` in Host mode; the WSL branch ignores Host shell selection. [VERIFIED: codebase]
- `src/workspaceFs.ts` already has a backend abstraction with Host direct filesystem operations and WSL direct program execution. The main planning risk is bypasses from callers, not absence of an abstraction. [VERIFIED: codebase]
- `src/skillStore.ts` has separate Host and WSL stores, but repository/tool discovery and workspace-facing orchestration must be checked for direct Node filesystem or process use. [VERIFIED: codebase]
- Phase 4 introduced explicit workspace status and detailed WSL capability states. Phase 5 should consume those contracts in one preflight layer rather than duplicate checks across every tool. [VERIFIED: codebase]
- Existing public tool failures are inconsistent objects/strings. A stable discriminated recovery-error contract is needed before invocation. [VERIFIED: codebase]

## Recommended Architecture

1. Add a backend-neutral `WorkspaceBackend`/`InvocationContext` contract that owns command execution, structured program execution, filesystem access, and discovery for one selected Host or WSL workspace.
2. Add one pure preflight validator that checks environment, capability, distribution, workspace status, and tool compatibility before tool implementation runs.
3. Preserve the raw/structured execution split explicitly in types and tests; never parse raw shell strings into argv.
4. Introduce stable error codes and recovery actions, while retaining human-readable messages for compatibility.
5. Migrate repository/tool/skill discovery call sites to the selected backend and add tests that fail if WSL-native paths reach Host APIs.

## Required Error Categories

- `workspace-invalid`
- `environment-unavailable`
- `distribution-missing`
- `tool-incompatible`
- `approval-denied`
- `identity-mismatch`
- `termination-unresolved`

## Validation Architecture

- Unit tests: executor argv/shell contracts, preflight decision matrix, structured error mapping.
- Integration tests: Host/WSL settings isolation, backend consistency across command/filesystem/discovery/skills, invalid-path no-fallback, distribution deletion/misspelling/default changes, user-visible capability errors.
- Final gate: `npm test && npm run build && npm run verify:release && git diff --check`.

## Pitfalls

- Calling `fs`, `path.resolve`, `process.cwd`, or repository discovery directly on a WSL-native path.
- Treating raw commands as tokenizable argv.
- Applying Host `shellPath`/`windowsShell` to WSL execution.
- Performing validation after an executor or filesystem operation has already begun.
- Returning only free-form error text that clients cannot recover from deterministically.

## Planning Implications

- Plan 05-01: formalize command contracts and backend-neutral invocation/preflight types.
- Plan 05-02: route filesystem, repository, tool, and skill workflows through the selected backend.
- Plan 05-03: structured recovery errors plus complete Host/WSL integration and release verification.
