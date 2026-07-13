---
mapped_at: 2026-07-13
focus: concerns
---

# Concerns and Technical Debt

## Security Surface

- `src/toolsProvider.ts` exposes broad file read/write/patch/delete/move/rename/append operations to the model.
- `run_command` passes model-provided command strings to an operating-system shell through `src/executor.ts`.
- General workspace tools are not governed by one explicit workspace-root abstraction; path policy is distributed across implementations.
- Absolute skill paths use string-prefix containment, which requires careful handling of root equality, case sensitivity, separators, and symlinks.
- No approval, audit, denylist, or capability mode exists for destructive or command tools.

## Working Directory Behavior

- `resolveCwd()` in `src/executor.ts` silently falls back to the user home directory when the requested directory is missing or invalid.
- This can make commands succeed in an unintended location and is identified for redesign in `todo.md`.
- The current model has no per-chat workspace ownership or isolation.

## Cross-Platform Gaps

- Command execution is platform-aware, but filesystem operations remain host-native in `src/toolsProvider.ts` and `src/scanner.ts`.
- Adding WSL support only in `src/executor.ts` would make commands and file tools see different filesystems.
- Windows registry PATH expansion uses synchronous `execSync` calls and silently ignores failures.
- Shell override detection assumes non-PowerShell overrides accept `-c`, which is not valid for every shell.

## Reliability and Observability

- Many catch blocks suppress errors entirely in `src/settings.ts`, `src/scanner.ts`, and `src/executor.ts`.
- Silent fallback can hide corrupt settings, watcher failures, permission problems, and invalid paths.
- Module-level watchers have no explicit shutdown lifecycle.
- Process termination uses `SIGKILL`; on Windows or for process trees, child processes may survive.
- Output is accumulated in memory before truncation, so noisy commands can exceed the intended memory bound.

## Data and Cache Consistency

- Skill cache invalidation depends on filesystem watchers that may be unsupported or hit OS watch limits.
- Fallback non-recursive watchers may miss nested changes.
- Configuration caching and saving occur in the same resolver, coupling reads with disk writes.
- The semicolon path separator is awkward for portability and migration to richer workspace profiles.

## Maintainability

- `src/toolsProvider.ts` is large and contains many unrelated tool implementations in one module.
- Filesystem policy, formatting, validation, and operation logic are mixed together.
- There is no shared filesystem backend interface despite the planned Host/WSL requirement in `todo.md`.
- README settings documentation is partly stale relative to `src/config.ts`, which also contains shell settings and multiple paths.

## Test and Release Risk

- There are no automated tests, linting, coverage, or CI gates.
- Security-sensitive path and process behavior relies on manual validation.
- Generated `dist/` output can drift from `src/` unless rebuild discipline is maintained.
- Package version, manifest revision, README behavior, and generated output must be synchronized manually.

## Priority Remediation

1. Introduce an explicit workspace/backend abstraction shared by every filesystem and command tool.
2. Fail closed on invalid working directories instead of using the home directory.
3. Add path-boundary and symlink-aware containment checks.
4. Add unit and cross-platform integration tests before Host/WSL expansion.
5. Add approval and audit controls for command and destructive file tools.
6. Split `src/toolsProvider.ts` into focused tool modules backed by shared services.
