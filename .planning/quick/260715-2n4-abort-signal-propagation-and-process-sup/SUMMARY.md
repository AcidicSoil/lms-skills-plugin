---
quick_id: 260715-2n4
status: complete
completed: 2026-07-15
commits:
  - 2ca165a
---

# Abort-Aware Process Settlement

Added abort propagation to both raw command and structured program execution and guaranteed bounded promise settlement after termination attempts.

## Completed

- Added optional `AbortSignal` support to `ExecOptions` and `ExecProgramOptions`.
- Added an `aborted` result marker distinct from timeout reporting.
- Prevented already-aborted requests from spawning a child process.
- Routed timeout and cancellation through one termination path.
- Added a 250 ms settlement fallback when a child never emits `close` or `error`.
- Removed abort listeners and cleared timeout/settlement timers on completion.
- Detached Windows `taskkill` helpers from the parent event loop.

## Verification

- `npm test`: 85 tests passed, 0 failed.
- `npm run build`: TypeScript compilation passed.
- Tests cover pre-abort, active raw-command abort, structured-program abort, and a child that never closes.

## Outcome

Execution promises now settle exactly once after normal completion, spawn failure, timeout, or cancellation, including non-cooperative child-process behavior.
