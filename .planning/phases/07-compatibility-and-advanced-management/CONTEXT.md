# Phase 7 Context — Compatibility and Advanced Management

## Goal

Preserve compatibility while adding migration, bounded approval-history controls, and restoration behavior that depends only on stable host capabilities.

## Decisions

- Existing settings are migrated without silently discarding recoverable data.
- WSL-specific state remains safe on non-Windows hosts and across downgrade scenarios.
- Approval history excludes outputs, file contents, and full command strings.
- Workspace persistence does not depend on host session APIs.
- Resume behavior is exposed only when stable supported APIs exist; transcripts are never duplicated as a workaround.

## Requirements

COMP-01 through COMP-06; TEST-02, TEST-07.
