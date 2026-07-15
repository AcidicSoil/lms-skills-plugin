---
quick_id: 260715-2eh
status: planned
description: "Refactor filesystem access for portability: remove wsl.exe from skill scanning and workspace filesystem I/O, use native Node fs with WSL UNC mapping, preserve wsl.exe only for explicit Linux command execution, and propagate abort signals to prevent hangs."
---

# Quick Task Plan

## Task 1 — Introduce native WSL path mapping

**Files:** `src/wslPath.ts`, `test/wslPath.test.ts`

**Action:** Add strict Linux-absolute to Windows WSL UNC conversion and display/native path helpers. Validate distribution names and reject traversal-ambiguous inputs.

**Verify:** Run the focused path-mapping tests and TypeScript build.

**Done:** WSL paths can be resolved once at the filesystem boundary without shell interpolation or hard-coded user paths.

## Task 2 — Replace WSL skill and workspace filesystem subprocess I/O

**Files:** `src/skillStore.ts`, `src/workspaceFs.ts`, `test/skillStore.test.ts`, `test/workspaceFs.test.ts`

**Action:** Use Node `fs/promises` for scan/read/list/write/append/mkdir/delete/move operations against host-visible native paths. Preserve Linux display paths in tool results. Keep `wsl.exe` only for explicit command execution and the existing bounded HOME resolution boundary where legacy `~/` configuration requires it.

**Verify:** Run focused skill-store/workspace-filesystem tests, then the full test suite and TypeScript build.

**Done:** Normal skill discovery and workspace filesystem operations launch no per-file or per-operation WSL processes.

## Task 3 — Document execution outcome

**Files:** `.planning/quick/260715-2eh-refactor-filesystem-access-for-portabili/SUMMARY.md`, `.planning/STATE.md`

**Action:** Record behavior, tests, remaining boundary limitation, and commits. Update the Quick Tasks Completed table only.

**Verify:** Confirm summary frontmatter is `status: complete` and STATE links to this quick task.

**Done:** The quick task is auditable and atomic.
