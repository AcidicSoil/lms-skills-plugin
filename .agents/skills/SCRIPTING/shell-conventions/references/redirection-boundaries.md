# Redirection Boundaries

This skill is for conventions enforcement only. Use these rules to avoid false triggers.

## Route to `shell-scripter`

- The user is creating a new script from scratch.
- The task is converting between shell dialects.
- The task is a substantial shell refactor rather than a convention cleanup.
- The user wants a `Makefile` or `justfile` generated, redesigned, or expanded materially.
- The task needs algorithmic restructuring rather than style, safety, or portability cleanup.

## Route to `devops-engineer`

- The active work is CI workflow YAML.
- The task is pipeline design, deploy automation, release workflow design, or platform automation strategy.
- The shell snippet is only incidental to a broader CI or deployment question.
- The user is asking for automation architecture, rollout policy, or environment wiring rather than file-level shell conventions.

## Stay in `shell-conventions`

- The user is editing an existing shell script and wants portability, quoting, or safety improvements.
- The active work is a `Makefile` or `justfile` and the task is target naming, `.PHONY`, `$` escaping, or recipe hygiene.
- The user asks for a conventions-only check of shell or task-runner files.
- The requested change is local, stylistic, or safety-oriented rather than architectural.

## Mixed-Task Non-Trigger Cases

- Python task with a small shell command example
- JS or TS task that happens to include `package.json` scripts
- Infra or release task that includes shell snippets as supporting detail
- CI YAML containing inline shell commands
- Docs work that includes one or two shell examples
- Debugging a deploy pipeline where shell is only one layer of the system

## Escalation Rule

When uncertain, ask whether the user wants:

- conventions cleanup on an existing shell or task-runner file
- new automation or task-runner design
- CI or deploy workflow changes

Only the first case belongs here.
