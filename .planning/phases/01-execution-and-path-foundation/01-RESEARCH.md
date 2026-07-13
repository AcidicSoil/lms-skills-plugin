# Phase 1 Research: Execution and Path Foundation

## Existing Baseline

`src/config.ts` has static LM Studio fields for shell selection. `src/settings.ts` persists a flat global shape and caches it process-wide. `src/executor.ts` resolves a host shell, treats commands as shell strings, and maps missing or invalid cwd to `os.homedir()`. No test framework exists.

## Recommended Design

### Settings

Add `ExecutionEnvironment = "host" | "wsl"` plus `executionEnvironment` and optional `wslDistribution` to persisted/effective settings. Missing legacy fields normalize to Host. Keep workspace selection out of Phase 1 except for strict cwd/path primitives required by later phases.

### WSL Capability

Create a small Windows-only capability module. Inject the process runner so tests can cover unavailable WSL, no distributions, default distribution, and command errors without requiring Windows. Represent readiness as a discriminated union rather than exceptions or booleans.

### Path Policy

Create pure classification/translation helpers for Windows-drive, WSL UNC, Linux-absolute, relative, and invalid paths. Phase 1 should reject paths from the wrong environment rather than silently translate them. Add canonical containment helpers with platform-aware case behavior and separator-boundary checks. Filesystem canonicalization should be injectable for symlink/junction tests.

### Execution Adapters

Split execution into a shared request/result contract and Host/WSL adapters.

- Host shell mode retains the current public command-string behavior.
- WSL shell mode invokes `wsl.exe` with an argument array, explicit distribution when configured, `--cd`, then a known shell and `-lc`/equivalent command string.
- Structured direct mode supports internal program-plus-argument calls using WSL `--exec`.
- Never construct one interpolated `wsl.exe` command string.
- Strict cwd validation replaces home fallback.

### Process Safety

Preserve timeout and output limits. Centralize child-process collection/truncation. Return structured spawn, timeout, and termination diagnostics. On Windows, use a bounded process-tree termination strategy where possible and expose whether cleanup may be incomplete.

### Tests

Use Node's built-in `node:test` to avoid adding a runtime dependency. Compile tests with TypeScript into a separate output or place JS tests against built modules. The simplest repository fit is TypeScript tests included by a dedicated test tsconfig and run after build.

## Plan Shape

1. Settings, capability detection, and test harness.
2. Path classification, strict cwd, and containment.
3. Host/WSL execution adapters and compatibility integration.

Plans 1 and 2 can run in parallel if they avoid overlapping source files; Plan 3 depends on both contracts.

## Verification Focus

- Every Phase 1 requirement is assigned once.
- No plan implements Phase 2 workspace profiles/tool routing.
- `run_command` remains a shell-string API.
- No silent environment fallback or invalid-cwd home fallback remains.
- Argument boundaries are testable without a live WSL installation.
