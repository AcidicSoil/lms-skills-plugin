---
phase: 03
phase_name: "compatibility-hardening-and-release-readiness"
project: "LMS Skills Plugin"
generated: "2026-07-14"
counts:
  decisions: 5
  lessons: 4
  patterns: 4
  surprises: 3
missing_artifacts:
  - "03-UAT.md"
---

# Phase 03 Learnings: Compatibility, Hardening, and Release Readiness

## Decisions

### Protect the public tool contract explicitly
A stable exported tool-name manifest and compatibility tests protect existing model-facing names and required response fields without asserting fragile whole-object equality.

**Rationale:** Release hardening must catch breaking changes while still allowing additive metadata.
**Source:** 03-01-PLAN.md

---

### Treat diagnostics as end-to-end behavior
Capability and workspace failures are verified through tool and workspace boundaries, not only through helper-unit tests.

**Rationale:** Users need actionable errors at the surface where failures occur, including the failing capability, path, or action.
**Source:** 03-01-PLAN.md

---

### Verify generated artifacts without tracking them
`npm run verify:release` cleans generated directories, runs tests and build, checks required outputs, validates whitespace, and rejects tracked drift.

**Rationale:** `dist/` is intentionally ignored, so release confidence must come from reproducible regeneration rather than committed output.
**Source:** 03-01-SUMMARY.md

---

### Make environment selection global across the tool surface
Host or WSL selection governs project tools, skill discovery and reads, prompt injection, explicit skill activation, command execution, and diagnostics.

**Rationale:** Mixed Host/WSL ownership produced illogical paths and behavior; one environment must own every environment-sensitive operation.
**Source:** 03-03-SUMMARY.md

---

### Separate command-directory state from file-tool root semantics
`change_directory` persists the default cwd for later commands while project file tools remain workspace-root scoped.

**Rationale:** Users need shell-like cwd behavior without making file-tool paths depend on hidden mutable state.
**Source:** 03-VERIFICATION.md

---

## Lessons

### Tilde expansion is environment-dependent
Expanding `~` with the Host Node process is incorrect when WSL is selected; the selected distribution's `$HOME` must resolve Linux skill roots.

**Context:** Environment-aware skill stores were added after real validation exposed Host path leakage in WSL mode.
**Source:** 03-03-SUMMARY.md

---

### A passing tool call is not sufficient validation
Skill-boundary validation requires discovering a real child skill, reading its entry file, and listing its files; an empty successful response does not prove correct discovery.

**Context:** Real Ubuntu WSL validation ultimately discovered 46 skills and read/listed the `docx` skill successfully.
**Source:** 03-RELEASE-RESULTS.md

---

### Environment and shell are related but distinct
WSL must use Bash inside the distribution, while Windows Host can use Command Prompt, PowerShell, Git Bash, or an explicit Host shell.

**Context:** Final hardening separated WSL `/bin/bash -lc` from Windows shell selection and overrides.
**Source:** 03-VERIFICATION.md

---

### Real hardware validation catches semantic gaps that mocks miss
Automated tests covered execution and path mechanics, but real Windows Host and Ubuntu WSL workflows exposed environment ownership and skill-discovery issues.

**Context:** The release checkpoint remained blocking until both real workflows and the skill boundary passed.
**Source:** 03-03-PLAN.md

---

## Patterns

### Clean release gate pattern
Delete generated outputs, run the full suite, compile, assert required artifacts, run `git diff --check`, and reject tracked drift.

**When to use:** Use when build products are ignored but a release must prove reproducibility and source/build consistency.
**Source:** 03-01-PLAN.md

---

### Public-surface alignment regression
Exercise every public tool under one selected environment and assert that paths, roots, distributions, and execution backends remain coherent.

**When to use:** Use for plugins with multiple tool families that share configuration but use different implementation backends.
**Source:** 03-VERIFICATION.md

---

### Fail-closed manual release checkpoint
Record manual states as pass, fail, or blocked and refuse a release-ready verdict while required real-hardware evidence is unavailable.

**When to use:** Use when platform integration cannot be honestly proven through mocks or CI alone.
**Source:** 03-03-PLAN.md

---

### Documentation as an executable contract
Keep settings, tool descriptions, workspace locations, limitations, diagnostics, and release commands grounded in the current implementation and checklist.

**When to use:** Use for cross-platform features where path and shell assumptions materially affect safety and user expectations.
**Source:** 03-02-PLAN.md

---

## Surprises

### Skill roots were initially aligned by policy but not by environment
The original separation between skill roots and project workspaces did not define whether Host or WSL owned the skill filesystem.

**Impact:** Follow-up hardening added `src/skillStore.ts` and rewired tools and preprocessing to the selected environment.
**Source:** 03-03-SUMMARY.md

---

### Release validation expanded the delivered scope
The final implementation added environment-aware skill stores, WSL Bash separation, full public-tool alignment coverage, and persistent `change_directory` beyond the original two Phase 3 requirements.

**Impact:** The release suite grew from 22 to 29 tests and the final verification covered a broader integrated product contract.
**Source:** 03-03-SUMMARY.md

---

### Manual reports can mislabel checks
One submitted WSL run was presented as a Host checklist, and a successful containment rejection was initially marked blocked.

**Impact:** Evidence had to be interpreted against actual tool output and environment metadata rather than copied verdict labels.
**Source:** 03-RELEASE-RESULTS.md
