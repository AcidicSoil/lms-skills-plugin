## Interpreted Request

Extend the `khtsly/skills` fork with two integrated capabilities:

1. **First-class Host/WSL execution**

   * `Host` and `WSL` are explicit execution environments.
   * The selected environment governs command execution, filesystem access, path validation, tool discovery, repository detection, and subprocesses.
   * WSL uses the user’s default distribution and WSL-native paths.
   * There is no silent Host↔WSL fallback.

2. **Per-chat project workspaces**

   * The sidebar exposes one contextual workspace setting.
   * The active workspace is per-chat.
   * Persistent workspace profiles retain project-specific paths, settings, lightweight session references, permissions, and lifecycle state.
   * A workspace is the default execution and filesystem boundary.

For the final command-launch decision: use **structured direct execution where the caller has a program and argument array**. Preserve the existing `run_command` shell-string contract by running it through a shell inside WSL; do not heuristically parse arbitrary command strings into arguments.

## Codebase Evidence

* `src/config.ts` already defines sidebar settings through `createConfigSchematics`, including `shellPath` and `windowsShell`. This is the existing extension point for `executionEnvironment` and the contextual workspace field. LM Studio documents ordinary plugin configuration as per-chat by default, which directly supports the agreed chat-scoped selection. ([LM Studio][1])
* `src/settings.ts` persists plugin settings to a JSON file and maintains a configuration cache. Its current model is plugin-wide and contains no workspace profiles or per-environment paths. ([LM Studio][2])
* `src/types.ts` defines only the current global settings shape: skill paths, injection settings, shell path, and Windows shell preference. ([LM Studio][3])
* `src/executor.ts` recognizes only `windows`, `macos`, and `linux`. It resolves a host shell, executes a single shell-command string, and silently substitutes the host home directory when `cwd` is absent or invalid. That fallback conflicts with the agreed workspace behavior. ([LM Studio][4])
* `src/toolsProvider.ts` passes the optional `cwd` from `run_command` directly to the executor. The tool description currently documents home-directory fallback. ([LM Studio][5])
* The file-management tools use Node’s host-side `fs`, `path`, and `os` APIs directly. Consequently, changing only `run_command` would not provide end-to-end WSL support: `read_file`, `write_file`, `patch_file`, directory operations, move, and delete would still operate on the Windows side. ([LM Studio][5])
* `delete_file` and other mutating tools currently perform operations directly without an evidenced workspace-boundary or authorization layer. ([LM Studio][5])
* `src/pluginTypes.ts` exposes only the locally modeled configuration, tool-provider, and prompt-preprocessor hooks. It does not establish APIs for session enumeration, custom confirmation dialogs, dynamic select options, or invocation ownership. ([LM Studio][6])
* Microsoft documents the default WSL distribution, status and distribution-listing commands, and WSL’s `--cd`, `--exec`, and `--distribution` execution options. `--exec` runs a binary without invoking a shell, making it appropriate for structured program-and-argument requests. ([Microsoft Learn][7])
* The visible `package.json` has build, development, and publish scripts but no test script or evidenced test framework. ([LM Studio][8])

The linked upstream source was inspected through explicit tool results. The actual fork snapshot and any fork-specific changes were not supplied, so differences in the fork remain **Unknown**. This limitation follows the supplied repository-evidence constraints.

## Assumptions

* **Assumption:** The fork still broadly resembles the linked upstream `1.0.7` structure.
* **Unknown:** Whether LM Studio supports dynamically populated sidebar selectors or disabling individual select options at runtime.
* **Unknown:** Whether the plugin SDK exposes stable chat/session identifiers, session enumeration, or session reopening.
* **Unknown:** Whether the SDK provides native per-invocation confirmation UI for environment, path-boundary, and destructive-operation overrides.
* **Unknown:** Whether the fork already contains tests, workspace abstractions, or additional execution code not visible in the linked upstream source.
* **Assumption:** The first release uses the user’s default WSL distribution. Distribution-specific overrides remain an extensibility point, not initial UI.

## Recommended Implementation Path

### 1. Introduce the configuration contract

Add per-chat fields to `configSchematics`:

* `executionEnvironment`: `host | wsl`
* `workspacePath`: one contextual path field interpreted according to the selected environment

Behavior:

