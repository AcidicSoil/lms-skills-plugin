# Phase 07 Pattern Map

**Execution mode:** Inline substitution for `gsd-pattern-mapper`.

## `src/settings.ts`

Keep one persistence boundary. Add explicit schema versioning, pure migrations, structured load diagnostics, and atomic write/backup behavior around the existing normalization path.

## New `src/settingsMigration.ts`

Pure stepwise migrations from legacy/unversioned settings to the current schema. Preserve unknown future-version objects and expose downgrade-safe status rather than destructively rewriting them.

## New `src/approvalHistory.ts`

Bounded, redacted records keyed by workspace/profile. Store only decision metadata, never outputs, file contents, transcripts, or full command strings.

## New `src/chatWorkspaceState.ts`

Plugin-owned per-chat environment/profile selection persistence. It accepts a stable chat ID from the caller and does not depend on LM Studio transcript/session objects.

## New `src/sessionCapability.ts`

Capability adapter with explicit `supported`/`unsupported` result. Resume behavior is registered only when a stable host implementation is injected.

## `src/toolsProvider.ts`

Expose approval-history management, chat selection restoration/status, and capability-gated resume. Keep successful legacy tool contracts stable.

## Tests

- Extend `test/settings.test.ts` and `test/compatibility.test.ts`.
- New `test/settingsMigration.test.ts`.
- New `test/approvalHistory.test.ts`.
- New `test/chatWorkspaceState.test.ts` and session-capability tests.

## Data Flow

Raw persisted settings → schema detection → pure migration/recovery → platform safety → normalized effective settings. Approval decisions → redacted bounded history. Chat ID → plugin-owned selection record → provider restoration. Host session capability → explicit resume availability.
