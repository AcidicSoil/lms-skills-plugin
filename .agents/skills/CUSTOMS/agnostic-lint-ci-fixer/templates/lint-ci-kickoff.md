# Lint/CI Failure Kickoff Prompt

We need to fix lint/CI failures without weakening validation or suppressing rules unnecessarily.

## Evidence

Failing command:

```bash
<command>
```

Observed diagnostics:

```text
<paste exact error output>
```

Known affected files:

```text
<file list>
```

## Constraints

- Preserve existing behavior and public APIs.
- Keep the diff limited to the failing scope.
- Prefer source fixes over ignores, excludes, or CI weakening.
- Use repo-native commands and locked toolchains where available.
- Do not claim success without fresh verification output.

## Required Workflow

1. Inspect repo instructions, manifests, lint/format/typecheck configs, and CI workflow files.
2. Reproduce or explain why reproduction is unavailable.
3. Classify each failure as formatting, import/order, static lint, typecheck, test, or CI environment.
4. Apply the smallest deterministic fix.
5. Inspect the diff.
6. Re-run the exact failing command.
7. Run the nearest broader validation gate.
8. Report commands, results, changed files, skipped checks, and residual risks.

## Acceptance Criteria

- The original failing command passes.
- Broader repo-native validation passes or skipped checks are explicitly justified.
- No broad lint suppressions, ignores, excludes, or weakened CI rules are introduced.
- The final diff is limited to necessary code/config/test changes.
```