* On non-Windows systems, only Host execution is valid.
* On Windows, WSL is available only after capability detection succeeds.
* Host requires a host-native absolute path.
* WSL requires a WSL-native absolute path such as `/home/user/project`.
* Do not translate Windows paths into `/mnt/<drive>/...`.
* An unset workspace is allowed for workspace-independent tools.
* A workspace-required tool returns a structured configuration-required error before execution.
* An invalid configured workspace is an error; it must never fall back to the home directory.

LM Studio’s ordinary configuration is per-chat, so the active environment and workspace belong in normal schematics rather than global configuration. ([GitHub][9])

### 2. Separate persistent profiles from per-chat selection

Create a plugin-owned workspace-profile store. A proposed profile contains:

* stable generated ID;
* editable display name;
* optional Host path;
* optional WSL path;
* lightweight host session references, where supported;
* workspace-specific external-path grants;
* repository-identity evidence;
* audit metadata;
* soft-delete timestamp.

The **active selection remains per-chat**. Durable profiles are shared plugin metadata so returning to a project does not discard its settings.

Selecting a previously unseen valid path should automatically create a profile named from the directory. Host and WSL paths attach to the same profile only through explicit user action.

Do not store transcripts. The host application remains authoritative for chat/session content.

### 3. Add an immutable execution context

Before invoking any workspace-aware tool, resolve an execution context containing:

* active workspace profile;
* selected environment;
* effective environment-specific workspace path;
* canonical workspace root;
* applicable external-path grants;
* approved one-time overrides;
* invocation identifier.

Resolve this once per invocation. Do not reread and silently change its environment or workspace during execution.

Workspace switching and profile deletion remain blocked while the profile owns an active or unresolved invocation.

### 4. Split execution into Host and WSL backends

Introduce a backend contract used by **all** command and filesystem tools.

**Host backend**

* Reuse Node filesystem and `child_process` behavior.
* Replace `resolveCwd` fallback with explicit validation failure.
* Canonicalize paths before boundary checks.

**WSL backend**

* Invoke `wsl.exe` from Windows.
* Use the user’s default distribution initially.
* Validate paths and perform filesystem work inside WSL.
* Do not route WSL-native paths through host `fs`.
* Do not fall back to host executables when a WSL command fails.

This backend split is the key architectural change. Updating only `execCommand` would leave most tools operating against the wrong filesystem.

### 5. Use two explicit command modes

Create an internal execution request with two modes:

* **Argument mode:** program plus argument array.
* **Shell mode:** an intentionally supplied shell-command string.

For argument mode under WSL:

```text
wsl.exe --cd <workspace> --exec <program> <arg1> <arg2> ...
```

For the existing `run_command` tool:

* Preserve the raw command-string API for compatibility.
* Execute it through a known shell inside WSL.
* Do not attempt to infer whether the string contains shell syntax.
* Do not parse it into arguments with a home-grown tokenizer.

New internal filesystem and capability operations should use argument mode wherever possible. Shell mode is reserved for the existing shell-command contract and operations that intentionally need pipelines, redirection, expansion, or compound expressions. Microsoft distinguishes `--exec` as direct binary invocation and provides `--cd` for the Linux working directory. ([Microsoft Learn][10])

### 6. Route every workspace-facing tool through the backend

Refactor these evidenced tools:

* `run_command`
* `get_current_directory`
* `read_file`
* `write_file`
* `patch_file`
* `create_directory`
* `list_directory`
* `delete_file`
* `move_file`
* any remaining absolute-path tools in `toolsProvider.ts`

Each tool should declare an explicit local policy:

* workspace-independent;
* workspace-optional;
* workspace-required;
* destructive;
* environment compatibility.

Do not infer workspace requirements from whether a supplied path is relative.

Skill-directory operations may remain plugin-data scoped, but their environment and boundary semantics must be explicitly reviewed rather than assumed.

### 7. Enforce workspace and environment boundaries

Normal execution permits:

* the selected execution environment;
* the configured workspace root and descendants;
* explicitly persisted external grants for that workspace and environment.

Exceptional access uses separate controls:

* environment override;
* outside-workspace path override;
* destructive-operation approval.

Overrides are per invocation by default. Persistent external grants are workspace-specific, environment-specific, canonical-path-specific, and default to read-only.

Deletion, recursive deletion, destination overwrite, and boundary-crossing moves require a bounded preview and explicit approval. Expanding the disclosed operation set requires new approval.

Because the available plugin APIs do not establish a native confirmation-dialog mechanism, implement this layer only through an evidenced host approval API. Until that is verified, fail closed rather than substituting a broad persistent “allow unsafe operations” setting.

