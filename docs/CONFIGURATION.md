<!-- generated-by: gsd-doc-writer -->
# Configuration

## Configuration Sources

The plugin reads settings from LM Studio's plugin configuration and persists effective values to:

```text
~/.lmstudio/plugin-data/lms-skills/settings.json
```

There are no application environment variables required by this repository.

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| Auto-Inject Skills List | select | `on` | Inject available skills into prompts |
| Max Skills in Context | integer | repository constant | Maximum skills included in an injected list |
| Skills Paths | string | Host default skills directory | Semicolon-separated skill roots |
| Execution Environment | select | `host` | Choose Host or WSL execution |
| WSL Distribution | string | empty | Optional installed distribution name; empty uses the default |
| Shell Path | string | empty | Optional Host shell override; ignored by WSL |
| Windows Shell | select | `cmd` | `cmd`, PowerShell, or Git Bash for Windows Host |

## Skills Path Semantics

Each configured path is a root containing child skill directories:

```text
<skills-root>/
├── first-skill/
│   └── SKILL.md
└── second-skill/
    └── SKILL.md
```

Multiple roots are separated with semicolons and loaded in order.

Host mode expands `~` with the Host user's home directory. WSL mode preserves Linux path syntax and resolves `~` from the selected distribution's `$HOME`.

Entering `default` resets the configured skills roots. The effective default is environment-specific:

- Host: the Host default skills directory defined by `DEFAULT_SKILLS_DIR`
- WSL: `~/.lmstudio/skills` inside the selected distribution

## Execution Environment

### Host

Host is the compatibility default. Project file operations use Node filesystem APIs inside a deterministic Host workspace. `run_command` uses the configured Host shell.

### WSL

WSL is available only on Windows. The plugin validates WSL capability and the selected distribution before creating a workspace. WSL project and skill paths must be Linux-native absolute paths or `~/...` skill roots.

WSL commands always use `/bin/bash`; Host shell settings are ignored.

## Windows Host Shells

| Value | Behavior |
|---|---|
| `cmd` | Runs through `cmd.exe /c` |
| `powershell` | Uses PowerShell 7 when found, otherwise Windows PowerShell |
| `git-bash` | Uses a detected Git for Windows `bash.exe` |
| Shell Path | Overrides automatic Host shell selection |

Selecting PowerShell or Git Bash without an available executable returns an actionable error rather than silently selecting another shell.

## Workspace Locations

Host workspaces are created under the plugin-data workspaces directory. WSL workspaces are created under:

```text
~/.lmstudio/lms-skills/workspaces/<workspace-id>
```

The workspace ID is derived from the normalized LM Studio provider working directory, execution environment, and WSL distribution.

## Required and Optional Settings

No user setting is required for Host operation. Invalid or unavailable WSL selections fail when an environment-sensitive operation resolves its workspace or skill store.

Optional values with defaults:

- execution environment defaults to Host;
- Windows shell defaults to Command Prompt;
- WSL distribution defaults to the distribution selected by WSL;
- shell path defaults to automatic Host shell selection;
- skill roots default according to the selected environment.

## Persistence and Cache

Effective settings are saved as JSON in the plugin-data directory. The runtime caches effective configuration for a short repository-defined TTL and invalidates the cache when settings are written.

## Per-Environment Overrides

The plugin does not use `.env` files or `NODE_ENV` branches. Host and WSL differences are selected through plugin settings. Switching environments changes workspace identity, skill-root resolution, file backend, and command execution behavior.
