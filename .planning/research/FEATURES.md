# Feature Research

## Table Stakes

### Execution Mode

- Host execution remains available and backward compatible.
- WSL execution is shown only when supported.
- Installed distributions can be listed and selected.
- Missing WSL, missing distribution, or launch failures produce actionable errors.

### Workspace Lifecycle

- Each chat receives a stable workspace identifier and root.
- Workspace creation is idempotent.
- File and shell tools use the same active workspace.
- Relative paths resolve from the workspace root.
- Users can inspect the active execution mode and workspace location.

### Path Handling

- Windows drive paths, Linux paths, and WSL UNC paths are recognized explicitly.
- Translation failures are reported rather than guessed.
- Workspace-scoped operations reject path escape.
- Spaces, Unicode, separators, drive-letter case, and trailing separators are handled.

### Compatibility and Recovery

- Existing settings migrate without user action.
- Unsupported systems fall back to Host mode.
- A stale or removed WSL distribution does not corrupt project state.
- Existing tools retain response shapes where feasible.

## Differentiators

- Automatic but visible selection of a default WSL distribution.
- Project templates or per-skill workspace bootstrap hooks.
- Workspace resume/history UI beyond deterministic chat mapping.
- Cross-environment file mirroring.

These are deferred unless required by `todo.md`.

## Anti-Features

- Transparent execution switching mid-command.
- Silent path conversion across environments.
- Global unrestricted workspace roots shared by unrelated chats.
- Automatic installation or administrative enablement of WSL.
- Remote execution, containers, and multi-host synchronization.

## Dependencies

Execution selection depends on capability detection and settings. Tool routing depends on workspace context. WSL command execution depends on distribution discovery and path policy. Reliable release depends on automated tests for all three layers.
