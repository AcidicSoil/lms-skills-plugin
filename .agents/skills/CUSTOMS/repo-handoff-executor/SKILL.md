---
name: repo-handoff-executor
description: "Continue repo work from handoff notes using bounded, verified implementation slices. WHEN: \"continue from handoff\", \"pick up repo work\", \"run next slice\", \"resolve failing tests\", \"sync repo state\", \"auto continue project\"."
---

# Repo Handoff Executor

Use this skill to continue a repository from handoff notes, chat exports, failing-test logs, memory files, TODOs, or recent plan docs.

## Workflow

1. **Load instructions** — Read repo-local guidance, handoff/state files, TODOs, plans, manifests, tests, CI config, and recent logs.
2. **Preserve state** — Inspect `git status` before editing. Do not overwrite staged or unstaged work without explicit evidence that it belongs to the current slice.
3. **Derive backlog** — If no formal tracker exists, create an ephemeral backlog from repo evidence only.
4. **Select slice** — Choose the smallest reversible task with clear acceptance criteria and a meaningful verification path.
5. **Implement narrowly** — Preserve public behavior unless the handoff explicitly requires a change.
6. **Verify** — Run targeted checks first, then repo-native policy/full checks before claiming completion.
7. **Sync state** — Update docs, memory, or handoff files only when implementation changes make existing state stale.
8. **Handoff** — Report changed files, commands, observed results, residual risks, and next slice.

See [Execution Protocol](references/execution-protocol.md) for detailed gates and output format.

## Output

Return structured markdown:

- Objective
- Inputs Resolved
- Repo Evidence Scan
- Temporary Backlog
- Selected Slice
- Implementation Summary
- Verification Gate
- Closeout
- Stop / Continue Decision
- Next Repo-Derived Slice
- Handoff

## Failure Handling

- If verification fails, make one focused repair attempt and rerun relevant checks.
- If required evidence, credentials, or destructive approval is missing, stop and state the blocker.
- If a fact is uncertain, mark it `Unknown` and continue only when safe.
