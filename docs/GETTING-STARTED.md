<!-- generated-by: gsd-doc-writer -->
# Getting Started

## Prerequisites

- Git
- Node.js and npm compatible with the repository's TypeScript and dependency versions
- LM Studio with plugin development support
- Windows with WSL and an initialized Linux distribution only when testing WSL mode

The repository does not pin a Node.js version in `package.json`, `.nvmrc`, or `.node-version`.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/AcidicSoil/lms-skills-plugin.git
   ```

2. Enter the project:

   ```bash
   cd lms-skills-plugin
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build the plugin:

   ```bash
   npm run build
   ```

## First Run

Start LM Studio's plugin development workflow:

```bash
npm run dev
```

The script compiles TypeScript and then runs `lms dev`.

For a repository-only smoke check that does not require starting LM Studio, run:

```bash
npm test
```

## Initial Configuration

In LM Studio plugin settings:

1. Leave **Execution Environment** as **Host** for backward-compatible local execution, or select **WSL** on Windows.
2. Configure **Skills Paths** as one or more semicolon-separated roots.
3. For WSL, optionally enter an installed distribution name.
4. For Windows Host, select Command Prompt, PowerShell, or Git Bash.

Each skills root contains child directories with their own `SKILL.md` files.

## Common Setup Issues

### `lms` command not found

`npm run dev` and `npm run push` invoke the LM Studio CLI. Confirm LM Studio's plugin-development tooling is installed and available on `PATH`.

### WSL is unavailable

WSL mode works only on Windows. Confirm `wsl.exe` is available and at least one distribution is installed and initialized. The plugin does not install WSL automatically.

### No skills are found

Confirm the configured root exists in the selected environment and contains child directories such as:

```text
<root>/docx/SKILL.md
```

In WSL mode, use Linux-native roots such as `~/.agents/skills`, not Windows paths.

### Selected Host shell is missing

PowerShell and Git Bash selections require the corresponding executable. Install the selected shell or configure **Shell Path** explicitly.

## Next Steps

- Read [Configuration](CONFIGURATION.md) for all settings.
- Read [Architecture](ARCHITECTURE.md) for runtime design.
- Read [Development](DEVELOPMENT.md) before modifying code.
- Read [Testing](TESTING.md) before adding or changing tests.
