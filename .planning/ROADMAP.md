# Roadmap: Host/WSL Execution and Project Workspaces

## Overview

This milestone delivers safe, backward-compatible Host/WSL execution and deterministic per-chat workspaces in three coarse vertical phases. Each phase produces a usable increment and preserves the current LM Studio plugin behavior.

## Phases

### Phase 1: Execution and Path Foundation
**Status:** Complete (2026-07-13)
**Goal:** Users can configure Host or WSL execution and the plugin can safely resolve, translate, and execute against environment-native paths.
**Mode:** mvp
**Requirements:** EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05, PATH-01, PATH-02, PATH-03, PATH-04, SAFE-01, SAFE-02, SAFE-03, TEST-01
**Success Criteria**:
1. Existing settings load as Host mode and existing Host commands still work.
2. On Windows, installed WSL distributions can be detected, selected, validated, and invoked without shell-string interpolation.
3. Path classification and translation tests pass for Windows drive paths, Linux paths, WSL UNC paths, spaces, Unicode, and invalid inputs.
4. Canonical workspace containment rejects traversal and representative symlink/junction escape cases.
5. Command timeouts and output limits behave consistently in Host and WSL adapters.

### Phase 2: Per-Chat Workspace and Tool Integration
**Goal:** Every project-scoped file and shell tool operates through one deterministic per-chat workspace context in the selected environment.
**Mode:** mvp
**Requirements:** WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, TOOL-01, TOOL-02, TOOL-03, TEST-02
**Success Criteria**:
1. Repeated calls for the same chat resolve the same workspace and create it idempotently.
2. Host-mode workspaces use host-native roots, while WSL-mode workspaces default to the selected distribution's Linux filesystem.
3. All project-scoped file tools and `run_command` resolve relative paths from the same workspace.
4. Skill-library access remains restricted to configured skill roots and is not accidentally redirected into the project workspace.
5. Integration tests demonstrate create/read/edit/run workflows in Host mode and a testable WSL adapter path.

### Phase 3: Compatibility, Hardening, and Release Readiness
**Goal:** Existing users can adopt the feature safely with complete tests, diagnostics, and documentation.
**Mode:** mvp
**Requirements:** TEST-03, DOCS-01
**Success Criteria**:
1. Strict TypeScript compilation and the full automated suite pass without Host-mode regressions.
2. Unsupported WSL, removed distributions, inaccessible roots, and incomplete process termination return actionable diagnostics.
3. Generated `dist/` artifacts match source and no model-facing tool response is unintentionally broken.
4. README and configuration documentation explain Host/WSL setup, workspace locations, security boundaries, performance guidance, and troubleshooting.
5. Manual release checks validate one Windows Host workflow and one WSL workflow end to end.

## Coverage

- v1 requirements: 27
- Requirements mapped: 27
- Unmapped: 0
- Duplicated across phases: 0

## Phase Dependency Graph

Phase 1 → Phase 2 → Phase 3

Phase 1 provides the execution and path contracts. Phase 2 consumes those contracts to route tools through workspaces. Phase 3 validates and documents the integrated product.

---
*Created: 2026-07-13*
