---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: concerns
---
# Codebase Concerns

## High-Priority Risks

### Broad Local Authority

`src/toolsProvider.ts` exposes general filesystem mutation and arbitrary shell commands. Safety depends on path validation, host permissions, user intent, and model behavior.

### Path Boundaries

Resolved-path prefix checks must account for separators, equality, Windows case behavior, symlinks, junctions, and time-of-check/time-of-use races. Absolute skill read/list paths deserve focused tests.

### Process Termination

`src/executor.ts` kills the spawned shell on timeout, but descendants may survive, especially on Windows or when commands create process trees.

## Reliability

### Silent Failures

Scanner helpers often return empty results after exceptions, and `src/settings.ts` ignores save failures. Permission errors, malformed files, watcher limits, and persistence problems can be hard to diagnose.

### Global Mutable Caches

`src/scanner.ts` and `src/settings.ts` use module-level caches. Multiple controllers or configurations in one process may share stale state.

### Watcher Lifecycle

Watchers are replaced when paths change but have no explicit shutdown hook. Non-recursive fallback may miss nested modifications, while recursive watches may be expensive or unsupported.

### Bootstrap Behavior

`src/setup.ts` copies samples only when the entire default directory is absent. Existing empty or partially initialized roots receive no samples.

## Security

### Untrusted Skill Instructions

Skill bodies are intentionally promoted into prompt context and can combine with file or shell tools. Installing untrusted skills creates a strong prompt-injection boundary.

### Markup Escaping

Names, descriptions, and bodies are inserted into XML-like tags without escaping in `src/preprocessor.ts`; crafted content can break or spoof structure.

### Environment Exposure

`src/executor.ts` inherits the host environment, so commands can access credentials and variables available to the plugin process.

## Maintainability

`src/toolsProvider.ts` is a large mixed-responsibility module. `dist/` duplicates source and can drift. Documentation defaults should be checked against `src/config.ts` and `src/constants.ts`.

## Quality Gaps

- No automated tests or coverage.
- No lint or format configuration.
- No visible CI.
- No Node engine declaration.
- No structured debug logging.

## Planned Evolution

`todo.md` proposes host/WSL execution and per-chat workspaces. That increases path translation, isolation, lifecycle, and security complexity, so executor/filesystem regression tests should precede it.
