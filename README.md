<!-- generated-by: gsd-doc-writer -->
# LMS Skills Plugin

A TypeScript plugin for LM Studio that discovers reusable skills, injects skill guidance into prompts, and provides contained Host or WSL project tools.

![Version](https://img.shields.io/badge/version-1.0.7-blue)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/AcidicSoil/lms-skills-plugin.git
cd lms-skills-plugin
npm install
```

Build the plugin before loading or publishing it through LM Studio:

```bash
npm run build
```

## Quick Start

1. Start the LM Studio plugin development workflow:

   ```bash
   npm run dev
   ```

2. In LM Studio plugin settings, choose **Host** or **WSL** execution.
3. Configure one or more skills roots. Each skill is a child directory containing `SKILL.md`.
4. Start a chat and use the injected skills list or call `list_skills`.

## What It Provides

### Skill tools

| Tool | Purpose |
|---|---|
| `list_skills` | List or search skills in configured roots |
| `read_skill_file` | Read `SKILL.md` or another contained skill file |
| `list_skill_files` | List files in a selected skill directory |

### Project tools

| Tool | Purpose |
|---|---|
| `read_file` | Read a UTF-8 file inside the active workspace |
| `write_file` | Create or overwrite a workspace file |
| `patch_file` | Replace exact text in a workspace file |
| `append_to_file` | Append text to a workspace file |
| `create_directory` | Create contained workspace directories |
| `list_directory` | List workspace contents |
| `delete_file` | Delete a contained workspace path |
| `move_file` | Move a contained path without silent overwrite |
| `rename_file` | Rename a contained path |
| `change_directory` | Change the persistent default command directory |
| `get_current_directory` | Report workspace and active command-directory metadata |
| `run_command` | Run a command in the selected Host or WSL environment |

## Host and WSL Behavior

Host execution is the compatibility default. On Windows Host, `run_command` can use Command Prompt, PowerShell, Git Bash, or an explicit custom shell path.

WSL execution is Windows-only. It uses the selected distribution, Linux-native workspace and skill paths, and `/bin/bash`. The plugin does not silently fall back to Host or translate Windows paths into `/mnt/<drive>` paths.

Project file tools remain rooted at the deterministic workspace. `change_directory` changes the default directory for subsequent commands without changing file-tool path semantics.

See [Host and WSL Workspaces](docs/host-wsl-workspaces.md) for setup, path rules, security boundaries, performance guidance, and troubleshooting.

## Skill Structure

```text
~/.agents/skills/
├── docx/
│   ├── SKILL.md
│   └── scripts/
└── another-skill/
    └── SKILL.md
```

The configured path is the skills root. The plugin discovers child directories that contain `SKILL.md`; it does not require a root-level `SKILL.md`.

## Development Commands

```bash
npm test
npm run build
npm run verify:release
```

The release verifier cleans generated test output, runs all tests, rebuilds `dist/`, checks required artifacts, and rejects tracked build drift.

## Documentation

- [Getting Started](docs/GETTING-STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Configuration](docs/CONFIGURATION.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Release Checklist](docs/release-checklist.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Licensed under the [Apache License 2.0](LICENSE).
