# Cross-File Dependency Context

Build an import/export dependency graph during Wave 0 triage. The graph informs
blast radius calculations, cross-file impact analysis, and risk stratification.

## Contents

- [When to Build](#when-to-build)
- [Construction Commands](#construction-commands)
- [Graph Structure](#graph-structure)
- [Integration with Risk Stratification](#integration-with-risk-stratification)
- [Integration with Judge Protocol](#integration-with-judge-protocol)

## When to Build

Build the dependency graph during Wave 0 triage when:

- Full codebase audit (Mode 2) — always build
- Session review (Mode 1) with 6+ files — always build
- Session review with 3-5 files — build if any file is HIGH risk
- Session review with 1-2 files — skip (blast radius estimated from file location)

The graph is built by `scripts/project-scanner.py` (the `_build_dependency_graph()` function)
and included in the project profile JSON.

## Construction Commands

If the scanner is unavailable, extract imports manually by language:

**Python:**
```bash
grep -rn "^from\|^import" --include="*.py" [path] | \
  sed 's/:.*//' | sort -u  # files with imports
grep -rn "^from \(\S\+\) import\|^import \(\S\+\)" --include="*.py" [path]  # import targets
```

**TypeScript / JavaScript:**
```bash
grep -rn "^import\|require(" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" [path]
```

**Go:**
```bash
grep -rn "^import" --include="*.go" [path]
```

**Rust:**
```bash
grep -rn "^use \|^mod " --include="*.rs" [path]
```

For each import, resolve to a project-local file path. Discard external dependencies
(they are covered by supply chain security checks).

## Graph Structure

The dependency graph is a map of file → {imports, imported_by}:

```json
{
  "src/auth/login.py": {
    "imports": ["src/auth/tokens.py", "src/db/users.py"],
    "imported_by": ["src/api/routes.py", "src/api/middleware.py", "src/cli/auth.py"]
  },
  "src/auth/tokens.py": {
    "imports": ["src/config.py"],
    "imported_by": ["src/auth/login.py", "src/auth/refresh.py", "src/api/middleware.py",
                     "src/api/routes.py", "src/workers/cleanup.py"]
  }
}
```

**High fan-in files** are those imported by 5+ other files. These are structural
dependencies — changes to them have high blast radius.

## Integration with Risk Stratification

During Wave 0 risk stratification (references/triage-protocol.md):

- Files with **fan-in >= 5** (imported by 5+ files): +2 risk points → elevates to HIGH or MEDIUM
- Files with **fan-in >= 10**: automatic HIGH risk regardless of other factors
- Changed files whose **importers are not also in the change set**: flag for cross-file impact review

Add to the triage output template:

```
DEPENDENCY GRAPH:
  Total cross-file dependencies: [N]
  High fan-in files (5+ importers):
    [path] — imported by [N] files: [list top 5]
  Changed files with external importers:
    [path] — [N] importers not in change set
```

## Integration with Judge Protocol

During Judge reconciliation (references/judge-protocol.md, Step 8 — Final Ranking):

Use the dependency graph to compute blast radius more accurately:

| Fan-in | Blast Radius | Multiplier |
|--------|-------------|------------|
| 0-1 | Single file | 1 |
| 2-4 | Module | 2 |
| 5-9 | Cross-module | 3 |
| 10+ | System-wide | 5 |

This replaces the manual blast radius estimation with data-driven computation.

## Limitations

- Import extraction is regex-based and may miss dynamic imports (`importlib`, `require.resolve`)
- Re-exports and barrel files may inflate fan-in counts
- The graph only covers project-local dependencies, not external packages
- For monorepos, scope the graph per workspace package (references/triage-protocol.md § Monorepo)

Cross-references: scripts/project-scanner.py, references/triage-protocol.md, references/judge-protocol.md.
