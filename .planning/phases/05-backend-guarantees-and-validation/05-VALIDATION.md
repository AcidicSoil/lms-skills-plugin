---
phase: 05
slug: backend-guarantees-and-validation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-14
---

# Phase 05 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Node.js built-in test runner via `scripts/test.mjs` |
| Quick command | `npm test -- --test-name-pattern="execution contract|preflight|backend routing|structured recovery"` |
| Full command | `npm test && npm run build && npm run verify:release` |

## Sampling

- Run focused tests after every task.
- Run `npm test && npm run build` after every plan wave.
- Run the full command plus `git diff --check` before verification.

## Per-Task Verification Map

| Task | Requirements | Automated command |
|---|---|---|
| 05-01-01 | BACK-04, BACK-05, BACK-06 | `npm test -- --test-name-pattern="execution contract|executor"` |
| 05-01-02 | BACK-07, BACK-08, TEST-08 | `npm test -- --test-name-pattern="preflight|structured recovery" && npm run build` |
| 05-02-01 | BACK-01, BACK-02 | `npm test -- --test-name-pattern="workspace backend|workspace filesystem"` |
| 05-02-02 | BACK-03, TEST-03 | `npm test -- --test-name-pattern="backend routing|skill store|discovery" && npm run build` |
| 05-03-01 | TEST-01, TEST-04, TEST-06 | `npm test -- --test-name-pattern="Host and WSL isolation|no fallback|distribution"` |
| 05-03-02 | BACK-08, TEST-08 | `npm test -- --test-name-pattern="structured recovery|capability state"` |
| 05-03-03 | all | `npm test && npm run build && npm run verify:release && git diff --check` |

## Sign-Off

All tasks have automated verification; no manual-only gates are required.
