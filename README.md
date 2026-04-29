# lms-plugin-skills

A Claude-style internal skill system for LM Studio. When the plugin is active, it automatically supplies skill context under the hood, so users do not need to paste skill instructions into the system prompt.

## What it does

`lms-plugin-skills` discovers local skill directories, deterministically routes the current request to the smallest relevant skill set, and provides tools for reading skill instructions and supporting files.

A skill is a directory containing a `SKILL.md` file. Normal requests receive only routed candidates; explicit `$skill-name` activations expand the matching `SKILL.md` body before the model begins reasoning.

## Key features

- **No system prompt setup required** — the plugin uses an LM Studio prompt preprocessor to provide skills context internally.
- **Deterministic skill routing** — normal prompts inject only the top routed candidates, capped at three, instead of dumping every installed skill into context.
- **Explicit skill expansion** — users can write `$skill-name` to expand that skill’s `SKILL.md` body into the prompt before the model starts reasoning.
- **Exact skill lookup** — `read_skill_file("skill-name")` checks the matching skill directory directly before falling back to broader scans.
- **Windows, WSL, and Both modes** — skill paths and file reads can be resolved in Windows, WSL, or both environments.
- **Safe command execution defaults** — `run_command` is disabled by default and guarded by explicit safety modes.
- **Persistent settings** — configuration is saved to `~/.lmstudio/plugin-data/lms-skills/settings.json` so it survives new chats.
- **Structured diagnostics** — concise logs by default, with verbose debug logs available through `LMS_SKILLS_DEBUG=1`.

---

## How it works

### 1. Internal skills context

When **Internal Skills Context** is enabled, the plugin prepends hidden skills guidance before the current user message reaches the model.

The internal context is routed, not a broad skill dump. The plugin scores skill metadata against the current request and injects only the top routed candidates:

```xml
<skills_runtime_context>
...
</skills_runtime_context>

<routed_skills>
  <skill rank="1" confidence="high" score="86">
    <n>skill-name</n>
    <description>...</description>
    <why>frontmatter:description_token=...</why>
    <environment>WSL</environment>
    <location>WSL:/home/user/.agents/skills/skill-name/SKILL.md</location>
  </skill>
</routed_skills>
```

To avoid context overload, the plugin injects:

- routed context when there is a confident route,
- routed context when the route changes or refreshes,
- a compact reminder when no skill is confidently routed,
- no broad catalog of all installed skills.

Manual system-prompt instructions are optional and should only be used for extra project-specific behavior beyond the plugin defaults.

### 2. Explicit skill activation

Users can explicitly activate a skill in a prompt with `$skill-name` notation:

```text
Use $example-skill to create the helper.
```

When the preprocessor sees `$example-skill`, it resolves that skill directly and expands the matching `SKILL.md` body into a `<skill_invocation_packet>` before the request reaches the model.

Explicit activations tell the model:

- the named skill is intentional and should be treated as the highest-priority skill context for the request,
- the matching `SKILL.md` body has already been expanded into a `<skill_invocation_packet>` before model reasoning,
- all other user text is secondary task payload for that skill,
- quoted strings, backticked snippets, globs, and command-looking text must not be interpreted before applying the expanded skill,
- `run_command` must not be used for exploration,
- unresolved `$skill` tokens should be searched with `list_skills` before proceeding.

The notation accepts lowercase skill-like names beginning with a lowercase letter and containing lowercase letters, numbers, `.`, `_`, or `-`. Uppercase shell variables such as `$HOME` are ignored so command payloads are not misread as skill activations. Examples:

```text
$docx
$example-skill
$my.custom_skill
```

Explicit activation works even when the regular internal context is disabled, because the user is directly asking for a skill by name. Unlike normal routed candidates, explicit activations expand the selected `SKILL.md` body immediately; normal routing still uses progressive disclosure and expects the model to call `read_skill_file` for routed candidates. For explicit activations, the preprocessor removes the `$skill-name` token from the model-facing task payload and wraps the remaining user text in `<task_payload for_expanded_skills="...">` so the model applies the expanded skill before interpreting command-looking text.

### 3. Skill tools

| Tool | Purpose |
|---|---|
| `list_skills` | List/search skills. `mode: "route"` applies the deterministic router used by prompt injection. Query mode also surfaces fuzzy candidates for partial names, missing hyphens, and nearby skill words before falling back to broad full-text search. |
| `read_skill_file` | Read `SKILL.md` or another relative file inside a skill directory. Defaults to `SKILL.md`; pass `file_path` for support files found with `list_skill_files`. |
| `list_skill_files` | Explore the relative file tree inside a skill directory, including common support folders such as `references/`, `templates/`, `examples/`, and `scripts/`. |
| `run_command` | Execute shell commands only when explicitly enabled by the command safety setting and required by the active skill/task. Disabled by default. |

### 4. Runtime environments

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
│   ├── references/
│   │   └── patterns.md
│   ├── scripts/
│   │   └── helper.py
│   ├── templates/
│   │   └── base.docx
│   └── examples/
│       └── sample.md
├── pptx/
│   ├── SKILL.md
│   └── editing.md
└── my-custom-skill/
    ├── SKILL.md
    └── skill.json           # optional metadata override
```

### `SKILL.md`

`SKILL.md` is the required entry point for a skill. Claude-style YAML frontmatter at the top of `SKILL.md` is used as high-level routing metadata for `<routed_skills>`.

```md
---
name: example-skill
description: Use this skill when the user needs a clear, complete example workflow.
when_to_use: Trigger when the request matches the workflow this skill implements.
tags: [examples, workflow]
disable-model-invocation: false
allowed-tools: Bash(python *)
argument-hint: "[input-file]"
paths: ["src/**/*.ts"]
compatibility: "Requires Python 3 for bundled helper scripts."
---

