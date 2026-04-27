# lms-plugin-skills

A Claude-style internal skill system for LM Studio. When the plugin is active, it automatically supplies skill context under the hood, so users do not need to paste skill instructions into the system prompt.

## What it does

`lms-plugin-skills` discovers local skill directories, tells the model which skills are available, and provides tools for reading skill instructions and supporting files.

A skill is a directory containing a `SKILL.md` file. The model sees a compact list of available skills, then calls `read_skill_file` before doing work covered by a relevant skill.

## Key features

- **No system prompt setup required** — the plugin uses an LM Studio prompt preprocessor to provide skills context internally.
- **Efficient context injection** — full skills context is injected at startup, when skills change, and periodically; normal later turns receive a compact reminder.
- **Exact skill lookup** — `read_skill_file("skill-name")` checks the matching skill directory directly before falling back to broader scans.
- **Windows, WSL, and Both modes** — skill paths and file reads can be resolved in Windows, WSL, or both environments.
- **Safe command execution defaults** — `run_command` is disabled by default and guarded by explicit safety modes.
- **Persistent settings** — configuration is saved to `~/.lmstudio/plugin-data/lms-skills/settings.json` so it survives new chats.
- **Structured diagnostics** — concise logs by default, with verbose debug logs available through `LMS_SKILLS_DEBUG=1`.

---

## How it works

### 1. Internal skills context

When **Internal Skills Context** is enabled, the plugin prepends hidden skills guidance before the current user message reaches the model.

The full internal context includes:

```xml
<skills_runtime_context>
...
</skills_runtime_context>

<available_skills>
  <skill>
    <n>skill-name</n    <description>...</description>
    <environment>WSL</environment>
    <location>WSL:/home/user/.agents/skills/skill-name/SKILL.md</location>
  </skill>
</available_skills>
```

To avoid repeatedly growing chat history with the same full list, the plugin injects:

- full context at the beginning of plugin/runtime use,
- full context when the discovered skills fingerprint changes,
- full context after the refresh interval,
- a compact reminder on normal intervening turns.

Manual system-prompt instructions are optional and should only be used for extra project-specific behavior beyond the plugin defaults.

### 2. Skill tools

| Tool | Purpose |
|---|---|
| `list_skills` | List or search available skills. Exact-looking queries are resolved directly first. |
| `read_skill_file` | Read `SKILL.md` or another file inside a skill directory. Defaults to `SKILL.md`. |
| `list_skill_files` | Explore files inside a skill directory. |
| `run_command` | Execute shell commands only when explicitly enabled by the command safety setting. Disabled by default. |

### 3. Runtime environments

The plugin can resolve skills in different filesystem/runtime environments:

| Mode | Behavior |
|---|---|
| `Windows` | Resolve paths and read skills through the native Windows filesystem. |
| `WSL` | Resolve Linux paths and read skills through WSL/bash semantics. |
| `Both` | Scan Windows and WSL separately and return environment-labeled paths. |

Environment-labeled paths look like:

```text
Windows:C:\Users\you\.lmstudio\skills\docx\SKILL.md
WSL:/home/you/.agents/skills/docx/SKILL.md
```

---

## Skill directory structure

A skill is any subdirectory inside a configured skills path that contains a `SKILL.md` file.

```text
~/.lmstudio/skills/
├── docx/
│   ├── SKILL.md             # entry point, required
│   ├── scripts/
│   │   └── helper.py
│   └── templates/
│       └── base.docx
├── pptx/
│   ├── SKILL.md
│   └── editing.md
└── my-custom-skill/
    ├── SKILL.md
    └── skill.json           # optional metadata override
```

### `SKILL.md`

`SKILL.md` is the required entry point for a skill. It should explain when to use the skill and what steps the model should follow.

### `skill.json` optional metadata

Place `skill.json` in a skill directory to override display metadata:

```json
{
  "name": "My Custom Skill",
  "description": "Use this skill when the user asks to do X, Y, or Z.",
  "tags": ["data analysis", "csv", "statistics"]
}
```

If `skill.json` is absent, the plugin uses the directory name and extracts the description from the first paragraph of `SKILL.md`.

---

## Settings

| Setting | Default | Description |
|---|---:|---|
| Internal Skills Context | On | Automatically provides skill instructions and available skill context under the hood. No system prompt setup required. |
| Max Skills in Context | 15 | Maximum number of skills gathered for the internal skills context. Range: 1–50. |
| Skills Runtime Environment | Host-dependent | `Windows`, `WSL`, or `Both`. Controls path resolution, skill reads, and command target behavior. |
| Skills Paths | Last saved/default | Semicolon-separated skill root directories. |
| Command Execution Safety | Disabled | Controls whether `run_command` can execute shell commands. |
| WSL Distro | Empty | Optional WSL distribution name. Empty uses the default WSL distro. |
| Windows Shell Path | Empty | Optional override for Windows command execution shell. |
| WSL Shell Path | Empty | Optional override for WSL command execution shell. |
| Legacy Shell Path | Empty | Backward-compatible Windows shell override. Prefer Windows Shell Path. |

### Skills paths

