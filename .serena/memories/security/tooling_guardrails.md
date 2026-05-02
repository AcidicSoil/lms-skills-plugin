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
- This is policy-level hardening, not a full OS sandbox. For untrusted workloads, use external container/VM/locked-down WSL sandbox with read-only mounts, no network, and resource limits.

Filesystem tools:
- `read_file` reads UTF-8 text files by absolute or environment-prefixed path, but only when the resolved path is inside a configured skill root.
- `write_file` and `edit_file` are mutating tools and require `commandExecutionMode: "guarded"`; they still remain restricted to configured skill roots.
- File operation content/edit text is capped by UTF-8 byte length (`MAX_FILE_WRITE_BYTES`) and normal multiline edit text is allowed.
- `edit_file.expected_replacements` should be used when broad replacement would be risky.

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

Prompt/context safety:
- Normal prompt injection must use deterministic routing, not broad skill catalog injection.
- Explicit `$skill-name` expansion is deterministic and pre-model:
  - lowercase `$skill-name` activates skills,
  - uppercase shell variables like `$HOME` are ignored and preserved as payload,
  - matching skill body is expanded into `<skill_invocation_packet>`,
  - user payload is rewritten into `<task_payload for_expanded_skills="...">`,
  - `$skill-name` token is removed from the payload.
- Context-injection audit logs are a safety/debugging requirement:
  - `kind=explicit_expanded` proves expanded skill context was injected,
  - `kind=routed` proves routed metadata context was injected,
  - `kind=reminder`/`kind=fallback` proves no skill body was injected.
- Context logs include short hashes/previews so injected context can be compared without dumping full large prompt bodies.

Timeouts and aborts:
- Timeout constants live in `src/constants.ts`:
  - `PREPROCESSOR_SCAN_TIMEOUT_MS = 3_000`.
  - `TOOL_READ_SKILL_FILE_TIMEOUT_MS = 30_000`.
  - `TOOL_LIST_SKILL_FILES_TIMEOUT_MS = 45_000`.
  - `TOOL_LIST_SKILLS_TIMEOUT_MS = 60_000`.
  - `TOOL_FILE_OPERATION_TIMEOUT_MS = 30_000`.
  - `TOOL_COMMAND_SETUP_TIMEOUT_MS = 15_000`.
- Timeout helper lives in `src/timeout.ts` and creates AbortSignals that cascade from LM Studio/user abort signals.
- Tool-level timeout wiring lives in `withToolLogging` inside `src/toolsProvider.ts`.
- Timeout result shape is structured with `success: false`, `timedOut: true`, `error`, and `hint`.
- Runtime subprocesses attach abort listeners and attempt to kill spawned processes on abort.
- Do not throw from subprocess data handlers on abort; ignore data after abort and let controlled abort path reject.

Diagnostics:
- Structured logging lives in `src/diagnostics.ts`.
- Default logs are concise and human-readable. Verbose JSON logs are enabled via `LMS_SKILLS_DEBUG=1`.
- Important events: `context_injection`, `prompt_route`, `preprocess_activation`, `tool_start`, `tool_complete`, `tool_timeout`, `tool_error`, `skill_resolved`, `read_skill_file_result`, `list_skills_route_result`, `run_command_safety_check`, `run_command_result`, `runtime_exec_abort`, `runtime_exec_error`.
- Keep logs actionable and avoid dumping huge data. Use previews/counts/hashes/elapsed times, not full content.

High-risk areas for future changes:
- WSL command quoting and `wsl.exe` subprocess behavior.
- Any broadening of `guarded` command mode.
- Any bypass around `validateCommandSafety`.
- Any reintroduction of broad `<available_skills>` injection.
- Any weakening of explicit `$skill-name` payload rewrite or `$HOME` ignore behavior.
- Absolute path read/list/write/edit behavior.
- Schema changes that loosen path traversal or command constraints.
- Tool timeout values and abort propagation.