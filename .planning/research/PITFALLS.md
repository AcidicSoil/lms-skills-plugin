# Pitfalls Research

## Shell Quoting and Injection

**Warning signs:** commands are assembled into one string containing distribution names, paths, or user input.

**Prevention:** use argument arrays; centralize unavoidable shell quoting; test spaces, quotes, metacharacters, and Unicode.

**Phase:** execution foundation.

## Cross-Filesystem Performance

**Warning signs:** WSL-mode projects are created under `/mnt/c` by default or Windows repeatedly traverses Linux files through UNC paths.

**Prevention:** default WSL projects to the Linux filesystem and make cross-filesystem placement explicit.

**Phase:** workspace lifecycle.

## Path Escape and Symlink Confusion

**Warning signs:** containment relies only on string prefix checks or checks happen before canonicalization.

**Prevention:** classify, normalize, canonicalize where possible, compare with platform-aware semantics, and test symlinks/junctions.

**Phase:** execution foundation and tool migration.

## Distribution Lifecycle Drift

**Warning signs:** persisted distribution names are trusted forever.

**Prevention:** validate before use, return actionable remediation, and allow fallback to Host without silently changing persisted intent.

**Phase:** settings and detection.

## Inconsistent Tool Roots

**Warning signs:** `run_command` uses one directory while file tools resolve relative paths elsewhere.

**Prevention:** derive one immutable workspace context per invocation and route all project-scoped tools through it.

**Phase:** workspace/tool integration.

## Process-Tree Leaks

**Warning signs:** timeout kills only `wsl.exe` or the immediate shell while descendants continue.

**Prevention:** test process trees, use platform-appropriate termination, and report partial termination clearly.

**Phase:** execution foundation.

## Watchers Across Boundaries

**Warning signs:** recursive watches are assumed reliable across Windows, WSL UNC, and Linux filesystems.

**Prevention:** avoid watcher dependence for workspace correctness; use explicit invalidation and conservative fallbacks.

**Phase:** integration hardening.

## Backward-Compatibility Regression

**Warning signs:** existing users must configure a workspace or mode before old tools work.

**Prevention:** default legacy configuration to Host mode and add characterization tests before refactoring.

**Phase:** first and final phases.
