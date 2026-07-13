---
mapped_at: 2026-07-13
focus: quality
---

# Testing

## Current State

The repository has no automated test suite at mapping time.

- No test or spec files were found.
- `package.json` has no `test` script.
- No Jest, Vitest, Mocha, Node test runner, or assertion library dependency is present.
- No coverage tool or coverage configuration is present.
- No GitHub Actions or other CI configuration was found.

## Existing Verification

- `npm run build` provides TypeScript compilation as the only automated correctness gate.
- `npm run dev` compiles before launching LM Studio development mode.
- Runtime behavior is primarily validated manually inside LM Studio.
- Generated files in `dist/` indicate prior compilation but are not a substitute for tests.

## High-Value Unit Test Targets

- `src/executor.ts`: platform detection, shell resolution, timeout clamping, output truncation, line-ending normalization, and working-directory fallback.
- `src/settings.ts`: persisted settings migration, default handling, reset sentinel, multi-path parsing, and cache behavior.
- `src/scanner.ts`: description extraction, manifest overrides, deduplication, search ranking, path containment, large-file truncation, and directory limits.
- `src/preprocessor.ts`: message-shape extraction, explicit skill parsing, injection precedence, unresolved references, and reinjection timing.
- `src/toolsProvider.ts`: Zod validation and file-operation safety behavior.

## Integration Test Targets

- LM Studio registration through `src/index.ts` and `.lmstudio/entry.ts`.
- Temporary-directory skill discovery and watcher invalidation.
- End-to-end settings persistence under a temporary home directory.
- Filesystem tool operations constrained to a temporary workspace.
- Command execution against known commands on Linux, macOS, Windows CMD, and PowerShell.

## Cross-Platform Matrix

- Linux with bash and sh.
- macOS with zsh/bash behavior.
- Windows with `cmd.exe`.
- Windows with PowerShell 5.1 and PowerShell 7 when available.
- WSL routing after the planned backend abstraction in `todo.md` is implemented.

## Recommended Test Infrastructure

- Use Vitest or Node's built-in test runner for TypeScript-friendly unit tests.
- Inject or mock filesystem, process platform, environment variables, clock, and child processes.
- Use temporary directories rather than real user home directories.
- Add CI that runs install, build, tests, and coverage on Linux and Windows.

## Coverage Priorities

Security-sensitive path containment and destructive file operations should be covered before search-ranking refinements. Process timeout and fallback behavior should be tested before expanding shell/backend support.
