# lms-plugin-skills

A Claude-style internal skill system for LM Studio. When the plugin is active, it automatically supplies skill context under the hood; users do not need to paste anything into the system prompt.

## How It Works

Claude reads a list of available skills at the start of every context, then uses a `view` tool to read the relevant `SKILL.md` file before working on tasks that skill covers. This plugin replicates that system exactly for LM Studio.

### The Skill System - Three Components

**1. Prompt Preprocessor**
Before every user message, the plugin internally supplies a skills runtime context and an `<available_skills>` block. The model sees the available skills, descriptions, environments, and file paths without requiring the user to configure a system prompt.

**2. Tools**

| Tool | Purpose |
|---|---|
| `list_skills` | List all available skills with names and descriptions |
| `read_skill_file` | Read any file within a skill directory (defaults to `SKILL.md`) |
| `list_skill_files` | Explore the full file tree of a skill directory |

**3. Persistent Settings**
LM Studio does not save plugin settings across new chats. This plugin solves that by writing settings to `~/.lmstudio/plugin-data/lms-skills/settings.json` - the skills path and all configuration survive chat resets.

---

## No System Prompt Setup Required

The plugin registers a prompt preprocessor with LM Studio. When **Internal Skills Context** is enabled, the plugin automatically prepends the skills runtime instructions and available-skills block to the current user message before it reaches the model. This happens inside the plugin; users do not need to copy a template into the chat system prompt.

Manual system-prompt instructions are optional and should only be used if you want extra project-specific behavior beyond the plugin defaults.

---

## Skill Directory Structure

A skill is any subdirectory inside your skills folder that contains a `SKILL.md` file.

```
~/.lmstudio/skills/          <- default skills directory
├── docx/
│   ├── SKILL.md             <- entry point (required)
│   ├── scripts/
│   │   └── helper.py
│   └── templates/
│       └── base.docx
├── pptx/
│   ├── SKILL.md
│   └── editing.md
└── my-custom-skill/
    ├── SKILL.md
    └── skill.json           <- optional: override name/description
```

### `skill.json` (optional)

Place a `skill.json` in any skill directory to override its display name and description:

```json
{
  "name": "My Custom Skill",
  "description": "Use this skill when the user asks to do X, Y, or Z.",
  "tags": [
    "data analysis",
    "csv",
    "statistics",
    "charts",
    "visualisation",
    "pandas",
    "trends",
    "dataset"
  ]
}
```

If absent, the plugin uses the directory name and extracts the description from the first paragraph of `SKILL.md`.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| Internal Skills Context | On | Automatically supplies skill instructions and available skill context under the hood; no system prompt setup required |
| Max Skills in Context | 15 | Max skills included in the internal skills context |
| Skills Directory Path | *(empty)* | Custom path to skills directory |

### Skills Directory Path

- **Empty** - uses the last saved path (or `~/.lmstudio/skills` on first run)
- **`default`** - resets the saved path back to `~/.lmstudio/skills`
- **Any absolute path** - saves that path and uses it immediately

Settings (including the skills path) are written to disk and survive new chat sessions.

---

## Local Development

```bash
cd lms-plugin-skills
bun install
bun run dev
```

---

## Default Skills Path by Platform

The default path `~/.lmstudio/skills` resolves to:

| Platform | Path |
|---|---|
| Windows | `C:\Users\<you>\.lmstudio\skills` |
| macOS | `/Users/<you>/.lmstudio/skills` |
| Linux | `/home/<you>/.lmstudio/skills` |

---

## Model Workflow

1. User sends a message
2. Preprocessor fires - gathers up to the configured skill limit and internally supplies `<available_skills>` context
3. Model reads the block and recognises a relevant skill
4. Model calls `read_skill_file("skill-name")` -> receives full `SKILL.md` content
5. `SKILL.md` may reference other files -> model calls `list_skill_files` then `read_skill_file` with specific path
6. Model follows the skill's instructions to produce high-quality output

## License

Apache 2.0