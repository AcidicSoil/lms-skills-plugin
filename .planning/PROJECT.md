# LMS Skills Plugin

## What This Is

A strict TypeScript LM Studio plugin that discovers and injects reusable skills, provides skill-library tools, exposes contained project filesystem tools, and executes commands in deterministic project workspaces on either the Host or Windows Subsystem for Linux.

## Core Value

Users can safely run skill-driven file and shell workflows in a predictable project workspace with consistent path, shell, skill, trust, and recovery behavior across Windows Host and WSL.

## Current State

**Shipped version:** v1.1 — Additional Polish
**Status:** Complete, audited, and release-verified
**Shipped:** 2026-07-14

v1.1 adds contextual workspace selection, unified backend validation, durable trusted profiles, scalable workspace picking, safe per-chat switching, invocation and approval guards, settings migration, and compatibility management.

## Next Milestone Goals

Not yet defined. The next milestone should begin with `$gsd-new-milestone` to establish fresh requirements and a new roadmap.

## Architecture Snapshot

- `src/index.ts`: plugin lifecycle and setup.
- `src/settings.ts` / `src/settingsMigration.ts`: persisted configuration, migration, and platform safety.
- `src/executor.ts` / `src/backend.ts`: Host/WSL execution and unified workspace backend.
- `src/workspace.ts` / `src/workspaceCatalog.ts`: deterministic workspace identity, profiles, search, lifecycle, and switching.
- `src/workspaceFs.ts`: contained Host/WSL project filesystem operations.
- `src/invocationRegistry.ts`: active invocation and unresolved termination ownership.
- `src/approvalHistory.ts`: bounded redacted workspace approval history.
- `src/toolsProvider.ts`: public LM Studio tool surface and per-chat workspace orchestration.

## Constraints

- Preserve strict TypeScript/CommonJS and LM Studio SDK integration.
- Do not edit generated `dist/` directly.
- Treat path conversion, canonical containment, shell selection, approvals, trust, and process termination as security-sensitive.
- Do not silently fall back between Host and WSL or from an invalid workspace to the home directory.
- Keep skill roots and project workspaces as separate trust boundaries.
- Preserve backward compatibility and safe non-Windows behavior.

## Milestone History

- [v1.0 — Host/WSL Execution and Project Workspaces](milestones/v1.0-ROADMAP.md)
- [v1.1 — Additional Polish](milestones/v1.1-ROADMAP.md)

<details>
<summary>Pre-v1.1 project definition</summary>

# LMS Skills Plugin

## What This Is

A strict TypeScript LM Studio plugin that discovers and injects reusable skills, provides skill-library tools, exposes contained project filesystem tools, and executes commands in deterministic project workspaces on either the Host or Windows Subsystem for Linux.

## Core Value

Users can safely run skill-driven file and shell workflows in a predictable project workspace with consistent path, shell, and skill behavior across Windows Host and WSL.

## Current State

**Shipped version:** v1.0 — Host/WSL Execution and Project Workspaces
**Active milestone:** v1.1 — Additional Polish
**Status:** Planned from `todo-ui-config.md`

The v1.0 execution and workspace foundation remains complete and archived. v1.1 focuses on making that foundation visible, configurable, safer, and easier to validate through the plugin UI and end-to-end behavior.

## v1.1 Milestone Goals

- Add a contextual workspace selector with clear validity and availability states.
- Make settings visibly environment-aware across Host and WSL.
- Default WSL execution to the system default distribution while retaining an advanced validated override.
- Clarify chat-scoped selection, persistent profiles, and global defaults.
- Guarantee consistent backend routing and shell semantics across tools.
- Add durable workspace profile, lifecycle, approval, process-safety, and migration behavior.
- Expand integration coverage around UI state, validation, routing, compatibility, and recovery.

## Non-Goals

- Reimplementing completed v1.0 Host/WSL execution or workspace containment.
- Adding new execution backends such as SSH or containers.
- Host/WSL file mirroring.
- Transcript duplication or unsupported session-resume emulation.

## Architecture Snapshot

- `src/index.ts`: plugin lifecycle and setup.
- `src/settings.ts` / `src/config.ts`: persisted and effective configuration.
- `src/executor.ts`: Host/WSL shell execution.
- `src/workspace.ts`: deterministic workspace identity and lifecycle.
- `src/workspaceFs.ts`: contained Host/WSL project filesystem operations.
- `src/skillStore.ts`: environment-aware skill discovery, reading, search, and listing.
- `src/toolsProvider.ts`: public LM Studio tool surface and persistent command cwd.
- `src/preprocessor.ts`: skill injection and explicit activation.

## Constraints

- Preserve strict TypeScript/CommonJS and LM Studio SDK integration.
- Do not edit generated `dist/` directly.
- Treat path conversion, canonical containment, shell selection, approvals, and process termination as security-sensitive.
- Do not silently fall back between Host and WSL or from an invalid workspace to the home directory.
- Keep skill roots and project workspaces as separate trust boundaries.
- Preserve backward compatibility with v1.0 settings and non-Windows behavior.

## Milestone History

- [v1.0 — Host/WSL Execution and Project Workspaces](milestones/v1.0-ROADMAP.md)
- v1.1 — Additional Polish (active)


</details>
