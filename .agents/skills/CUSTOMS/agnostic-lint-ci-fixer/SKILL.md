---
name: agnostic-lint-ci-fixer
description: "Diagnose and resolve lint, formatting, typecheck, and CI validation failures across repositories. WHEN: \"lint failed\", \"CI failed\", \"pre-push failed\", \"format check failed\", \"typecheck failed\", \"fix pipeline failure\"."
---

# Agnostic Lint/CI Fixer

Use this skill when a repo fails lint, formatting, typecheck, test, pre-push, or CI validation and the fix should preserve existing behavior.

## Workflow

1. **Capture evidence** — Identify the exact failing command, exit code, file paths, diagnostics, and CI/local environment.
2. **Inspect project config** — Read repo instructions, manifests, lockfiles, formatter/linter/typecheck configs, scripts, and CI workflow files.
3. **Classify failure** — Separate mechanical formatting/import fixes from semantic lint, type, test, or environment failures.
4. **Select the narrowest repair** — Prefer source-level fixes over suppressions, ignores, excludes, or CI weakening.
5. **Apply deterministic tooling first** — Run official fix commands only when configured and safe; inspect diffs before broader edits.
6. **Verify locally** — Re-run the exact failing command, then the nearest repo-native validation gate.
7. **Report evidence** — Return changed files, commands run, observed results, skipped checks, and residual risks.

## Rules

- Do not weaken CI to make failures disappear.
- Do not add broad ignores, excludes, or blanket suppressions unless narrowly justified.
- Preserve public behavior, APIs, CLI output, and generated artifact semantics unless the failing diagnostic requires a change.
- Use project-native commands from CI, Makefile, package scripts, tox/nox, justfile, or manifests.
- Keep the diff limited to the failing scope.

For detailed execution steps, use [Execution Protocol](references/execution-protocol.md).
For kickoff prompts, use [Lint/CI Kickoff Template](templates/lint-ci-kickoff.md).
