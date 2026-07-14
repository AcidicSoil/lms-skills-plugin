# Phase 7: Compatibility and Advanced Management - Research

**Researched:** 2026-07-14
**Domain:** Settings schema migration, malformed-data recovery, downgrade/non-Windows safety, bounded approval history, and capability-gated session restoration
**Execution mode:** Inline substitution for `gsd-phase-researcher`

## Findings

- `src/settings.ts` already centralizes normalization, persistence, and controller-scoped effective-config caching. Phase 7 should formalize schema versions and migration there rather than introducing a second storage path. [VERIFIED: codebase]
- Current malformed JSON handling falls back to defaults, which can silently discard recoverable data. A staged parser should distinguish unreadable JSON, partially valid objects, unsupported future versions, and recoverable legacy fields. [VERIFIED: codebase]
- WSL capability code already returns `unsupported-platform` on non-Windows. Persisted WSL-specific fields can remain stored but must not become executable state on unsupported hosts. [VERIFIED: codebase]
- Workspace profiles and active selection are persisted independently from LM Studio session APIs. Per-chat restoration can be modeled through plugin-owned chat selection records keyed by a stable caller-supplied chat ID when available. [VERIFIED: architecture]
- No stable host session-resume API is visible in the installed SDK typings. Resume must therefore be capability-gated and report unavailable rather than copying transcripts or synthesizing sessions. [VERIFIED: installed SDK]
- Approval metadata exists as contracts but no bounded history store exists. The history should retain only workspace/profile ID, tool name, normalized path scope, decision, timestamp, and expiration; never outputs, file contents, or full raw command text. [VERIFIED: requirements]

## Recommended Architecture

1. Add `settingsSchemaVersion` and a pure migration pipeline that upgrades legacy/partial objects stepwise and preserves unknown future-version data in a downgrade-safe envelope.
2. Return structured load diagnostics alongside normalized settings so malformed or partially recovered data is visible without blocking startup.
3. Add a platform-safety pass that preserves WSL settings at rest but disables WSL execution on unsupported hosts.
4. Add a bounded `ApprovalHistoryStore` with per-workspace filtering, retention count/age, clear/revoke actions, and redacted records.
5. Add plugin-owned chat workspace selection persistence keyed by chat ID, independent of host transcript/session APIs.
6. Add a session-capability adapter whose default reports unsupported. Expose resume only when a stable host capability is explicitly supplied.

## Validation Architecture

- Unit tests: migration matrix, malformed JSON recovery, future-version/downgrade handling, non-Windows WSL safety, approval redaction/retention, session capability gating.
- Integration tests: per-chat selection persistence/restoration across provider recreation, malformed settings startup, non-Windows startup with WSL state, approval history tools.
- Final gate: `npm test && npm run build && npm run verify:release && git diff --check`.

## Pitfalls

- Overwriting the only settings file before a migration succeeds.
- Treating unknown future fields as corruption.
- Deleting WSL configuration merely because the current host is non-Windows.
- Storing raw command strings, outputs, file contents, or transcript text in audit/history records.
- Claiming resume support without a stable host API.
- Binding workspace persistence to ephemeral session objects.

## Planning Implications

- Plan 07-01: versioned settings migration, malformed-data diagnostics, downgrade and non-Windows safety.
- Plan 07-02: bounded redacted approval history with management tools.
- Plan 07-03: per-chat selection restoration, capability-gated resume, integration and release verification.
