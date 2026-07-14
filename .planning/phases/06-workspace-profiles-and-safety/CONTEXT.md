# Phase 6 Context — Workspace Profiles and Safety

## Goal

Add durable workspace lifecycle management with explicit permission, destructive-action, repository-identity, and active-process safeguards.

## Decisions

- Workspace profiles use stable identifiers and preserve deletion and availability state.
- Outside-workspace access is granted per path and scope at invocation time.
- Destructive behavior requires explicit confirmation and affected-path visibility.
- Workspace switching or deletion is blocked while invocation ownership or termination state is unresolved.
- Repository identity checks are advisory but fail closed on mismatch and do not require Git.

## Requirements

PROF-01 through PROF-08; TEST-05.
