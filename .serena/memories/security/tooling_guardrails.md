# Security and Tooling Guardrails

Command execution:
- `run_command` exists but is disabled by default via `commandExecutionMode: "disabled"`.
- Config setting lives in `src/config.ts` as `Command Execution Safety`.
- Persisted/effective setting lives in `src/settings.ts` and `src/types.ts`.
- Allowed modes:
  - `disabled`: block all model-issued commands.
  - `readOnly`: allow simple inspection commands only.
  - `guarded`: allow broader commands but still block dangerous patterns.
- Safety policy lives in `src/commandSafety.ts`.
- `validateCommandSafety(command, cfg.commandExecutionMode)` must run before runtime registry creation or shell execution in `run_command`.
- Blocked categories include destructive file operations, package managers, network/download tools, ssh/scp/rsync, mutating git commands, process killing, nested shells, encoded PowerShell, and redirection.
- Read-only mode also blocks shell metacharacters, redirects, pipes, command chaining, variable expansion, and mutating args such as `find -delete`, `find -exec`, `sed -i`.
- This is policy-level hardening, not a full OS sandbox. For untrusted workloads, use an external container/VM/locked-down WSL sandbox with read-only mounts, no network, and resource limits.

Tool schemas:
- Tool input validation is centralized in `src/toolSchemas.ts` using Zod.
- Schemas reject malformed model inputs before implementation logic runs:
  - empty required fields,
  - excessive lengths,
  - control/null characters,
  - path traversal (`..`) in skill-relative paths,
  - absolute paths where a relative skill path is required,
  - multiline commands,
  - invalid command timeout ranges,
  - invalid/oversized env vars.
- `read_skill_file.file_path` and `list_skill_files.sub_path` are intentionally relative-only. Absolute/display paths are accepted through `skill_name` for absolute skill/directory modes.
- Runtime path containment checks remain necessary even with schemas.

Context-overload protection:
- Normal prompt injection uses deterministic routing rather than a broad skills catalog.
- `src/skillRouter.ts` scores metadata/frontmatter and selects only up to `DEFAULT_MAX_ROUTED_SKILLS` candidates.
- `disable-model-invocation: true` excludes skills from automatic routing.
- Explicit `$skill-name` activations bypass routing and expand only the requested skill body.
- Full skill bodies are not injected for normal routed candidates; they are loaded by `read_skill_file` if needed.
- This protects model context from large skill sets and reduces distractor skills.

Explicit skill expansion safety:
- `$skill-name` reads and expands matching `SKILL.md` before the model reasons.
- Frontmatter is stripped from expanded body.
- Expansion is limited by existing file read size/truncation safeguards in `readFileSafe`.
- Explicit activation should not route or inject unrelated supplemental skills.
- Command-looking user payload remains task payload unless expanded skill instructions and command settings permit execution.

Timeouts and aborts:
- Timeout constants live in `src/constants.ts`:
  - `PREPROCESSOR_SCAN_TIMEOUT_MS = 3_000`.
  - `TOOL_READ_SKILL_FILE_TIMEOUT_MS = 30_000`.
  - `TOOL_LIST_SKILL_FILES_TIMEOUT_MS = 45_000`.
  - `TOOL_LIST_SKILLS_TIMEOUT_MS = 60_000`.
  - `TOOL_COMMAND_SETUP_TIMEOUT_MS = 15_000`.
- Timeout helper lives in `src/timeout.ts` and creates AbortSignals that cascade from LM Studio/user abort signals.
- Tool-level timeout wiring lives in `withToolLogging` inside `src/toolsProvider.ts`.
- Timeout result shape is structured with `success: false`, `timedOut: true`, `error`, and `hint`.
- Runtime subprocesses attach abort listeners and attempt to kill spawned processes on abort.
- Do not throw from subprocess data handlers on abort; ignore data after abort and let controlled abort path reject.

Diagnostics:
- Structured/human logs live in `src/diagnostics.ts`.
- Default logs are human-readable, not raw JSON.
- Verbose full JSON logs are enabled via `LMS_SKILLS_DEBUG=1`.
- Important events: `prompt_route`, `preprocess_activation`, `tool_start`, `tool_complete`, `tool_timeout`, `tool_error`, `skill_resolved`, `read_skill_file_result`, `list_skills_route_result`, `list_skills_exact_result`, `run_command_safety_check`, `run_command_result`, `runtime_exec_abort`, `runtime_exec_error`.
- Keep logs actionable and avoid dumping huge data. Use previews/counts/elapsed times, not full content.

High-risk areas for future changes:
- WSL command quoting and `wsl.exe` subprocess behavior.
- Any broadening of `guarded` command mode.
- Any bypass around `validateCommandSafety`.
- Absolute path read/list behavior.
- Schema changes that loosen path traversal or command constraints.
- Tool timeout values and abort propagation.
- Reintroducing broad skill catalog injection.
- Expanding multiple large `$skill` bodies without additional limits.