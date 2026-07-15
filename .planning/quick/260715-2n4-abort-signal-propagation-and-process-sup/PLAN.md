---
quick_id: 260715-2n4
status: planned
description: "Propagate abort signals through command execution and guarantee process promises settle after termination attempts."
---

# Quick Task Plan

## Task 1 — Add abort-aware execution contracts

**Files:** `src/executor.ts`

**Action:** Add `AbortSignal` support to raw and structured execution options, report aborted outcomes distinctly, and use a shared termination path for timeout and cancellation.

**Verify:** TypeScript build succeeds.

**Done:** Already-aborted and later-aborted requests do not launch or remain pending indefinitely.

## Task 2 — Guarantee supervisor settlement

**Files:** `src/executor.ts`, `test/executor.test.ts`

**Action:** Add a bounded post-termination settlement fallback so command promises resolve even when a child process never emits `close` or `error`. Remove listeners and timers deterministically.

**Verify:** Focused tests cover pre-abort, active abort, and non-closing child behavior; full suite passes.

**Done:** Every execution request settles exactly once after completion, spawn failure, timeout, or abort.

## Task 3 — Record completion

**Files:** `.planning/quick/260715-2n4-abort-signal-propagation-and-process-sup/SUMMARY.md`, `.planning/STATE.md`

**Action:** Record implementation, verification, and commits; update only the Quick Tasks Completed table.

**Verify:** Summary status is complete and STATE links the task.

**Done:** The task is auditable under GSD quick tracking.
