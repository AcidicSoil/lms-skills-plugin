# Phase 2 Research: Per-Chat Workspace and Tool Integration

## Research Role

Inline substitution for `gsd-phase-researcher`, using the resolved agent instructions from `.codex/agents/gsd-phase-researcher.toml`.

## SDK Identity Seam

The installed `@lmstudio/sdk` declarations expose `ToolsProviderController.getWorkingDirectory()`. This is the strongest available stable project/chat seam in the current plugin runtime. Individual tool calls expose a call identifier tied to one act, so those identifiers must not be used for workspace persistence.

The local `PluginController` interface should be extended narrowly to include `getWorkingDirectory(): string`, matching the installed SDK surface used by `withToolsProvider`.

## Workspace Model

Introduce a `WorkspaceContext` with:

- deterministic `workspaceId` derived from normalized provider working directory;
- `executionEnvironment` (`host` or `wsl`);
- optional `wslDistribution`;
- native workspace root used by file and command operations;
- host-visible identity/root metadata where useful for diagnostics.

A stable hash avoids unsafe directory names and limits path length. The hash input should include normalized working-directory identity and execution environment/distribution where necessary to prevent Host and WSL roots from colliding.

## Root Policy

### Host

Use a plugin-owned host root under plugin data, for example `~/.lmstudio/plugin-data/lms-skills/workspaces/<id>`. This keeps project-scoped tool authority separate from arbitrary user paths while preserving deterministic access.

### WSL

Use a Linux-native root such as `~/.lmstudio/lms-skills/workspaces/<id>` inside the selected/default distribution. Creation and file operations must run through WSL rather than UNC-host filesystem APIs, preserving Linux semantics and avoiding `/mnt/c` performance penalties.

The exact WSL home path can be resolved by a small direct execution query (`printf %s "$HOME"`) or by using shell expansion inside the adapter. Cache resolved roots per distribution for the process lifetime, but validate capability before use.

## File Operation Architecture

Do not leave filesystem logic embedded in `src/toolsProvider.ts`. Introduce a workspace filesystem service with a shared operation contract:

- Host backend uses Node `fs` after `pathPolicy` resolution and containment.
- WSL backend executes compact, argument-safe helper commands through the existing WSL execution path or a dedicated direct-program API.

For Phase 2, a practical approach is a structured WSL filesystem adapter using `wsl.exe --exec` with standard utilities or a small Node/Python helper only when guaranteed available. Prefer POSIX core utilities plus base64/stdin-safe payload handling rather than shell-interpolating file content.

Every project-scoped tool should call one resolver first, then one backend. Relative paths are preferred. Absolute paths are accepted only when valid for the selected environment and contained by the workspace root.

## Tool Scope

Project-scoped tools include:

- `read_file`
- `write_file`
- `patch_file`
- `append_file`
- `create_directory`
- `list_directory`
- `delete_file`
- `move_file`
- `rename_file`
- `get_current_directory`
- `run_command`

Skill tools (`list_skills`, `read_skill_file`, `list_skill_files`) remain on existing configured skill roots.

## Inspection Tool

Add or extend `get_current_directory` to return:

- workspace ID;
- selected environment;
- selected WSL distribution when applicable;
- native workspace root;
- provider working-directory identity.

This satisfies inspectability without introducing new UI.

## Failure Handling

- Missing provider working directory: structured workspace-resolution error.
- WSL unavailable or selected distribution removed: structured capability error before mutation.
- Root creation failure: no partial metadata persistence is required because identity is deterministic.
- Path escape or wrong-environment absolute path: reject before operation.
- Cross-environment file paths: never silently translate.

## Testing Strategy

Use dependency injection for controller identity, Host filesystem root, WSL capability, execution, and workspace creation. Integration tests should prove:

1. Same controller working directory resolves to the same workspace ID/root.
2. Different identities or environments do not collide.
3. Host create/write/read/patch/list/move/delete all remain contained.
4. `run_command` receives exactly the same root used by file tools.
5. WSL adapter receives Linux-native roots and explicit distribution.
6. Skill tools do not call the workspace resolver.
7. Removed distribution and escape attempts fail without mutation.

## Recommended Plan Shape

1. Workspace identity/context and Host workspace lifecycle.
2. Workspace filesystem abstraction with Host and testable WSL backends.
3. Tool-provider migration, inspection output, and end-to-end integration tests.

Plans 1 and 2 should be sequential because the filesystem abstraction consumes the context contract. Plan 3 integrates all tools and is the final wave.

## Risks

- WSL file mutation via shell utilities can reintroduce quoting problems; structured argv and stdin payloads are mandatory.
- The controller working directory may be shared by multiple chats using the same project. This is acceptable for “per-chat/project” semantics available from the SDK, but should be documented precisely.
- Existing tools currently advertise absolute paths; changing to workspace-relative semantics needs compatible descriptions and clear resolved-path responses.
