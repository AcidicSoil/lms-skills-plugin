---
phase: 01
phase_name: "execution-and-path-foundation"
project: "LMS Skills Plugin"
generated: "2026-07-14"
counts:
  decisions: 4
  lessons: 3
  patterns: 4
  surprises: 2
missing_artifacts:
  - "01-UAT.md"
---

# Phase 01 Learnings: Execution and Path Foundation

## Decisions

### Preserve Host as the compatibility default
Missing or legacy execution settings normalize to Host mode so existing users do not need a migration step.

**Rationale:** The Host path was the established behavior, and introducing WSL should be additive rather than a breaking default change.
**Source:** 01-01-PLAN.md

---

### Model WSL readiness as typed capability states
WSL detection distinguishes unsupported platform, unavailable WSL, no installed distribution, unavailable selected distribution, and ready states.

**Rationale:** Typed states make failures actionable and prevent ambiguous fallbacks or mutation before capability is proven.
**Source:** 01-01-SUMMARY.md

---

### Reject wrong-environment paths instead of translating them
Windows, Linux, WSL UNC, relative, and invalid paths are classified explicitly; wrong-environment absolute paths fail closed.

**Rationale:** Implicit Windows-to-`/mnt` or Linux-to-Windows translation would make containment and execution behavior unpredictable.
**Source:** 01-02-PLAN.md

---

### Keep shell strings intact while structuring the outer process boundary
`run_command` remains a raw shell-string API, while WSL is launched as `wsl.exe` plus explicit arguments, distribution, cwd, and shell.

**Rationale:** This preserves model-facing compatibility while making the Host/WSL process boundary testable and argument-safe.
**Source:** 01-03-PLAN.md

---

## Lessons

### Containment requires canonical paths and separator boundaries
A lexical prefix check is insufficient because sibling prefixes, traversal, symlinks, and Windows junctions can escape a nominal root.

**Context:** Adversarial path tests were required for `root-evil`, `..`, and simulated canonical link escapes.
**Source:** 01-02-SUMMARY.md

---

### Invalid cwd fallback is a security and predictability bug
Missing or invalid command directories must fail explicitly rather than silently using the user's home directory.

**Context:** The executor and tool description were changed together so implementation and user expectations remain aligned.
**Source:** 01-03-SUMMARY.md

---

### Platform-specific behavior can be tested without platform-specific hardware
Injectable process runners and canonicalizers allowed WSL capability, argv, path, and containment behavior to be covered on non-Windows CI.

**Context:** Phase 1 verification passed without requiring a live WSL installation.
**Source:** 01-VERIFICATION.md

---

## Patterns

### Discriminated capability result pattern
Represent external capability checks as a closed union of actionable states rather than booleans or thrown strings.

**When to use:** Use for optional runtimes, external executables, distributions, credentials, or environment readiness checks.
**Source:** 01-01-PLAN.md

---

### Pure policy plus injected effects
Keep classification and validation pure, and inject filesystem canonicalization or process execution at the boundary.

**When to use:** Use for security-sensitive path and process logic that must be deterministic and portable in tests.
**Source:** 01-02-PLAN.md

---

### Structured outer argv, unchanged inner shell command
Build the launcher as program plus arguments while preserving the user/model shell command as one argument to the selected shell.

**When to use:** Use when maintaining a shell-string contract while preventing interpolation into the host launcher command.
**Source:** 01-03-PLAN.md

---

### Shared timeout and output policy across adapters
Host and WSL execution use the same limits and expose explicit timeout plus termination uncertainty.

**When to use:** Use whenever multiple execution backends must provide consistent operational semantics.
**Source:** 01-03-SUMMARY.md

---

## Surprises

### Generated distribution output was intentionally untracked
The plans expected regenerated `dist/` artifacts, but repository policy ignored them, so builds were verified locally rather than committed.

**Impact:** Release checks needed to validate generated output without relying on tracked build artifacts.
**Source:** 01-01-SUMMARY.md

---

### Process-tree termination cannot always be claimed as complete
A timeout does not guarantee every descendant process was terminated, especially across platform boundaries.

**Impact:** Results gained a `terminationIncomplete` diagnostic instead of overstating cleanup success.
**Source:** 01-03-SUMMARY.md
