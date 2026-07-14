# Phase 6: Workspace Profiles and Safety - Research

**Researched:** 2026-07-14
**Domain:** Durable workspace profiles, searchable/paginated selection, trust/preference, lifecycle safety, approvals, and active-process locking
**Execution mode:** Inline substitution for `gsd-phase-researcher`

## Findings

- Phase 4 already introduced a minimal `WorkspaceProfile` with stable ID, name, Host/WSL paths, and deletion state. Phase 6 should extend this type rather than create a parallel store. [VERIFIED: codebase]
- The installed LM Studio config schematics do not provide a dynamic searchable dropdown or infinite-list contract. The practical supported surface is a tool-driven picker API: list/search with cursor pagination, add/update actions, and explicit switch operations. [VERIFIED: installed SDK + Phase 4 architecture]
- `toolsProvider` constructs tools per chat and already owns the active workspace selection. It is the correct orchestration seam for per-chat switching, while persistence remains in `settings.ts`. [VERIFIED: codebase]
- Phase 5 introduced shared preflight and structured recovery errors. Workspace switching must reuse those guards and add active invocation, unresolved termination, trust, and identity checks before committing the new selection. [VERIFIED: codebase]
- `executor.ts` already reports `terminationIncomplete`; this can feed an invocation registry/lock rather than being treated as a transient message only. [VERIFIED: codebase]

## Recommended Architecture

1. Extend `WorkspaceProfile` with `enabled`, `trusted`, `preferred`, timestamps, repository identity metadata, and lifecycle state while keeping backward-compatible normalization.
2. Add a pure `WorkspaceCatalog` service for add, rename, locate, soft-delete, restore, permanent delete, search, sort, and cursor pagination.
3. Expose picker tools that return compact paginated items plus `nextCursor`; the UI can implement infinite scroll by repeatedly calling the list tool.
4. Add a `WorkspaceInvocationRegistry` keyed by chat/workspace to track active invocations and unresolved termination. Switching/deleting must fail closed while locked.
5. Add tool metadata for workspace requirement, environment compatibility, and destructiveness, then compose approval and trust checks through preflight.
6. Persist trusted and preferred flags independently. Preferred affects ordering/default presentation; trusted affects whether operations may proceed without an explicit trust action.
7. Make switching transactional: validate candidate profile/environment/path/identity/trust first, then update active selection and invalidate cached backend only after all checks pass.

## Picker Contract

- `list_workspaces(query?, cursor?, limit?)`
- `add_workspace(name, hostPath?, wslPath?, trusted?, preferred?)`
- `update_workspace(profileId, patch)`
- `switch_workspace(profileId)`
- `delete_workspace(profileId, permanent?)`
- `restore_workspace(profileId)`
- `set_workspaces_enabled(enabled)`

Pagination should be stable and deterministic: preferred first, then recent/name, with opaque cursor based on sort position and profile ID.

## Validation Architecture

- Unit tests: catalog lifecycle, pagination/search, stable cursor behavior, preferred ordering, trust persistence, repository identity checks, invocation locking.
- Integration tests: large lists and incremental loading, per-chat switching, active invocation blocking, unresolved termination blocking, delete/restore flows, outside-workspace approval metadata.
- Final gate: `npm test && npm run build && npm run verify:release && git diff --check`.

## Pitfalls

- Updating `activeWorkspaceProfileId` before validation completes.
- Using preferred as a synonym for trusted.
- Letting disabled/deleted profiles remain executable.
- Cursor pagination that duplicates or skips items when ordering changes mid-session.
- Permanent deletion while a chat still references the profile.
- Trust grants without path/environment scope.
- Repository identity checks that require Git or silently accept mismatches.

## Planning Implications

- Plan 06-01: durable profile/catalog model, lifecycle, search, pagination, trust/preference.
- Plan 06-02: invocation locking, tool metadata, approvals, identity, and safe transactional switching.
- Plan 06-03: contextual picker tools and end-to-end integration/release verification.
