# LMS Skills Plugin — Host/WSL Execution and Project Workspaces

## What This Is

A brownfield enhancement to the existing LM Studio skills plugin that adds explicit Host and WSL execution modes plus per-chat project workspaces. The plugin already discovers and injects skills, exposes filesystem tools, and runs shell commands. This milestone makes those tools workspace-aware and allows users on Windows to choose whether execution occurs directly on the host or inside WSL.

## Core Value

Users can safely run skill-driven file and shell workflows in a predictable per-chat workspace, with consistent path behavior across Windows host and WSL execution.

## Context

The existing codebase is a strict TypeScript LM Studio plugin. `src/index.ts` composes configuration, tools, preprocessing, setup, and execution. `src/toolsProvider.ts` currently exposes broad filesystem and shell operations; `src/executor.ts` handles platform shell resolution; `src/scanner.ts` manages skill discovery and guarded skill-file access.

The planned enhancement is described in `todo.md`. It introduces execution-mode selection, WSL distribution selection, path translation, project-root lifecycle, and tool routing through a common workspace context. The design must preserve current host behavior while adding WSL support incrementally.

## Requirements

### Validated

- ✓ Users can discover skills from configured directories — existing
- ✓ Users can explicitly activate skills and inject skill bodies into prompts — existing
- ✓ Users can read and mutate local files through LM Studio tools — existing
- ✓ Users can execute shell commands with bounded timeout and output — existing
- ✓ The plugin builds as strict TypeScript and runs through the LM Studio SDK — existing

### Active

- [ ] User can choose Host or WSL execution on supported Windows systems.
- [ ] User can select or configure a WSL distribution.
- [ ] Each chat receives a deterministic project workspace root.
- [ ] Filesystem tools resolve relative paths against the active project workspace.
- [ ] Shell commands execute in the same active project workspace and selected environment.
- [ ] Host and WSL paths translate safely and predictably.
- [ ] Workspace boundaries prevent accidental path escape where project-scoped behavior is required.
- [ ] Existing host-only behavior remains compatible for current users.
- [ ] Automated tests cover path translation, workspace resolution, execution routing, and failure cases.

### Out of Scope

- Remote SSH or container execution — this milestone targets local Host and WSL only.
- Multi-user or network-shared workspace synchronization — LM Studio plugin runs locally.
- Full sandboxing of arbitrary commands — execution remains subject to host permissions and explicit tool authority.
- Replacing LM Studio’s plugin runtime or SDK — enhancement stays within the current architecture.

## Constraints

- Preserve the current TypeScript/CommonJS build and LM Studio integration.
- Support Windows-specific WSL behavior without regressing Linux or macOS host execution.
- Avoid editing generated `dist/` directly; regenerate it from `src/`.
- Treat path conversion, shell quoting, symlinks, and process termination as security-sensitive.
- Keep configuration backward compatible where feasible.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use coarse roadmap granularity | The milestone has several tightly coupled infrastructure concerns that can be grouped into a few broad phases | — Pending |
| Enable parallel plan execution | Independent test, configuration, and documentation work can proceed concurrently | — Pending |
| Track planning documents in git | Preserve roadmap and requirement history with implementation | — Pending |
| Use milestone branching | Keep the complete Host/WSL workspace enhancement isolated as one milestone branch | — Pending |
| Use inherited model profile | Required for the active Codex runtime | — Pending |
| Use vertical MVP phase mode | Deliver end-to-end working increments rather than disconnected technical layers | — Pending |

## Success Definition

The milestone succeeds when a Windows user can select Host or a WSL distribution, start or resume a chat workspace, use file tools and `run_command` against the same workspace, and receive clear errors for unsupported or unsafe path/execution conditions. Existing host workflows continue to work, and automated tests cover the core routing and path invariants.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-13 after initialization*