- **Empty** — use the last saved paths, or `~/.lmstudio/skills` on first run.
- **`default`** — reset saved paths back to `~/.lmstudio/skills`.
- **Semicolon-separated paths** — load multiple roots in order.

Examples:

```text
~/.lmstudio/skills
~/.agents/skills
~/.lmstudio/skills;~/.agents/skills
```

Settings are persisted to:

```text
~/.lmstudio/plugin-data/lms-skills/settings.json
```


### Tool input schemas

All plugin tools use Zod schemas before the implementation runs. These schemas reject malformed inputs early, including:

- empty required fields,
- overly long skill names, paths, queries, commands, and environment values,
- control characters and null bytes,
- path traversal such as `..` in skill-relative file paths,
- absolute paths where a skill-relative path is required,
- invalid command timeout ranges,
- unsafe environment variable names or oversized environment maps.

Schema validation is not the only safety layer. Runtime path checks, command safety policy, and request timeouts still run after schema validation.

---

## Command execution safety

`run_command` is intentionally **disabled by default**.

This prevents the model from issuing exploratory or destructive shell commands unless the user explicitly enables command execution in plugin settings.

| Mode | Behavior |
|---|---|
| Disabled | Blocks all model-issued shell commands. Recommended default. |
| Read-only | Allows simple inspection commands only. Blocks shell metacharacters, redirects, pipes, command chaining, variable expansion, and mutating arguments. |
| Guarded | Allows broader commands but still blocks dangerous patterns. |

Read-only mode allows inspection-style commands such as:

```text
pwd, ls, cat, head, tail, grep, rg, find, stat, file, wc, sort, diff, env, which
```

The safety policy blocks destructive or high-risk patterns such as:

```text
rm, rmdir, del, Remove-Item
format, mkfs, dd, shred
chmod, chown, chgrp
mv, cp, mkdir, touch, tee
redirection such as >, >>, <<
package managers such as npm install, pip install, apt, brew, choco
network/download tools such as curl, wget, Invoke-WebRequest
ssh, scp, rsync
mutating git commands such as clone, pull, push, reset, clean, checkout
kill/taskkill
nested shells such as bash -c, sh -c, powershell -c
encoded PowerShell
```

This is policy-level hardening, not a full OS sandbox. For untrusted workloads, use an external sandbox such as a container, VM, or locked-down WSL environment with read-only mounts, no network, and resource limits.


---

## Timeout guardrails

The plugin has layered timeout protection so model/tool requests cannot wait forever:

| Area | Default | Behavior |
|---|---:|---|
| Prompt preprocessor scan | 3 seconds | If skill discovery is slow, the model still receives a compact skills reminder instead of hanging. |
| `read_skill_file` | 10 seconds | Aborts file/path resolution and returns a structured timeout result. |
| `list_skill_files` | 15 seconds | Aborts directory traversal and returns a structured timeout result. |
| `list_skills` | 20 seconds | Aborts broad skill scans/searches and returns a structured timeout result. |
| `run_command` | 30 seconds default | Command execution has a timeout and is disabled unless explicitly enabled. |

Timeouts are enforced with `AbortSignal`, so WSL/runtime subprocesses are killed when possible. Timeout events are logged as `tool_timeout` or `runtime_exec_abort`.

---

## Diagnostics

The plugin emits concise structured logs prefixed with `[lms-skills]`.

Default logs focus on request-level events, such as:

```text
[lms-skills] {"event":"tool_start","tool":"read_skill_file",...}
[lms-skills] {"event":"skill_resolved","resolvedSkill":"docx",...}
[lms-skills] {"event":"read_skill_file_result","contentLength":1234,...}
[lms-skills] {"event":"tool_complete","elapsedMs":18,...}
```

Enable verbose step/runtime tracing with:

```bash
LMS_SKILLS_DEBUG=1 npm run dev
```

Optional thresholds:

```bash
LMS_SKILLS_SLOW_STEP_MS=250
LMS_SKILLS_SLOW_RUNTIME_MS=500
```

---

## Default skills path by platform

The default path `~/.lmstudio/skills` resolves to:

| Platform | Path |
|---|---|
| Windows | `C:\Users\<you>\.lmstudio\skills` |
| macOS | `/Users/<you>/.lmstudio/skills` |
| Linux | `/home/<you>/.lmstudio/skills` |

In WSL mode, `~` is resolved using the WSL/Linux home directory.

---

## Model workflow

1. User sends a message.
2. The prompt preprocessor supplies full skills context or a compact skills reminder.
3. The model sees available skills or knows the skills tools are available.
4. For matching work, the model calls `read_skill_file("skill-name")`.
5. The plugin resolves exact skill names directly when possible.
6. The model follows `SKILL.md`; if needed, it calls `list_skill_files` and reads referenced supporting files.
7. Shell commands are blocked unless command execution has been explicitly enabled.

---

## Local development

```bash
cd lms-plugin-skills
bun install
bun run dev
```

Equivalent npm commands usually work too:

```bash
npm install
npm run build
npm run dev
```

## Verification

```bash
npm run build
```

No test suite is currently configured.

## License

Apache 2.0
