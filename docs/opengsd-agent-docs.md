# OpenGSD Agent Docs and GSD Browser Setup

This project can keep a small local OpenGSD docs corpus for agents and humans.

Use it for:

- native GSD Core workflow and artifact references;
- GSD Browser MCP, snapshot/ref, evidence, and live viewer docs;
- local QMD collections for agent retrieval, with GSD Core limited to English docs;
- a simple local HTML landing page for browsing the downloaded Markdown docs.

## Build or refresh the local docs corpus

This is a setup/refresh step. In normal GSD Core work, agents should use the already-configured QMD collections or local docs alias/function rather than re-running network setup. From any target project that installed this setup bundle:

```bash
bash .serena-gsd/scripts/opengsd-docs/sync-opengsd-agent-docs.sh
```

By default this creates or refreshes:

```text
~/agent-docs/opengsd/
  llms.txt
  site-md/
  gsd-core/
  gsd-browser/
  index.html
```

The script uses `https://docs.opengsd.net/llms.txt` as the public docs index, downloads the referenced Markdown pages, and clones or updates `open-gsd/gsd-core` and `open-gsd/gsd-browser`. Repo updates mirror the local `opengsd-docs.bash` function: existing repos are refreshed with `git fetch`, `git reset --hard origin/main`, and `git clean -fd` so stale files do not remain.

## Serve the simple local docs site

```bash
bash .serena-gsd/scripts/opengsd-docs/sync-opengsd-agent-docs.sh --serve
```

Then open:

```text
http://localhost:8787
```

Use another port:

```bash
bash .serena-gsd/scripts/opengsd-docs/sync-opengsd-agent-docs.sh --serve 8790
```

## English-only Core pruning and QMD collections

After the Core repo is refreshed, the script prunes non-English GSD Core locale directories before any QMD refresh. This matches the local `opengsd-docs.bash` behavior and keeps polling/indexing focused on the English Core docs. The current known pruned Core locale directories are:

```text
gsd-core/docs/ja-JP
gsd-core/docs/ko-KR
gsd-core/docs/pt-BR
gsd-core/docs/zh-CN
```

The portable script also prunes future Core docs directories that match the same locale pattern, while preserving `en`, `en-US`, and `en-GB` if upstream ever adds explicit English locale folders.

If `qmd` is installed, the script resets and recreates the `gsd-core` and `gsd-browser` collections, then runs `qmd update`:

```bash
qmd collection remove gsd-core 2>/dev/null || true
qmd collection remove gsd-browser 2>/dev/null || true

qmd collection add ~/agent-docs/opengsd/gsd-core \
  --name gsd-core \
  --mask '{README.md,AGENTS.md,ARCHITECTURE.md,BETA.md,COMMANDS.md,CONFIGURATION.md,docs/**/*.md,commands/**/*.md,agents/**/*.md,skills/**/*.md,**/SKILL.md,**/AGENT.md}'

qmd collection add ~/agent-docs/opengsd/gsd-browser \
  --name gsd-browser \
  --mask '{README.md,docs/**/*.md,**/SKILL.md,gsd-browser-skill/**/*.md}'

qmd update
```

Verify:

```bash
qmd collection list
qmd ls gsd-core
qmd ls gsd-browser
```

Useful test queries:

```bash
qmd query "how does GSD Core use planning artifacts and phases?"
qmd query "how should agents use GSD Browser snapshots refs and MCP tools?"
qmd query "how do GSD Core and GSD Browser work together?"
```

## Agent workflow inside GSD Core

Use these docs as an agent reference layer for native GSD Core workflows. They do not replace Core workflow files, project plans, or verification gates.

During `$gsd-discuss-phase` and `$gsd-plan-phase`:

- If the task is browser-facing, include `skills/gsd-browser-automation/SKILL.md` as a relevant project skill. In Serena/ChatGPT hosts, use the GSD Browser CLI path because MCP browser tools are not exposed.
- Add explicit browser evidence expectations to the plan: named session, route/user flow, screenshot or debug bundle path, and any live-viewer/manual confirmation needs.

