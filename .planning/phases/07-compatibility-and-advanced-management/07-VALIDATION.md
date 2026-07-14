---
phase: 07
slug: compatibility-and-advanced-management
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-14
---

# Phase 07 — Validation Strategy

## Test Infrastructure

| Property | Value |
|---|---|
| Framework | Node.js built-in test runner via `scripts/test.mjs` |
| Quick command | `npm test -- --test-name-pattern="settings migration|approval history|chat workspace restoration|session capability"` |
| Full command | `npm test && npm run build && npm run verify:release` |

## Sampling

- Run focused tests after every task.
- Run `npm test && npm run build` after each plan wave.
- Run the full suite plus `git diff --check` before verification.

## Per-Task Verification Map

| Task | Requirements | Automated command |
|---|---|---|
| 07-01-01 | COMP-01, TEST-07 | `npm test -- --test-name-pattern="settings migration|malformed settings"` |
| 07-01-02 | COMP-02, TEST-07 | `npm test -- --test-name-pattern="downgrade|non-Windows startup|WSL settings" && npm run build` |
| 07-02-01 | COMP-03, COMP-04 | `npm test -- --test-name-pattern="approval history|redaction|retention"` |
| 07-02-02 | COMP-03 | `npm test -- --test-name-pattern="approval history tools|workspace history" && npm run build` |
| 07-03-01 | COMP-05, TEST-02 | `npm test -- --test-name-pattern="chat workspace restoration|selection persistence"` |
| 07-03-02 | COMP-06 | `npm test -- --test-name-pattern="session capability|resume unavailable|transcript"` |
| 07-03-03 | all | `npm test && npm run build && npm run verify:release && git diff --check` |

## Sign-Off

All eight Phase 7 requirements have automated coverage. No manual-only verification is required.
