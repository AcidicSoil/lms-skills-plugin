# Taskmaster Workload Context

The Taskmaster PRD and tasks originally described an environment-aware Windows/WSL skills runtime. The implementation has evolved beyond the original first pass.

Original implementation themes:
- Foundation types and environment logic.
- Windows runtime adapter.
- WSL runtime adapter.
- Environment-aware path resolver.
- Command executor target routing.
- Configuration/settings migration.
- Scanner refactor for environment isolation.
- Skill file operations through runtime adapters.
- Environment metadata in tools/prompts.
- Bootstrap/diagnostics improvements.

Current state highlights:
- Environment-aware runtime support exists in `src/environment.ts`, `src/runtime/*`, and `src/pathResolver.ts`.
- Config/settings now include `skillsEnvironment`, `wslDistro`, `windowsShellPath`, `wslShellPath`, legacy `shellPath`, and `commandExecutionMode`.
- Scanner reads/list/search operations are adapter-based and support exact skill lookup before full scans.
- Tools include environment metadata and timeout/logging/safety behavior.
- Prompt injection is internal, no system prompt required.
- Explicit `$skill-name` activation exists and is a key feature.
- README has been synced to current behavior.

If resuming Taskmaster bookkeeping:
- Do not blindly mark all tasks done without functional validation.
- Code compiles with `npm run build`.
- Still desirable to do manual LM Studio testing on Windows+WSL for:
  - WSL path expansion and distro selection.
  - `Both` mode duplicate/label behavior.
  - prompt preprocessor abort behavior.
  - tool-level timeout behavior.
  - command safety disabled/readOnly/guarded modes.
  - explicit `$skill-name` activation in real model runs.

Known caveats:
- No formal automated test suite is configured.
- Command safety is not a true sandbox.
- Some runtime filesystem operations on Windows host + WSL still rely on subprocess calls, so performance/quoting should be tested in real WSL.
- `.env.example` has previously appeared as deleted in git status but was not intentionally changed by README/onboarding work; check before committing.