### 8. Add WSL capability detection

On Windows:

* perform a lightweight startup check;
* recheck when settings are opened or refreshed;
* perform an authoritative preflight before WSL execution;
* distinguish missing WSL, no distribution, unavailable distribution, and ready state.

Use the default distribution. Do not install WSL or change system defaults.

Microsoft documents `wsl --status`, `wsl --list --verbose`, and default-distribution management as the relevant system interfaces. ([Microsoft Learn][7])

### 9. Implement workspace lifecycle

Required profile states:

* active;
* unavailable path;
* identity verification required;
* soft-deleted;
* process locked.

Key behavior:

* A moved path preserves the profile and offers **Locate workspace**.
* Repository mismatch blocks workspace-dependent execution until explicitly resolved.
* Soft deletion retains plugin-owned metadata for 30 days.
* Selecting a soft-deleted path prompts for restoration.
* Restored external grants remain disabled pending explicit re-enablement.
* Restored session references are presented but not automatically resumed.
* Permanent purge does not delete project files or host-owned chats.

### 10. Add bounded local audit metadata

Store only authorization and boundary-event metadata:

* timestamp;
* workspace ID;
* selected/effective environments;
* action identifier;
* path scope;
* permission category;
* approval and invocation outcomes.

Do not store command output, file contents, prompts, credentials, environment variables, or full command strings.

Defaults:

* local and excluded from synchronization;
* 90-day maximum age;
* 1,000-record maximum per workspace;
* whichever limit is reached first;
* user-clearable;
* automatically removed with permanent workspace purge.

### 11. Deliver incrementally

Recommended slices:

1. **Core workspace cwd:** per-chat Host workspace, strict validation, no home fallback.
2. **WSL command backend:** capability detection and WSL `run_command`.
3. **WSL filesystem backend:** route all file and directory tools through the selected environment.
4. **Workspace profiles:** persistent Host/WSL paths and project identity.
5. **Boundary enforcement:** canonical-path checks and explicit tool policies.
6. **Overrides and audit:** only after LM Studio approval/UI capabilities are verified.
7. **Session continuity and lifecycle:** only after session APIs are verified.

Each slice should be independently testable and should not depend on unsupported host APIs.

## Files / Components Likely Affected

| Evidence status | File / component         | Proposed change                                                                                                        | Coupling note                                                      |
| --------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Confirmed       | `src/config.ts`          | Add per-chat execution-environment and contextual workspace fields                                                     | Sidebar field dynamism depends on SDK capability                   |
| Confirmed       | `src/types.ts`           | Add execution, workspace-profile, grant, lifecycle, and audit types                                                    | Requires persisted-data versioning                                 |
| Confirmed       | `src/settings.ts`        | Separate ordinary plugin settings from workspace-profile persistence; migrate existing settings safely                 | Current JSON persistence is silent on failures                     |
| Confirmed       | `src/executor.ts`        | Replace host-only shell resolution with backend dispatch; remove invalid-`cwd` fallback; add structured execution mode | Central command compatibility risk                                 |
| Confirmed       | `src/toolsProvider.ts`   | Route all filesystem and command tools through execution context and backend policy                                    | Largest cross-cutting change                                       |
| Confirmed       | `src/pluginTypes.ts`     | Extend local SDK typings only for host APIs verified in the installed SDK                                              | Must not invent session or approval APIs                           |
| Confirmed       | `src/index.ts`           | Register any additional evidenced configuration or lifecycle hooks                                                     | Existing entry point is minimal                                    |
| Confirmed       | `package.json`           | Add test commands and dependencies after selecting a test framework                                                    | No existing framework is evidenced                                 |
| Proposed        | Workspace profile store  | Persist stable project profiles, environment paths, deletion state, and grants                                         | Must remain separate from per-chat active selection                |
| Proposed        | Execution-context module | Resolve immutable invocation ownership and policy                                                                      | Used by every workspace-aware tool                                 |
| Proposed        | Host backend             | Encapsulate existing Node filesystem and subprocess operations                                                         | Prevent direct `fs` bypasses                                       |
| Proposed        | WSL backend              | Encapsulate WSL capability, command, path, and filesystem operations                                                   | Windows-only implementation                                        |
| Proposed        | Tool-policy registry     | Declare workspace, environment, and destructive-operation requirements explicitly                                      | Avoid description- or path-based inference                         |
| Proposed        | Test suite               | Unit and Windows/WSL integration coverage                                                                              | Exact path should follow the fork’s established convention, if any |

