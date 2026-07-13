# Phase 3 Research: Compatibility, Hardening, and Release Readiness

## Research Role

Inline substitution for `gsd-phase-researcher`, using the resolved instructions from `.codex/agents/gsd-phase-researcher.toml`.

## Current State

- The repository has 16 passing automated tests and a strict TypeScript build.
- Phase 1 and Phase 2 verification reports already cover settings migration, WSL capability detection, path policy, execution adapters, workspace lifecycle, filesystem containment, and tool routing.
- README content predates the workspace model: it still describes unrestricted workspace file access, reports home/current-directory information, and omits Host/WSL configuration and troubleshooting.
- `dist/` is intentionally ignored, so release readiness must verify regeneration and source/build consistency without requiring tracked generated files.
- No real Windows/WSL smoke-test procedure is documented.

## Compatibility Test Gaps

### Host Regression

Add a focused compatibility suite proving:

- legacy/missing execution settings remain Host;
- tool names and key response fields remain stable;
- skill tools continue to operate without resolving a project workspace;
- Host file and command workflows remain functional through the shared workspace;
- missing/invalid cwd fails explicitly rather than falling back to home.

### Diagnostics

Add behavioral tests for:

- WSL unsupported on non-Windows hosts;
- `wsl.exe` unavailable;
- no installed distribution;
- selected distribution removed;
- inaccessible Host workspace root;
- inaccessible WSL home/root creation;
- timeout with incomplete/unknown process-tree termination;
- canonical path escape and existing-destination move failures.

The first four capability states already have partial unit coverage; Phase 3 should verify user-facing propagation through workspace/tool boundaries.

### Build/Artifact Consistency

Because `dist/` is ignored, add a release verification script that:

1. removes stale `dist/` and `.test-dist/`;
2. runs the full test suite;
3. runs `tsc`;
4. confirms expected entry artifacts exist (`dist/index.js`, declarations, and new module outputs);
5. runs `git diff --check` and verifies the working tree has no tracked source changes caused by the build.

Do not compare timestamps or require generated files to be committed.

## Documentation Requirements

README should include:

- Host vs WSL execution settings and defaults;
- optional distribution selection and failure behavior;
- deterministic workspace identity and locations;
- which tools are workspace-scoped and which remain skill-root scoped;
- relative/absolute path rules and containment/security boundary;
- WSL Linux-filesystem performance guidance;
- no silent fallback or path translation;
- troubleshooting table for unavailable WSL, missing distribution, inaccessible roots, path escape, command timeout, and coreutils assumptions;
- development/test/release verification commands.

Configuration field documentation should match `src/config.ts` and persisted settings semantics.

## Manual Release Checklist

Create a release checklist artifact with exact preconditions and expected outcomes for:

### Windows Host

- select Host;
- inspect workspace;
- create/write/patch/read/list/move/rename/delete;
- run `pwd`/`cd` equivalent and verify workspace cwd;
- restart/new chat behavior for deterministic identity;
- attempt escape and invalid cwd.

### WSL

- verify WSL and distribution availability;
- select WSL/distribution;
- inspect Linux-native workspace root;
- repeat file lifecycle;
- run `pwd`, Unicode/space/quote payloads, and timeout case;
- remove/misspell distribution and confirm actionable failure;
- confirm project files live in Linux filesystem rather than `/mnt/c`.

The checklist should capture OS version, LM Studio version, plugin version/commit, distribution, pass/fail, and notes.

## Recommended Plan Shape

1. Compatibility and diagnostic regression tests plus release verification script.
2. README/configuration/troubleshooting documentation.
3. Manual Windows/WSL release checklist and final release-readiness verification.

Plan 1 and Plan 2 can run in parallel because they touch different files. Plan 3 depends on both and performs the final integrated gate.

## Risks

- Manual Windows/WSL checks cannot be honestly marked passed in a non-Windows environment; the plan must create the checklist and require execution on suitable hardware before release.
- Overly rigid model-facing response assertions may block harmless additive metadata. Test required fields and tool names, not full object equality.
- Generated artifacts can become stale locally; the release script must clean before building.
