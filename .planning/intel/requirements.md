# Synthesized Requirements

Source: `todo-ui-config.md`

## Immediate polish scope

- **REQ-ui-workspace-control** — Add a contextual Workspace selector with active profile name, environment-specific path editing or picking, explicit validity state, and lifecycle actions. Acceptance: unset, valid, unavailable, moved, and configuration-required states are visible; invalid paths never fall back to home.
- **REQ-ui-environment-context** — Make execution settings environment-aware. Acceptance: Host-only shell controls are hidden or disabled in WSL mode; WSL-only controls are hidden in Host mode; descriptions identify scope.
- **REQ-ui-wsl-distribution** — Use the system default WSL distribution by default and move any override behind an advanced opt-in with validation. Acceptance: missing, misspelled, deleted, or unavailable distributions produce actionable status.
- **REQ-ui-scope-clarity** — Distinguish chat-scoped active environment/workspace selection from persistent workspace profiles and global plugin defaults in storage and UI copy.
- **REQ-ui-wsl-capability** — Surface WSL capability state and provide refresh. Acceptance: ready, executable missing, no distributions, no default distribution, selected distribution unavailable, and pending states are distinguishable.
- **REQ-ui-backend-routing** — Route every workspace-facing command and filesystem operation through the selected Host or WSL backend. Acceptance: WSL paths never reach Host filesystem APIs and repository/tool discovery uses the same backend.
- **REQ-ui-command-semantics** — Separate structured program/argument execution from raw shell-string execution. Acceptance: WSL raw commands use the WSL shell, Host shell settings do not affect WSL, and arbitrary command strings are not tokenized.
- **REQ-ui-integration-tests** — Add observable integration coverage for isolated Host/WSL settings, per-chat workspace selection, backend consistency, strict validation, active-invocation safety, distribution validation, migration compatibility, and non-Windows behavior.

## Secondary scope

- **REQ-ui-workspace-profiles** — Persist durable workspace profiles with stable ID, editable name, Host and WSL paths, availability/deletion state, workspace settings, and optional last-session reference.
- **REQ-ui-tool-metadata** — Define workspace requirement, destructiveness, and environment compatibility metadata for tools with structured recovery errors.
- **REQ-ui-boundary-approvals** — Support invocation-time outside-workspace approvals, path-specific grants, read/write scope, destructive confirmation, and affected-path previews.
- **REQ-ui-process-locking** — Prevent workspace switching or deletion while an invocation is active or termination is unresolved; track workspace ownership and process-tree termination state.
- **REQ-ui-lifecycle** — Support rename, locate, path management, soft delete, restore, permanent delete, identity revalidation, and deleted-workspace recovery.
- **REQ-ui-repository-identity** — Add advisory repository identity checks that fail closed on mismatch without requiring Git.
- **REQ-ui-audit-management** — Provide workspace-specific approval history controls with bounded retention while excluding outputs, file contents, and full command strings.
- **REQ-ui-migration-errors** — Define settings schema migration, malformed-data handling, downgrade behavior, safe non-Windows handling, and structured error codes for workspace, WSL, environment, approval, identity, and process failures.
- **REQ-ui-session-restoration** — Keep workspace persistence independent of host session APIs and expose resume behavior only when stable supported APIs exist; never duplicate transcripts as a workaround.