## Risks / Coupling Points

* **Incomplete WSL routing:** modifying only `run_command` would leave file tools on the Host side.
* **Silent wrong-directory execution:** current `resolveCwd` behavior converts invalid input into the home directory.
* **Raw shell-command compatibility:** the existing `run_command` contract cannot safely be converted to direct argv execution without changing its public API.
* **Path-boundary escapes:** symlinks, junctions, `..`, case handling, and mount changes require environment-local canonicalization.
* **Configuration ownership:** current JSON persistence is global, while active workspace selection must remain per-chat.
* **UI capability risk:** dynamic profile selectors, disabled WSL options, confirmation checkboxes, and recovery dialogs are not evidenced in the visible local SDK shim.
* **Session continuity risk:** no session-enumeration or reopening API is established.
* **Process ownership:** the current executor tracks one child process and calls `kill`; reliable WSL process-tree cancellation and unresolved-process locking require additional design and integration testing.
* **Settings migration:** existing users must retain skill paths and shell preferences when the persisted shape is versioned.
* **Scope expansion:** workspace profiles, authorization grants, audit retention, and soft deletion are materially larger than adding a `cwd` field. Keeping them in ordered slices limits delivery risk.

## Validation / Test Plan

### Unit coverage

* Existing settings migrate without loss.
* Per-chat environment and workspace resolve correctly.
* Host and WSL paths are rejected in the wrong environment.
* Invalid configured paths return errors and never resolve to home.
* Workspace-unset tools enforce their explicit policy.
* WSL argv construction preserves argument boundaries.
* Shell-string execution is not heuristically tokenized.
* Host/WSL backend dispatch covers every workspace-facing tool.
* Canonical-path checks reject traversal and symlink escapes.
* Read-only grants block write operations.
* Destructive previews reject unbounded scopes.
* Soft deletion, restoration, grant suspension, and audit pruning behave deterministically.

### Windows/WSL integration coverage

* WSL unavailable.
* WSL installed with no usable distribution.
* Default distribution available.
* WSL-native workspace exists, is missing, or is inaccessible.
* `pwd` and filesystem tools resolve inside the configured WSL workspace.
* Host tools do not run during normal WSL execution.
* WSL tools do not silently fall back to Host.
* Command arguments containing spaces, quotes, Unicode, and shell metacharacters.
* Timeout and cancellation behavior, including child processes.
* Switching or deleting a workspace while an invocation is active.

### Cross-platform regression coverage

* Native Windows Host mode.
* macOS Host mode.
* Linux Host mode.
* Existing skill scanning, prompt injection, shell overrides, and filesystem tools.

### Manual UI validation

* Different chats retain different active workspaces.
* Environment switching exposes the correct contextual path.
* Returning to a project restores its profile without merging unrelated paths.
* Missing-workspace errors clearly direct the user to sidebar configuration.
* WSL capability status refreshes after installation or configuration changes.
* Override and destructive-operation controls accurately display the effective environment and paths.

No files were modified, builds were not run, and tests were not executed.

[1]: https://lmstudio.ai/khtsly/skills/files/src/config.ts "khtsly/skills • LM Studio Hub"
[2]: https://lmstudio.ai/khtsly/skills/files/src/settings.ts "khtsly/skills • LM Studio Hub"
[3]: https://lmstudio.ai/khtsly/skills/files/src/types.ts "khtsly/skills • LM Studio Hub"
[4]: https://lmstudio.ai/khtsly/skills/files/src/executor.ts "khtsly/skills • LM Studio Hub"
[5]: https://lmstudio.ai/khtsly/skills/files/src/toolsProvider.ts "khtsly/skills • LM Studio Hub"
[6]: https://lmstudio.ai/khtsly/skills/files/src/pluginTypes.ts "khtsly/skills • LM Studio Hub"
[7]: https://learn.microsoft.com/en-us/windows/wsl/basic-commands "Basic commands for WSL | Microsoft Learn"
[8]: https://lmstudio.ai/khtsly/skills/files/package.json "khtsly/skills • LM Studio Hub"
[9]: https://github.com/lmstudio-ai/docs/blob/main/2_typescript/3_plugins/4_custom-configuration/config-ts.md "docs/2_typescript/3_plugins/4_custom-configuration/config-ts.md ..."
[10]: https://learn.microsoft.com/en-us/windows/wsl/release-notes "Release Notes for Windows Subsystem for Linux"
