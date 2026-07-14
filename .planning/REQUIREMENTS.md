# Requirements: v1.1 Additional Polish

**Source:** `todo-ui-config.md`  
**Scope rule:** These requirements extend the completed v1.0 foundation; they do not reopen archived v1.0 requirements.

## Contextual Workspace UI

- [x] **UI-01** — Provide a contextual Workspace selector showing the active profile name and active environment path.
- [x] **UI-02** — Show explicit workspace states for unset, valid, unavailable, moved, and configuration-required conditions.
- [x] **UI-03** — Never fall back to the home directory when a configured workspace path is invalid or unavailable.
- [x] **UI-04** — Hide or disable Host-only shell controls in WSL mode and WSL-only controls in Host mode, with scope-aware descriptions.
- [x] **UI-05** — Use the system default WSL distribution by default and expose a validated distribution override only as an advanced opt-in.
- [x] **UI-06** — Surface WSL capability states for ready, executable missing, no distributions, no default distribution, selected distribution unavailable, and pending detection.
- [x] **UI-07** — Provide a refresh action for WSL capability and distribution detection.
- [x] **UI-08** — Clearly distinguish chat-scoped active selection, persistent workspace profiles, and global plugin defaults in UI copy and storage behavior.

## Backend Guarantees and Validation

- [x] **BACK-01** — Route every workspace-facing command and filesystem operation through the selected Host or WSL backend.
- [x] **BACK-02** — Prevent WSL paths from reaching Host filesystem APIs.
- [x] **BACK-03** — Run repository and tool discovery through the same selected backend as command and filesystem operations.
- [x] **BACK-04** — Separate structured program/argument execution from raw shell-string execution.
- [x] **BACK-05** — Execute WSL raw commands through the WSL shell without applying Host shell settings.
- [x] **BACK-06** — Do not tokenize arbitrary raw command strings as structured arguments.
- [x] **BACK-07** — Add strict preflight validation for environment, distribution, workspace path, and backend availability before invocation.
- [x] **BACK-08** — Return structured, actionable errors for invalid workspace, unavailable environment, missing distribution, incompatible tool, denied approval, identity mismatch, and unresolved process termination.

## Workspace Profiles and Safety

- [ ] **PROF-01** — Persist workspace profiles with stable ID, editable name, Host and WSL paths, availability/deletion state, workspace settings, and optional last-session reference.
- [ ] **PROF-02** — Define tool metadata for workspace requirement, destructiveness, and environment compatibility.
- [ ] **PROF-03** — Support invocation-time outside-workspace approvals with path-specific grants, read/write scope, and affected-path preview.
- [ ] **PROF-04** — Require explicit destructive confirmation where tool metadata or affected paths indicate destructive behavior.
- [ ] **PROF-05** — Prevent workspace switching or deletion while an invocation is active or termination remains unresolved.
- [ ] **PROF-06** — Track workspace ownership and process-tree termination state for active invocations.
- [ ] **PROF-07** — Support rename, locate, path management, soft delete, restore, permanent delete, and deleted-workspace recovery.
- [ ] **PROF-08** — Add advisory repository identity checks that fail closed on mismatch without requiring Git.

## Compatibility and Management

- [ ] **COMP-01** — Provide schema migration for existing settings and malformed-data handling without silently discarding recoverable configuration.
- [ ] **COMP-02** — Define downgrade behavior and safe non-Windows behavior for WSL-specific settings.
- [ ] **COMP-03** — Provide workspace-specific approval-history controls with bounded retention.
- [ ] **COMP-04** — Exclude command outputs, file contents, and full command strings from approval-history records.
- [ ] **COMP-05** — Keep workspace persistence independent of host session APIs.
- [ ] **COMP-06** — Expose resume behavior only when stable supported APIs exist; never duplicate transcripts as a workaround.

## Verification

- [x] **TEST-01** — Cover isolated Host and WSL settings behavior in integration tests.
- [ ] **TEST-02** — Cover per-chat environment and workspace selection persistence and restoration.
- [x] **TEST-03** — Cover backend consistency across command execution, filesystem tools, repository discovery, and skill workflows.
- [x] **TEST-04** — Cover strict invalid-path behavior and prove there is no home-directory fallback.
- [ ] **TEST-05** — Cover active-invocation workspace-switch and deletion safety.
- [x] **TEST-06** — Cover WSL distribution validation, deletion, misspelling, and default-distribution changes.
- [ ] **TEST-07** — Cover settings migration, malformed persisted data, downgrade behavior, and non-Windows startup.
- [x] **TEST-08** — Cover structured recovery errors and user-visible capability states.

## Traceability

- Phase 4: UI-01 through UI-08
- Phase 5: BACK-01 through BACK-08, TEST-01, TEST-03, TEST-04, TEST-06, TEST-08
- Phase 6: PROF-01 through PROF-08, TEST-05
- Phase 7: COMP-01 through COMP-06, TEST-02, TEST-07
