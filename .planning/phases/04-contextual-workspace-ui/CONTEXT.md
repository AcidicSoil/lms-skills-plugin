# Phase 4 Context — Contextual Workspace UI

## Goal

Make the active workspace and execution environment visible, understandable, and recoverable without weakening v1.0 containment guarantees.

## Decisions

- Workspace validity is explicit; invalid or unavailable paths never fall back to the home directory.
- Host-only and WSL-only settings are shown only in their relevant environment context.
- The system default WSL distribution is the default behavior; overrides are advanced and validated.
- Chat-scoped selection, persistent profiles, and global defaults remain distinct concepts.

## Requirements

UI-01 through UI-08.
