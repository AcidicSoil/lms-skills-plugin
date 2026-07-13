# Phase 1 Context: Execution and Path Foundation

## Ingested Source

Source: `todo.md` (narrative ADR/PRD), ingested 2026-07-13.

## Locked Decisions

- Host and WSL are explicit execution environments.
- Host remains the compatibility default; WSL is Windows-only.
- WSL uses the user's default distribution in the first release.
- There is no silent Host↔WSL fallback.
- `run_command` keeps its raw shell-string public contract.
- WSL `run_command` executes through a known shell inside WSL; arbitrary strings are not heuristically tokenized.
- Internal structured operations use direct program-plus-argument execution where possible.
- Invalid or missing workspace/cwd returns a structured error; it must not fall back to the home directory.
- WSL-native paths remain WSL-native; do not silently translate Windows paths to `/mnt/<drive>`.
- Path validation and canonicalization occur in the selected execution environment.
- Phase 1 is limited to settings, capability detection, path policy, execution adapters, safety limits, and foundational tests.

## Scope Fences

- Do not implement persistent workspace profiles, lifecycle, grants, audit retention, session continuity, or approval UI in Phase 1.
- Do not invent LM Studio session or confirmation APIs.
- Do not route all filesystem tools yet; that belongs to Phase 2.
- Do not install WSL, change the default distribution, or silently select a different distribution.
- Do not add remote, container, or SSH execution.

## Existing-Code Constraints

- `src/config.ts` and `src/settings.ts` are the current settings extension points.
- `src/executor.ts` currently accepts a shell string and silently falls back to the home directory.
- `src/toolsProvider.ts` passes `cwd` directly to `execCommand`.
- Strict TypeScript and CommonJS output must remain intact.
- Generated `dist/` must be rebuilt from source.

## Phase Outcome

A tested execution foundation that can represent Host/WSL selection, detect WSL readiness, validate environment-native paths, enforce containment, and execute commands through explicit Host and WSL adapters without compatibility regressions.
