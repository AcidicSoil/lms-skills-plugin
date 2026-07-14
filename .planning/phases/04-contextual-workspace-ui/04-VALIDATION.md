---
phase: 04
slug: contextual-workspace-ui
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-14
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test runner via `scripts/test.mjs` |
| **Config file** | `package.json`, `scripts/test.mjs` |
| **Quick run command** | `npm test -- --test-name-pattern="workspace selection|workspace configuration|WSL capability|workspace status"` |
| **Full suite command** | `npm test && npm run build && npm run verify:release` |
| **Estimated runtime** | Existing project suite; no new framework setup required |

## Sampling Rate

- **After every task commit:** Run the task's focused `npm test -- --test-name-pattern=...` command.
- **After every plan wave:** Run `npm test && npm run build`.
- **Before `$gsd-verify-work`:** Run `npm test && npm run build && npm run verify:release && git diff --check`.
- **Max feedback latency:** One focused test command per task.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | UI-01, UI-02, UI-03, UI-08 | unit | `npm test -- --test-name-pattern="workspace selection"` | ❌ Wave 1 creates | ⬜ pending |
| 04-01-02 | 01 | 1 | UI-03, UI-08 | unit/compatibility | `npm test -- --test-name-pattern="settings|compatibility" && npm run build` | ✅ extend | ⬜ pending |
| 04-02-01 | 02 | 2 | UI-04 | integration | `npm test -- --test-name-pattern="environment-specific workspace configuration|tools provider" && npm run build` | ✅ extend | ⬜ pending |
| 04-02-02 | 02 | 2 | UI-05, UI-06, UI-07 | unit | `npm test -- --test-name-pattern="WSL capability|settings" && npm run build` | ✅ extend | ⬜ pending |
| 04-03-01 | 03 | 3 | UI-01, UI-02, UI-03, UI-06, UI-07, UI-08 | integration | `npm test -- --test-name-pattern="workspace status|capability refresh|no fallback"` | ✅ extend | ⬜ pending |
| 04-03-02 | 03 | 3 | UI-01, UI-02, UI-03, UI-06, UI-07, UI-08 | integration | `npm test -- --test-name-pattern="workspace status|capability refresh|no fallback|tools provider" && npm run build` | ✅ extend | ⬜ pending |
| 04-03-03 | 03 | 3 | all Phase 4 | regression/release | `npm test && npm run build && npm run verify:release && git diff --check` | ✅ | ⬜ pending |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. New test files are created by their owning TDD tasks before implementation.

## Manual-Only Verifications

All Phase 4 behaviors have automated verification. Visual labels in static LM Studio config are source-asserted and build-checked; contextual visibility is verified by tool-list integration tests.

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity: no three consecutive tasks without automated verification.
- [x] Wave 0 uses existing infrastructure.
- [x] No watch-mode flags.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-07-14
