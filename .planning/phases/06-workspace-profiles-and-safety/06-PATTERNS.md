# Phase 06 Pattern Map

**Execution mode:** Inline substitution for `gsd-pattern-mapper`.

## `src/types.ts` / `src/settings.ts`

Extend the existing `WorkspaceProfile` and persisted settings. Keep normalization backward compatible and preserve stable IDs. Treat `enabled`, `trusted`, and `preferred` as separate fields.

## New `src/workspaceCatalog.ts`

Pure domain service for lifecycle, search, ordering, and cursor pagination. No direct filesystem calls. Inputs and outputs remain deterministic and unit-testable.

## New `src/invocationRegistry.ts`

Track active invocation count, workspace ownership, and unresolved termination by chat/workspace. Expose acquire/release/mark-termination APIs and pure switch/delete guards.

## `src/preflight.ts` / `src/recoveryError.ts`

Reuse existing structured failures. Add trust-required, workspace-disabled, profile-deleted, and workspace-busy recovery variants only where needed; retain the existing common response mapper.

## `src/toolsProvider.ts`

Expose paginated picker and lifecycle tools. Candidate switching is transactional: load profile → validate enabled/deleted/environment/path/identity/trust → check registry → persist active profile → invalidate cached backend.

## `src/backend.ts` / `src/executor.ts`

Register active invocation ownership around operational calls. Propagate `terminationIncomplete` into the registry before release.

## Tests

- New `test/workspaceCatalog.test.ts`
- New `test/invocationRegistry.test.ts`
- Extend `test/workspaceConfiguration.integration.test.ts`
- Extend `test/phase5.integration.test.ts` for guard compatibility

## Data Flow

Picker query → catalog pagination → candidate profile → safety/identity/trust validation → invocation lock check → transactional selection update → backend cache reset → subsequent operations use new workspace.