# Example Skill

Detailed instructions go here. This body is loaded when the model calls `read_skill_file`.
```

Frontmatter behavior:

- `name` overrides the directory name in high-level context.
- `description` is the primary trigger text shown to the model before it reads the full skill.
- `when_to_use` / `when-to-use` is appended to `description` in the high-level skill listing.
- `tags` are used for search/scoring.
- `disable-model-invocation: true` keeps the skill out of automatic routing context, while still allowing explicit `$skill-name` activation.
- `user-invocable`, `allowed-tools`, `context`, `agent`, `model`, `effort`, `argument-hint`, `arguments`, `license`, `compatibility`, `metadata`, `paths`, `hooks`, and `shell` are parsed when present and may be surfaced to the model as skill metadata.
- `allowed-tools` is advisory in this plugin. It does not bypass plugin command settings or `run_command` safety validation.
- `arguments` and `argument-hint` are surfaced as metadata, but this plugin does not currently perform Claude Code-style argument placeholder substitution.
- `context: fork`, `agent`, `model`, `effort`, `paths`, `hooks`, and `shell` are metadata/advisory fields here unless a future plugin feature explicitly implements their Claude Code behavior.
- Descriptions are capped at 1,536 characters to keep high-level context useful without loading the full skill body.
- The frontmatter is stripped from `read_skill_file` results for `SKILL.md`, so the model receives the detailed instruction body after discovery metadata has already been consumed.

This mirrors the progressive-disclosure pattern: lightweight frontmatter is used for routing, normal routed skills load their body through `read_skill_file`, and explicit `$skill-name` activations expand their matching body immediately.

### `skill.json` optional legacy metadata

Place `skill.json` in a skill directory to override display metadata when `SKILL.md` frontmatter is absent:

```json
{
  "name": "My Custom Skill",
  "description": "Use this skill when the user asks to do X, Y, or Z.",
  "tags": ["data analysis", "csv", "statistics"]
}
```

Metadata priority is: `SKILL.md` frontmatter first, then `skill.json`, then the directory name plus the first paragraph of the markdown body.

---


## Deterministic skill routing

The model should not scan a long skills catalog. The plugin routes before injection so the model sees only the smallest useful set of candidates.

Routing uses metadata only:

```text
name
directory basename
frontmatter description
frontmatter when_to_use / when-to-use
tags
environment/display path
```

The router scores exact name matches, tag matches, description/when-to-use token overlap, and path/name overlap. Skills with `disable-model-invocation: true` are excluded from automatic routing. For normal routed candidates, the full `SKILL.md` body is not injected; the model loads it with `read_skill_file`. For explicit `$skill-name` activation, the matching `SKILL.md` body is expanded immediately before the model starts reasoning.

Use `list_skills` with `mode: "route"` to inspect the same routing decision outside the prompt loop.

---

## Settings

| Setting | Default | Description |
|---|---:|---|
| Internal Skills Context | On | Automatically provides skill instructions and available skill context under the hood. No system prompt setup required. |
| Max Skills in Context | 15 | Upper bound for discovery work. Normal prompt injection is further capped by deterministic routing, currently up to 3 routed candidates. |
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
| `read_skill_file` | 30 seconds | Aborts file/path resolution and returns a structured timeout result. |
| `list_skill_files` | 45 seconds | Aborts directory traversal and returns a structured timeout result. |
| `list_skills` | 60 seconds | Aborts broad skill scans/searches and returns a structured timeout result. |
| `run_command` | 30 seconds default + 15 seconds setup budget | Command execution has a timeout and is disabled unless explicitly enabled. |

Timeouts are enforced with `AbortSignal`, so WSL/runtime subprocesses are killed when possible. Timeout events are logged as `tool_timeout` or `runtime_exec_abort`.

---

## Diagnostics

The plugin emits concise structured logs prefixed with `[lms-skills]`.

Default logs are human-readable route, context-injection, and tool summaries. Every prompt injection logs proof of what was inserted, including injection kind, selected/expanded skills, source paths, byte counts, short SHA-256 hashes, and compact previews:

```text
[lms-skills] prompt activation tokens=$example-skill resolved=example-skill unresolved=- expanded=1 action=expanded_before_model id=prompt-...
[lms-skills] route mode=explicit_activation_expanded action=expanded_skill(example-skill) before_model inject=1984ch id=prompt-...
[lms-skills] context kind=explicit_expanded packet=skill_invocation_packet skills=example-skill inject=1984ch sha=85a3f72de1cd preview="<skill_invocation_packet ..." payload=67ch payloadSha=678f53749760 payload="..." id=prompt-...
[lms-skills] context kind=routed packet=routed_skills skills=1:docs-writer:score=128:confidence=high:source=WSL:/... inject=1378ch sha=d0abcc393a31 payload="please update the README docs" id=prompt-...
[lms-skills] read_skill_file start skill=example-skill file=- timeout=30000ms id=read_skill_file-...
[lms-skills] read_skill_file done 42ms id=read_skill_file-...
```

The `context` line is the audit trail for model-facing context. Use it to verify whether the model received an explicit expanded skill packet, routed skill candidates, a compact reminder, or fallback context.

Set `LMS_SKILLS_DEBUG=1` to switch back to full JSON event logs.

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
2. The prompt preprocessor checks for explicit `$skill-name` tokens.
3. If present, the plugin resolves the exact skill and expands the stripped `SKILL.md` body into a `<skill_invocation_packet>` before model reasoning.
4. If no explicit activation exists, the deterministic router scores skill metadata and injects up to three routed candidates, or only a compact reminder when no route is confident.
5. For routed candidates, the model calls `read_skill_file("skill-name")` before doing covered work.
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
