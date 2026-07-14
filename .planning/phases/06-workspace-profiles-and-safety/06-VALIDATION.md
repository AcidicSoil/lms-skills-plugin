---
phase: 06
slug: workspace-profiles-and-safety
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-14
---

# Phase 06 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Node.js built-in test runner via `scripts/test.mjs` |
| Quick command | `npm test -- --test-name-pattern="workspace catalog|workspace picker|invocation lock|trusted workspace|workspace switch"` |
| Full command | `npm test && npm run build && npm run verify:release` |

## Sampling

- Run focused tests after every task.
- Run `npm test && npm run build` after each plan wave.
- Run the full suite plus `git diff --check` before verification.

## Per-Task Verification Map

| Task | Requirements | Automated command |
|---|---|---|
| 06-01-01 | PROF-01, PROF-07, PROF-09, PROF-10 | `npm test -- --test-name-pattern="workspace catalog|workspace pagination|trusted workspace"` |
| 06-01-02 | PROF-08 | `npm test -- --test-name-pattern="repository identity|workspace catalog" && npm run build` |
| 06-02-01 | PROF-05, PROF-06, TEST-05 | `npm test -- --test-name-pattern="invocation lock|termination unresolved|workspace busy"` |
| 06-02-02 | PROF-02, PROF-03, PROF-04 | `npm test -- --test-name-pattern="tool metadata|workspace approval|destructive confirmation" && npm run build` |
| 06-03-01 | PROF-09, PROF-10, PROF-11, TEST-09 | `npm test -- --test-name-pattern="workspace picker|large workspace list|workspace switch"` |
| 06-03-02 | PROF-07, PROF-08, PROF-11 | `npm test -- --test-name-pattern="workspace lifecycle|repository identity|safe switch"` |
| 06-03-03 | all | `npm test && npm run build && npm run verify:release && git diff --check` |

## Sign-Off

All Phase 6 requirements have automated coverage. No manual-only verification is required.
