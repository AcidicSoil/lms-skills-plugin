# Requirements: Host/WSL Execution and Project Workspaces

**Defined:** 2026-07-13
**Core Value:** Users can safely run skill-driven file and shell workflows in one predictable per-chat workspace across Windows Host and WSL execution.

## v1 Requirements

### Configuration and Detection

- [x] **EXEC-01**: User can keep Host execution as the backward-compatible default.
- [x] **EXEC-02**: Windows user can select WSL execution when WSL is available.
- [x] **EXEC-03**: User can view and select from installed WSL distributions.
- [x] **EXEC-04**: User receives an actionable error when WSL or the selected distribution is unavailable.
- [x] **EXEC-05**: Existing persisted settings load without requiring manual migration.

### Workspace Lifecycle

- [ ] **WORK-01**: Each chat resolves to a deterministic project workspace identifier.
- [ ] **WORK-02**: The plugin creates the active workspace idempotently before project-scoped tool use.
- [ ] **WORK-03**: User can inspect the active mode, distribution, and workspace location.
- [ ] **WORK-04**: Host-mode workspaces use a host-native root and WSL-mode workspaces use a Linux-native root by default.
- [ ] **WORK-05**: A stale workspace or removed distribution fails safely without corrupting project state.

### Paths and Tool Routing

- [x] **PATH-01**: Relative project paths resolve from the active workspace root.
- [x] **PATH-02**: Windows drive, Linux, and WSL UNC paths are classified and translated explicitly.
- [x] **PATH-03**: Translation preserves spaces, Unicode, separator semantics, and drive-letter normalization.
- [x] **PATH-04**: Project-scoped filesystem operations reject escape outside the workspace after canonicalization.
- [ ] **TOOL-01**: File read, write, patch, append, move, rename, delete, create, and list tools share the same workspace context.
- [ ] **TOOL-02**: `run_command` executes in the same active workspace and selected environment as file tools.
- [ ] **TOOL-03**: Skill-library reads remain governed by configured skill roots rather than project workspace rules.

### Execution Reliability and Quality

- [x] **SAFE-01**: WSL invocation passes distribution, working directory, and command through argument-safe process APIs.
- [x] **SAFE-02**: Host and WSL command execution enforce existing timeout and output limits.
- [x] **SAFE-03**: Timeout handling attempts to terminate command descendants and reports incomplete termination.
- [x] **TEST-01**: Automated tests cover execution settings, capability detection, path translation, and containment.
- [ ] **TEST-02**: Automated integration tests prove file and shell tools use one workspace in Host and WSL modes.
- [ ] **TEST-03**: Existing Host workflows and plugin build remain passing.
- [ ] **DOCS-01**: User documentation explains setup, mode selection, workspace locations, limitations, and troubleshooting.

## v2 Requirements

- **WORK-06**: User can choose custom per-mode workspace root templates.
- **WORK-07**: User can browse and resume historical project workspaces through dedicated UI.
- **SYNC-01**: User can mirror selected files between Host and WSL roots.
- **BOOT-01**: Skills can declare optional workspace bootstrap templates.

## Out of Scope

- Remote SSH execution — local Host and WSL only.
- Docker/container execution — separate execution backend.
- Automatic WSL installation or administrative enablement — plugin should detect and explain only.
- Full command sandboxing — host permissions and explicit tool authority remain the security boundary.
- Network-shared or multi-user workspace synchronization — not required for local LM Studio use.

## Definition of Done

- Every v1 requirement maps to exactly one roadmap phase.
- Strict TypeScript build and automated tests pass.
- Host compatibility and representative WSL behavior are verified.
- Security-sensitive path and process cases have negative tests.
- Documentation and migration behavior are complete.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXEC-01..05 | Phase 1 | Complete |
| PATH-01..04 | Phase 1 | Complete |
| SAFE-01..03 | Phase 1 | Complete |
| WORK-01..05 | Phase 2 | Pending |
| TOOL-01..03 | Phase 2 | Pending |
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 3 | Pending |
| DOCS-01 | Phase 3 | Pending |

---
*Last updated: 2026-07-13 after initialization*
