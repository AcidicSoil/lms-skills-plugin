---
phase: 02
phase_name: "per-chat-workspace-and-tool-integration"
project: "LMS Skills Plugin"
generated: "2026-07-14"
counts:
  decisions: 4
  lessons: 4
  patterns: 4
  surprises: 2
missing_artifacts:
  - "02-UAT.md"
---

# Phase 02 Learnings: Per-Chat Workspace and Tool Integration

## Decisions

### Derive workspace identity from provider identity and environment
Workspace IDs use a stable SHA-256 hash over the normalized LM Studio provider working directory, execution environment, and WSL distribution.

**Rationale:** The same project/environment must resolve predictably, while Host, WSL, and different distributions must never collide.
**Source:** 02-01-SUMMARY.md

---

### Use plugin-owned native workspace roots
Host workspaces live under plugin data, while WSL workspaces live in the selected distribution's Linux filesystem rather than UNC or `/mnt/c`.

**Rationale:** Native roots provide predictable semantics, avoid cross-filesystem performance problems, and simplify containment.
**Source:** 02-01-PLAN.md

---

### Route every project file operation through one filesystem abstraction
Read, write, patch, append, mkdir, list, delete, move, and rename share a typed `WorkspaceFileSystem` contract for Host and WSL.

**Rationale:** A single service centralizes containment and prevents individual tools from reimplementing unsafe path logic.
**Source:** 02-02-SUMMARY.md

---

### Separate project workspace tools from skill-library roots
Project file and command tools share the deterministic workspace; skill-library operations remain under configured skill roots.

**Rationale:** The two sets of tools have different trust boundaries and should not be conflated by workspace routing.
**Source:** 02-03-PLAN.md

---

## Lessons

### Tool-call IDs are not stable project identities
The installed SDK's `getWorkingDirectory()` is the appropriate stable seam; per-call IDs must not influence workspace selection.

**Context:** Workspace inspection and repeated-call tests verify that one provider instance reuses the same deterministic context.
**Source:** 02-01-PLAN.md

---

### WSL file content must travel outside shell interpolation
Structured program/argv execution with stdin payloads is necessary for spaces, quotes, Unicode, metacharacters, and multiline content.

**Context:** WSL write and patch operations were tested against exact argv and stdin boundaries.
**Source:** 02-02-SUMMARY.md

---

### Capability validation must precede mutation
A removed or unavailable WSL distribution is detected before any workspace directory is created.

**Context:** Workspace lifecycle tests explicitly verify failure-before-mutation behavior.
**Source:** 02-VERIFICATION.md

---

### Move semantics require explicit collision checks
A backend command can otherwise report misleading success or overwrite behavior that differs by environment.

**Context:** WSL move was hardened to refuse an existing destination and retain both source and destination content.
**Source:** 02-VERIFICATION.md

---

## Patterns

### Lazy shared context per provider
Resolve and cache one workspace promise and one filesystem service inside the tools provider.

**When to use:** Use when several tools must share identical environment, root, and lifecycle state without repeated mutation.
**Source:** 02-03-SUMMARY.md

---

### Native-path backend abstraction
Expose one operation contract while allowing Host Node filesystem calls and WSL direct-process calls behind it.

**When to use:** Use when equivalent tool semantics must span filesystems that cannot safely share one path API.
**Source:** 02-02-PLAN.md

---

### Canonical containment before every operation
Resolve relative or absolute input, canonicalize it in the selected environment, and verify containment before reading or mutating.

**When to use:** Use for all workspace-scoped file and cwd operations, including apparently harmless reads and listings.
**Source:** 02-VERIFICATION.md

---

### TDD with injected platform boundaries
Commit failing behavior tests first, then implement through injected capability, executor, and filesystem seams.

**When to use:** Use for cross-platform logic where live external runtimes are unavailable or nondeterministic in CI.
**Source:** 02-VERIFICATION.md

---

## Surprises

### WSL root creation initially lagged behind file-operation safety
The first workspace lifecycle implementation temporarily used the Phase 1 shell executor for generated quoted paths, while later file operations used structured direct execution.

**Impact:** The implementation sequence needed an explicit follow-up plan to eliminate shell-oriented file operations.
**Source:** 02-01-SUMMARY.md

---

### Standard WSL tooling introduced a runtime assumption
Recursive WSL listing relies on GNU/coreutils `find -printf`.

**Impact:** This assumption needed to be documented and included in release troubleshooting rather than treated as universally portable Linux behavior.
**Source:** 02-02-SUMMARY.md
