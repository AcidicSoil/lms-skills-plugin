# Phase 3 Context: Compatibility, Hardening, and Release Readiness

## Approved User Story

As an existing LMS Skills Plugin user, I want Host and WSL workspace behavior to be thoroughly tested, clearly documented, and safely diagnosed, so that I can adopt the release without breaking my current workflows.

## Locked Decisions

- Preserve existing Host behavior and model-facing tool names.
- Treat the current automated suite as the compatibility baseline and expand it rather than replacing it.
- Add negative tests for unsupported WSL, removed distributions, inaccessible roots, timeout termination uncertainty, workspace escape, and destination collisions.
- Keep generated `dist/` ignored; release verification must rebuild it and compare generated output against source/build expectations rather than committing it.
- Document WSL as Windows-only and explicitly state that no automatic installation, distribution switching, Host↔WSL fallback, or cross-filesystem mirroring occurs.
- Document Host and WSL workspace locations, performance implications, security boundaries, and troubleshooting.
- Provide a reproducible manual release checklist for one Windows Host workflow and one real WSL workflow.
- Update stale README tool descriptions so they reflect deterministic workspaces rather than unrestricted filesystem access or home-directory defaults.

## Scope Fences

- No new execution backend or workspace feature.
- No UI redesign.
- No automatic WSL installation or administrative changes.
- No custom workspace-root settings.
- No Host↔WSL synchronization.
- No requirement to commit ignored `dist/` artifacts.

## Existing Evidence

- Phase 1 verification: 13 requirements passed.
- Phase 2 verification: 9 requirements and 5 roadmap truths passed.
- Current automated suite: 16 tests passing.
- Strict TypeScript build passes.
- `dist/` is ignored by repository policy.

## Phase Outcome

A release-ready milestone with complete compatibility/diagnostic tests, accurate user and configuration documentation, a deterministic build verification command, and a concrete Windows Host/WSL manual release checklist.
