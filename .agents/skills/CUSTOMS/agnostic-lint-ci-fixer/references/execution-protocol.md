# Lint/CI Execution Protocol

## Evidence Checklist

| Evidence | Purpose |
|---|---|
| Failing command | Reproduce the same validation path |
| Exit code | Confirm true failure versus warning |
| Diagnostic code/message | Identify owning tool and rule |
| File/line paths | Bound the edit surface |
| CI workflow step | Detect environment or working-directory mismatch |
| Tool versions | Compare local and CI behavior |

## Failure Classification

| Class | Common examples | Preferred fix |
|---|---|---|
| Formatting | Prettier, Black, gofmt, rustfmt | Run formatter, commit diff |
| Import/order | isort, Ruff I001, ESLint sort-imports | Run configured fixer or reorder imports |
| Static lint | ESLint, Ruff, Clippy, ShellCheck | Refactor source, avoid blanket ignores |
| Typecheck | mypy, pyright, tsc, cargo check | Fix annotations/contracts or narrow types |
| Tests | pytest, jest, cargo test, go test | Reproduce, isolate, patch behavior or test expectation |
| CI environment | missing cache, wrong cwd, version mismatch | Align CI with repo-native commands |

## Repair Order

1. Reproduce the failure with the exact command if possible.
2. Inspect config before editing: linter, formatter, typechecker, CI workflow, and repo instructions.
3. Run safe auto-fix only for deterministic tools.
4. Inspect the diff for unrelated changes.
5. Patch remaining diagnostics manually and narrowly.
6. Re-run the failing command.
7. Run the smallest broader validation gate.
8. Stop if verification still fails after one focused repair pass; report evidence.

## Suppression Policy

Use suppressions only when all are true:

- The diagnostic is a known false positive or intentionally accepted exception.
- The suppression is local to the smallest possible line/file/rule.
- A comment explains why the suppression is necessary.
- CI remains at least as strict as before.

Avoid:

- disabling entire lint plugins,
- excluding active source files,
- changing CI to auto-fix without committing source changes,
- replacing deterministic validation with weaker checks.

## Closeout Format

```markdown
## Summary
- Root cause:
- Fix:
- Files changed:

## Verification
- `<command>` → passed/failed, observed result

## Residual Risk
- Unknowns:
- Skipped checks:
```
