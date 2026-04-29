---
name: verified-refactor-planner
description: "Create and execute evidence-backed refactor plans for repositories. WHEN: \"plan refactor work\", \"group refactor tasks\", \"implement the refactor plan\", \"continue repo cleanup\", \"reduce file size\", \"verify before completion\"."
license: MIT
metadata:
  version: "1.0.0"
---

# Verified Refactor Planner

Use this skill to convert repo evidence into a bounded refactor task list, implement safe slices, and verify each claim before closeout.

## Workflow

1. **Load repo instructions** — Read local agent instructions, README, TODO/roadmap files, manifests, CI scripts, and relevant docs before planning.
2. **Inventory current state** — Check git status, recent handoffs, failing logs, oversized files, duplicate modules, stale docs, and existing tests.
3. **Create the task list** — Group work into independently reversible refactor tasks with acceptance criteria and verification commands. Use [the task-list template](templates/refactor-task-list.md).
4. **Select one slice** — Choose the smallest task with clear evidence, low public API risk, and meaningful verification.
5. **Implement narrowly** — Preserve behavior, compatibility imports, config semantics, and documented user-facing interfaces unless the repo evidence explicitly requires a change.
6. **Verify locally** — Run targeted tests first, then repo-native policy/lint/full-test gates when available. See [the execution protocol](references/execution-protocol.md).
7. **Sync docs/state** — Update docs, README, TODOs, handoffs, and memory/state files only when the implementation changes their truth value.
8. **Close out** — Report changed files, exact commands, observed results, assumptions, unknowns, skipped checks, residual risks, and the next safest slice.

## Guardrails

- Do not attempt the entire backlog at once.
- Do not invent requirements, APIs, tests, or verification evidence.
- Do not remove compatibility shims unless usage and deprecation evidence support it.
- Do not claim green status unless the exact command was run and passed.
- If verification fails, make one focused repair attempt before broadening scope.