During `$gsd-execute-phase`:

- Executors consult `skills/opengsd-docs-lookup/SKILL.md` and local QMD collections when they need Browser CLI/session/snapshot/ref details.
- Executors store browser evidence under `.planning/browser-artifacts/` using `skills/gsd-browser-evidence-verification/SKILL.md`.
- Executors summarize Browser session name and artifact paths in the execution summary.

During `$gsd-verify-work` or quick-task verification:

- Verifiers use the Browser skill for browser-facing acceptance checks.
- Verifiers cite screenshot/debug bundle paths and any manual checks in verification evidence.
- If GSD Browser or the docs corpus is missing, verifiers mark the item as needing environment setup or human review rather than fabricating browser validation.

Agents should prefer the user's local shell alias/function for serving or refreshing the docs when one exists. The bundled script is a portable fallback for target projects that do not yet have that local convenience wrapper.

## Runtime wiring

GSD Core remains the workflow authority. GSD Browser is the browser automation and evidence backend.

Expose GSD Browser to the same AI runtime that runs GSD Core, usually through MCP:

```json
{
  "mcpServers": {
    "gsd-browser": {
      "command": "gsd-browser",
      "args": ["mcp"],
      "env": {
        "GSD_BROWSER_ARTIFACTS_DIR": ".planning/browser-artifacts",
        "GSD_BROWSER_BROWSER_HEADLESS": "false"
      }
    }
  }
}
```

For browser-facing work, use the installed project skill:

```text
skills/gsd-browser-automation/SKILL.md
skills/opengsd-docs-lookup/SKILL.md
skills/gsd-browser-evidence-verification/SKILL.md
```

Attach it to GSD executor, verifier, or debugger agents through the project GSD Core config when that runtime supports `agent_skills`.
When supported by the runtime, wire the Browser skill into Core agent prompts through `.planning/config.json`:

```json
{
  "agent_skills": {
    "gsd-executor": ["skills/gsd-browser-automation", "skills/opengsd-docs-lookup", "skills/gsd-browser-evidence-verification"],
    "gsd-verifier": ["skills/gsd-browser-automation", "skills/opengsd-docs-lookup", "skills/gsd-browser-evidence-verification"],
    "gsd-debugger": ["skills/gsd-browser-automation", "skills/opengsd-docs-lookup", "skills/gsd-browser-evidence-verification"]
  }
}
```

Keep this as project-local configuration. Do not add browser workflow rules to the portable global mode or global memories.


## Safe CLI update library references

The companion document `docs/CLI-Tools-Safely-Update-Projects.md` lists common packages and patterns for non-destructive project updates. Use it when designing or reviewing setup helpers and project-update CLIs.

JavaScript and TypeScript packages mentioned:

- AST/code modification: `ts-morph`, `jscodeshift`, `recast`, `magic-string`, Babel-style AST tooling.
- Virtual/staged file systems: `mem-fs`, `mem-fs-editor`, `@nx/devkit`, `@angular-devkit/schematics`.
- Config and merge helpers: `jsonc-parser`, `defu`, `deepmerge`, `cosmiconfig`.
- Interactive conflict handling: `@clack/prompts`, `inquirer`, `enquirer`.

Python packages and tools mentioned:

- Code/config parsing: `libcst`, `tomlkit`, `ruamel.yaml`, `deepmerge`.
- CLI and prompt UX: `Typer`, `Click`, `Questionary`, `Rich`, `Textual`.
- Environment/distribution context: `uv`, `TestPyPI`, `pipx`, plus standard-library `pathlib` and atomic-write patterns.

Use these as research candidates, not automatic dependencies. For the current Serena setup helper, the selected helper dependencies remain intentionally small: `@clack/prompts` for the interactive init wizard, `yaml` for parser-backed Serena config handling, and `diff` for reviewable staged changes/drift output.
