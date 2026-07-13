# Host and WSL Workspaces

## Overview

The plugin gives each LM Studio provider working directory a deterministic project workspace. Project-scoped file tools and `run_command` share this workspace. Skill discovery and skill-file reads remain under configured skill roots and do not use the project workspace.

## Selecting an Environment

In plugin settings:

- **Execution Environment: Host** runs project file and shell operations directly on the operating system. This is the default and preserves legacy behavior.
- **Execution Environment: WSL** runs operations through Windows Subsystem for Linux. This option is supported only on Windows.
- **WSL Distribution** optionally names an installed distribution. Leave it empty to use the default distribution.

The plugin does not install WSL, enable Windows features, change your default distribution, select a different distribution after failure, or silently fall back to Host.

## Workspace Identity and Locations

The workspace ID is derived from the normalized LM Studio provider working directory, execution environment, and WSL distribution. Repeated tool calls for the same inputs resolve to the same workspace.

### Host

```text
~/.lmstudio/plugin-data/lms-skills/workspaces/<workspace-id>
```

### WSL

```text
~/.lmstudio/lms-skills/workspaces/<workspace-id>
```

The WSL root lives in the distribution's Linux filesystem. It is not placed under `/mnt/c` and is not created through a `\\wsl$` path.

Use `get_current_directory` to inspect:

- workspace ID;
- LM Studio provider working-directory identity;
- Host or WSL environment;
- selected distribution, when applicable;
- native workspace root.

## Path Rules

Relative paths resolve from the active workspace root.

Absolute paths are accepted only when they are native to the selected environment and remain inside the workspace after canonicalization:

- Host Windows accepts contained Windows-native paths.
- Host macOS/Linux accepts contained POSIX paths.
- WSL accepts contained Linux paths.

The plugin does not silently translate `C:\...` to `/mnt/c/...` or convert Linux paths to Windows paths. Traversal, sibling-prefix tricks, and canonical symlink or junction escapes are rejected.

The workspace root itself cannot be deleted.

## Command Execution

`run_command` uses the same workspace root as project file tools. With no `cwd`, the command runs at the workspace root. A provided `cwd` is resolved and contained within the workspace before execution.

Invalid or missing required working directories return an error. They do not fall back to the user's home directory.

WSL commands are launched through `wsl.exe` with explicit arguments, selected distribution, Linux-native working directory, and a known shell. There is no silent Host fallback.

## File Operations in WSL

WSL file operations use structured program arguments. File content is sent through standard input rather than interpolated into shell command strings. Standard WSL distributions are expected to provide common GNU/coreutils commands including `cat`, `tee`, `mkdir`, `find`, `realpath`, `rm`, `mv`, and `test`.

## Performance Guidance

Keep WSL projects in the Linux filesystem for best Linux tool performance. Accessing Windows-host files repeatedly through `/mnt/<drive>` or WSL UNC paths can be slower and can introduce different file-permission and watcher behavior. The plugin's default WSL workspace policy avoids that cross-filesystem path.

## Security Boundary

The workspace policy limits project-scoped tools to a deterministic root after lexical and canonical containment checks. This reduces accidental path escape but is not a full operating-system sandbox.

Commands still run with the permissions of the LM Studio process or selected WSL user. A shell command can perform actions allowed by that account. Review commands and skill instructions before granting broader authority.

Skill-library tools use configured skill roots as a separate trust boundary. They are not redirected into project workspaces.

## Limitations and Non-Goals

- Windows Host and WSL are the only execution environments in this release.
- No SSH, container, or remote execution is provided.
- Workspace roots are not user-configurable in this release.
- No Host/WSL file mirroring or synchronization is performed.
- No historical workspace browser is provided.
- The available LM Studio SDK identifies the project through the tools-provider working directory. Multiple chats using the same provider working directory may share the same deterministic workspace.

## Troubleshooting

| Symptom | Meaning | Action |
|---|---|---|
| “WSL execution is only available on Windows” | WSL mode was selected on macOS or Linux | Select Host execution |
| “WSL is unavailable” or `wsl.exe` failure | WSL is disabled, missing, or unavailable to LM Studio | Verify `wsl.exe --status` and `wsl.exe --list --quiet` from Windows, then restart LM Studio |
| “No WSL distribution is installed” | WSL exists but has no usable distribution | Install and initialize a distribution outside the plugin |
| Selected distribution is unavailable | The configured name was removed, renamed, or misspelled | Select an installed distribution or clear the field to use the default |
| Unable to resolve WSL workspace home | The selected distribution could not provide a valid Linux home | Start the distribution manually, confirm `$HOME`, and check user initialization |
| Unable to create Host or WSL workspace | Permissions, disk state, or filesystem availability blocked creation | Check the reported path, permissions, free space, and distribution health |
| Path escapes outside the workspace | A relative or absolute path resolved beyond the active root | Use a workspace-relative path visible from `get_current_directory` |
| Destination already exists | Move or rename would overwrite an existing path | Choose a different destination or remove it explicitly first |
| Command timed out | The configured timeout expired | Increase the allowed timeout or split the command into smaller operations |
| `terminationIncomplete: true` | The plugin could not confirm complete descendant-process termination | Inspect Host or WSL processes manually before retrying |
| WSL directory listing fails | Required GNU/coreutils behavior is missing | Verify `find`, `realpath`, and other standard utilities inside the distribution |

## Verification

Run automated checks from the repository root:

```bash
npm test
npm run build
npm run verify:release
```

Before release, execute the real Windows Host and WSL scenarios in [the release checklist](release-checklist.md).
