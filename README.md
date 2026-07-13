# lms-plugin-skills

A Claude-style skills system for LM Studio with deterministic per-chat project workspaces and optional Windows Subsystem for Linux execution.

## How It Works

Before each message, the plugin scans configured skill directories and injects an `<available_skills>` block. Models can inspect skill files, explicitly activate skills with `/skill-name`, and use project-scoped file and shell tools inside one predictable workspace.

## Tools

Skill-library tools stay under configured skill roots:

| Tool | Purpose |
|---|---|
| `list_skills` | List available skills and descriptions |
| `read_skill_file` | Read a file inside a configured skill directory |
| `list_skill_files` | List files inside a configured skill directory |

Project tools share one deterministic workspace for the current LM Studio provider working directory:

| Tool | Purpose |
|---|---|
| `read_file` | Read a UTF-8 file inside the active workspace |
| `write_file` | Create or overwrite a workspace file |
| `patch_file` | Replace an exact string inside a workspace file |
| `append_to_file` | Append text to a workspace file |
| `create_directory` | Create workspace directories idempotently |
| `list_directory` | List workspace contents, optionally recursively |
| `delete_file` | Delete a contained workspace path |
| `move_file` | Move a contained workspace path without silent overwrite |
| `rename_file` | Rename a workspace path in place |
| `change_directory` | Change the persistent default command directory inside the active workspace |
| `get_current_directory` | Report workspace ID, provider identity, environment, distribution, native root, and active command directory |
| `run_command` | Run a shell command in the same workspace and selected Host/WSL environment |

Relative project paths resolve from the active workspace root. Absolute paths must be native to the selected environment and remain canonically contained. Missing or invalid command working directories return errors; they do not fall back to the user's home directory.

## Explicit Skill Activation

Use `/skill-name` in a message:

```text
/bug-fix investigate this null pointer
use /git-commit to prepare the change
```

Matching skills are expanded into a `<skill_context>` block before the model receives the request. Multiple activations are supported.

## Skill Directory Structure

A skill is a subdirectory containing `SKILL.md`:

```text
~/.lmstudio/skills/
├── docx/
│   ├── SKILL.md
│   └── scripts/
└── my-custom-skill/
    ├── SKILL.md
    └── skill.json
```

Optional `skill.json`:

```json
{
  "name": "My Custom Skill",
  "description": "Use this skill for custom document work.",
  "tags": ["documents", "automation"]
}
```

## Settings

| Setting | Default | Description |
|---|---|---|
| Auto-Inject Skills List | On | Inject the available-skills block into prompts |
| Max Skills in Context | 15 | Maximum skills listed per injected block |
| Skills Directory Path | `default` | `default`, a path-separated list, or an absolute path |
| Execution Environment | Host | Run commands and project file operations on the Host or through WSL |
| WSL Distribution | Empty | Optional installed distribution name; empty uses the default distribution |
| Shell Path | Empty | Optional Host shell override |
| Windows Shell | Command Prompt | Host Windows shell when no shell path is provided |

Settings persist at:

```text
~/.lmstudio/plugin-data/lms-skills/settings.json
```

WSL is available only on Windows. The plugin does not install WSL, change the default distribution, silently select another distribution, silently fall back to Host, or translate Windows paths into `/mnt/<drive>`.

## Workspaces

Host workspaces are created under:

```text
~/.lmstudio/plugin-data/lms-skills/workspaces/<workspace-id>
```

WSL workspaces are created in the selected distribution's Linux filesystem:

```text
~/.lmstudio/lms-skills/workspaces/<workspace-id>
```

The ID is deterministic for the LM Studio provider working directory, selected environment, and WSL distribution. File tools remain workspace-root scoped. `change_directory` changes the persistent default directory for subsequent `run_command` calls without allowing escape from that root.

See [Host and WSL Workspaces](docs/host-wsl-workspaces.md) for setup, security boundaries, performance guidance, limitations, and troubleshooting.

## Default Skills Path

| Platform | Path |
|---|---|
| Windows | `C:\Users\<you>\.lmstudio\skills` |
| macOS | `/Users/<you>/.lmstudio/skills` |
| Linux | `/home/<you>/.lmstudio/skills` |

## Local Development

```bash
npm install
npm test
npm run build
npm run verify:release
```

For LM Studio development, use the locally installed LM Studio plugin-development command supported by your environment after dependencies are installed.

## Release Validation

Automated release validation:

```bash
npm run verify:release
```

This command removes stale generated output, runs the complete test suite, rebuilds `dist/`, checks required artifacts, validates whitespace, and rejects tracked build drift. Real Windows Host and WSL release checks are documented in [the release checklist](docs/release-checklist.md).

## License

[Apache 2.0](LICENSE)
