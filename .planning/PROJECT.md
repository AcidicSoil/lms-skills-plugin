# LMS Skills Plugin

## What This Is

A strict TypeScript LM Studio plugin that discovers and injects reusable skills, provides skill-library tools, exposes contained project filesystem tools, and executes commands in deterministic project workspaces on either the Host or Windows Subsystem for Linux.

## Core Value

Users can safely run skill-driven file and shell workflows in a predictable project workspace with consistent path, shell, and skill behavior across Windows Host and WSL.

## Current State

**Shipped version:** v1.0 — Host/WSL Execution and Project Workspaces
**Shipped:** 2026-07-13
**Status:** Release-ready and archived

The plugin now provides:

- Backward-compatible Host execution and selectable WSL execution.
- Deterministic contained project workspaces.
- Environment-aligned project tools, skill tools, prompt injection, and explicit skill activation.
- WSL-native Bash execution.
- Windows Host Command Prompt, PowerShell, Git Bash, and custom shell support.
- Persistent contained `change_directory` for command cwd.
- Actionable WSL, path, timeout, and workspace diagnostics.
- Cross-platform tests, builds, release verification, and complete user documentation.

Verification at shipment:

- 29 automated tests passed.
- Strict TypeScript build passed.
- Clean release artifact verification passed.
- Real Windows Host workflow passed.
- Real Ubuntu WSL workflow passed.
- Environment-aware skill workflow passed.

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
- Treat path conversion, canonical containment, shell selection, and process termination as security-sensitive.
- Do not silently fall back between Host and WSL.
- Keep skill roots and project workspaces as separate trust boundaries.

## Next Milestone Goals

Not yet defined. Candidate deferred areas include:

- Custom workspace-root templates.
- Historical workspace browsing and resume UI.
- Optional Host/WSL file mirroring.
- Skill-declared workspace bootstrap templates.
- Additional execution backends such as SSH or containers.

Run `$gsd-new-milestone` to define the next goal, fresh requirements, and a roadmap beginning with Phase 4.

## Milestone History

- [v1.0 — Host/WSL Execution and Project Workspaces](milestones/v1.0-ROADMAP.md)
