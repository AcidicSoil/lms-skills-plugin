# Refactor Execution Protocol

## Evidence scan

Inspect these before editing:

| Area | Examples |
|---|---|
| Instructions | `AGENTS.md`, `.agents/skills/**/SKILL.md`, repo-local rules |
| State | handoff docs, `.serena/memories`, TODOs, roadmaps |
| Build/test | `pyproject.toml`, `package.json`, `Makefile`, CI workflows |
| Code risks | duplicate packages, compatibility shims, oversized files, deprecated paths |
| Tests | failing logs, targeted tests, regression suites |

## Task-list rules

Each task must include:

- evidence source
- affected files or modules
- intended behavior preservation
- acceptance criteria
- verification command
- rollback note

Prefer tasks that reduce risk without changing public behavior.

## Verification ladder

Run the smallest useful gate first, then broaden:

1. Targeted unit tests for touched behavior.
2. Lint/import checks for touched files.
3. Repo policy checks, if present.
4. Full test suite or pre-push-equivalent command.

Use repo-native commands from manifests or docs. For Python projects using `uv`, prefer the repo's locked `uv run` path when present.

## Closeout format

Report:

- objective
- inputs resolved
- repo evidence scan
- refactor task list
- implementation summary
- verification gate with exact commands and observed results
- docs/state sync
- unknowns and residual risks
- next repo-derived slice
