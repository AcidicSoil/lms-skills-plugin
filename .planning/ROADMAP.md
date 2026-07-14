# Roadmap

## Shipped Milestones

- [v1.0 — Host/WSL Execution and Project Workspaces](milestones/v1.0-ROADMAP.md) — shipped 2026-07-13; Host/WSL execution, deterministic workspaces, environment-aligned tools, native shells, documentation, and release validation.

## Active Milestone: v1.1 — Additional Polish

### Phase 4 — Contextual Workspace UI ✓ (completed 2026-07-14)

**Goal:** Make workspace and environment selection visible, understandable, and recoverable in the plugin UI.

**Requirements:** UI-01 through UI-08

**Deliverables:**
- Contextual workspace selector and profile presentation.
- Explicit workspace validity and availability states.
- Environment-aware Host/WSL settings visibility.
- Default-distribution behavior and advanced validated override.
- WSL capability detection and refresh.
- Clear distinction between chat scope, profile persistence, and global defaults.

### Phase 5 — Backend Guarantees and Validation ✓ (completed 2026-07-14)

**Goal:** Make every invocation use one coherent backend with strict preflight checks, correct shell semantics, and observable failures.

**Requirements:** BACK-01 through BACK-08; TEST-01, TEST-03, TEST-04, TEST-06, TEST-08

**Deliverables:**
- Unified Host/WSL routing across command, filesystem, repository, and skill workflows.
- Structured versus raw command execution semantics.
- Strict environment, distribution, path, and backend validation.
- Structured recovery errors.
- Integration coverage for backend consistency and invalid-state behavior.

### Phase 6 — Workspace Profiles and Safety

**Goal:** Add durable workspace lifecycle management and enforce safety around permissions, destructive actions, and active processes.

**Requirements:** PROF-01 through PROF-11; TEST-05, TEST-09

**Deliverables:**
- Durable workspace profile model and lifecycle actions.
- Tool compatibility and destructiveness metadata.
- Scoped outside-workspace approvals and destructive confirmations.
- Active-invocation locking and process-tree state tracking.
- Advisory repository identity checks.
- Searchable, incrementally loaded workspace picker with inline add-workspace input.
- Explicit workspace enable/disable state plus persisted trusted and preferred workspace flags.
- Safe per-chat workspace switching guarded by validation and active-process state.

### Phase 7 — Compatibility and Advanced Management

**Goal:** Preserve compatibility while adding migration, bounded audit controls, and capability-gated restoration behavior.

**Requirements:** COMP-01 through COMP-06; TEST-02, TEST-07

**Deliverables:**
- Settings migration and malformed-data recovery.
- Safe downgrade and non-Windows behavior.
- Bounded workspace approval-history management.
- Session-restoration behavior gated on stable host APIs.
- Compatibility and persistence integration coverage.

## Progress

| Phase | Status | Requirements |
|---|---|---|
| 4 — Contextual Workspace UI | Complete (2026-07-14) | 8 |
| 5 — Backend Guarantees and Validation | Complete (2026-07-14) | 13 |
| 6 — Workspace Profiles and Safety | Not started | 13 |
| 7 — Compatibility and Advanced Management | Not started | 8 |
