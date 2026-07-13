# Stack Research

## Recommendation

Retain the existing strict TypeScript, Node.js, CommonJS, LM Studio SDK, and Zod stack. Add no heavyweight WSL library; use Windows' `wsl.exe` CLI through argument-based `child_process.spawn`/`execFile` calls.

## Components

- TypeScript source under `src/`, compiled by `tsc`.
- Existing `@lmstudio/sdk` configuration and tool APIs.
- Existing `zod` validation for new execution/workspace settings.
- Node `child_process` for WSL discovery and command dispatch.
- Node `path`, `fs`, and `os` for host workspace management.
- A small internal path translator for Windows drive paths, UNC `\\wsl$` paths, and Linux paths.
- Node's built-in test runner or a lightweight TypeScript test setup for unit and integration tests.

## Prescriptive Decisions

1. Invoke `wsl.exe` with an argument array, including `--distribution`, rather than interpolating one shell string.
2. Keep execution routing behind one `ExecutionContext`/adapter boundary so tools do not know shell details.
3. Store WSL-mode projects in the selected distribution's Linux filesystem by default; cross-filesystem access is supported only through explicit translation.
4. Treat current Host mode as the compatibility default.

## Avoid

- Do not add Docker, SSH, or remote-execution abstractions.
- Do not parse human-formatted WSL tables when a stable list form can be normalized.
- Do not use `wslpath` as the only translator because translation must also be testable when WSL is unavailable.

## Confidence

High for retaining the current stack and using `wsl.exe`; medium for exact CLI parsing details until validated against representative Windows/WSL versions.
