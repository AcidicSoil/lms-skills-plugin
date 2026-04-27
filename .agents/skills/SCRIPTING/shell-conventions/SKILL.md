---
name: shell-conventions
description: >-
  Apply and review shell tooling conventions. Enforce portable bash and sh
  practices, quoting, env usage, and Make or just patterns. Use when editing
  shell files. NOT for Python or CI/CD.
user-invocable: false
disable-model-invocation: false
license: MIT
metadata:
  author: wyattowalsh
  version: "1.0"
---

# Shell Conventions

Apply these conventions whenever shell work is the primary task.

**Scope:** Shell scripts, shell snippets, `Makefile`, and `justfile` convention
enforcement. NOT for script generation, major shell refactors, Python, or CI
workflow YAML.

## Dispatch

| $ARGUMENTS | Action |
|------------|--------|
| Active (auto-invoked when editing `.sh`, `.bash`, `.zsh`, `Makefile`, or `justfile`) | Apply the active operator contract below |
| Empty | Display the mode summary and trigger boundaries |
| `check` | Verify conventions only |

## When to Use

- Editing an existing shell script, shell snippet, `Makefile`, or `justfile`
- Normalizing portability, quoting, shebangs, env usage, or task naming
- Reviewing shell changes for baseline safety and repo shell habits
- Checking whether shell code follows the repo's required conventions

## Canonical Vocabulary

| Canonical Term | Meaning |
|----------------|---------|
| **shell-primary** | The main task is editing or reviewing shell, `Make`, or `just` code rather than touching it incidentally |
| **conventions-only** | Verify or tighten style, portability, and safety without redesigning the automation |
| **env-based shebang** | A shebang that resolves the interpreter through the environment rather than a hardcoded path |
| **incidental shell** | Shell appears only as a small supporting detail inside a larger non-shell task |
| **target hygiene** | Clear task names, predictable behavior, and explicit treatment of destructive operations |

## Operator Contract

### Active Auto-Invoke

1. Confirm shell work is primary, not incidental to a broader task.
2. Apply shell-specific conventions to the file being edited.
3. Read `references/script-baseline.md` for shell scripts and snippets.
4. Read `references/make-just.md` for `Makefile` or `justfile` work.
5. Read `references/redirection-boundaries.md` if the task mixes shell with CI, deployment, or code generation concerns.
6. Keep the work limited to convention enforcement; do not broaden into script design or automation architecture.

### Empty / Help

1. Show the three public entry paths: active auto-invoke, empty summary, and `check`.
2. Summarize what this skill covers: shell portability, quoting, env usage, and `Make` or `just` conventions.
3. Name the main non-trigger cases: CI YAML, release automation design, Python, and script generation.
4. Point to `shell-scripter` or `devops-engineer` when the request is outside convention enforcement.

### Check

1. Read `references/check-mode.md`.
2. Review the relevant shell, `Make`, or `just` file for convention compliance only.
3. Report violations, risks, and recommended fixes without widening scope into full rewrites.
4. If the request is really generation, conversion, or CI workflow work, redirect instead of performing a conventions-only review.

## Auto-Invocation Trigger Logic

- Trigger when the main work is editing or reviewing an existing `.sh`, `.bash`, `.zsh`, `Makefile`, or `justfile`.
- Trigger when the user asks for shell portability, quoting, shebang, env, `.PHONY`, `$` escaping, or task-name hygiene.
- Do not trigger when shell appears only incidentally inside a larger Python, JS, or infrastructure task.
- Do not trigger for CI workflow YAML, deploy pipelines, or release automation design; those belong to `devops-engineer`.
- Do not trigger for creating new scripts, converting shell dialects, or deep shell refactors; those belong to `shell-scripter`.

## Progressive Disclosure

- Read reference files as indicated instead of loading everything at once.
- Load `references/script-baseline.md` on demand for shell scripts and snippets.
- Load `references/make-just.md` on demand for `Makefile` and `justfile` work.
- Load `references/redirection-boundaries.md` on demand when shell work overlaps CI, release automation, or script generation.
- Load `references/check-mode.md` on demand for `check`.

## Core Conventions

### Shell Scripts and Snippets

- Prefer POSIX `sh` for simple automation that does not need arrays, `[[ ]]`, or process substitution.
- Use `bash` only when the script clearly benefits from bash-only features.
- Use env-based shebangs rather than hardcoded interpreter paths.
- For `bash`, start with `set -euo pipefail` unless there is a clear reason not to.
- For portable `sh`, use `set -eu` and avoid `pipefail`.
- Quote variable expansions unless word splitting is intentionally required.
- Use `command -v tool >/dev/null 2>&1` before depending on a non-guaranteed tool.
- Prefer built-ins and standard utilities before adding dependencies.
- Keep shell functions short and single-purpose.

### Make and Just

- Make targets must be task-oriented and documented through a `help` target when the file is substantial.
- Use `.PHONY` for non-file Make targets.
- Keep recipes idempotent where possible.
- In Makefiles, escape `$` as `$$` inside recipes.
- In justfiles, use parameters only when they materially simplify repeated tasks.
- Do not hide destructive behavior behind vague target names.

### Naming and Structure

- Use lowercase, descriptive function names.
- Prefer `project_root`, `target_path`, or `output_file` over one-letter names.
- Keep environment variable names uppercase.
- Favor early validation and explicit usage text over silent failure.

## Reference File Index

| File | Purpose | When to Read |
|------|---------|--------------|
| `references/script-baseline.md` | Baseline shell portability, safety, quoting, and structure rules | Script or snippet work |
| `references/make-just.md` | `Makefile` and `justfile` conventions, idempotence, `$` escaping, and target hygiene | `Makefile` or `justfile` work |
| `references/redirection-boundaries.md` | Redirection rules for CI YAML, release automation, script generation, and major refactors | Mixed-scope or ambiguous shell work |
| `references/check-mode.md` | Exact expectations for conventions-only verification | `check` mode |

## Critical Rules

1. Always use env-based shebangs, not hardcoded interpreter paths.
2. Quote variable expansions unless intentional splitting is required.
3. Use `bash` only when you need bash; otherwise prefer portable `sh`.
4. Do not use `eval` unless there is no safer alternative and the risk is explained.
5. Validate required external commands before first use.
6. Make or just tasks that mutate state must be named clearly and predictably.
7. Route script generation and major refactors to `shell-scripter`; this skill is conventions only.

## Scope Boundaries

**IS for:** shell style, portability, shebangs, quoting, env usage, `Make` or `just` conventions, conventions-only review.

**NOT for:** Python, CI workflow YAML, deploy automation design, script generation, or major shell rewrites.
