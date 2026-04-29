# Execution Protocol

Use this protocol when continuing repo work from prior handoff context.

## Evidence Sources

| Source | Purpose |
|---|---|
| Repo-local instructions | Operating constraints and verification commands |
| Handoff or memory files | Current state, completed work, next slice |
| TODO/FIXME/roadmap docs | Evidence-backed backlog items |
| Test logs and CI config | Failing checks and repo-native gates |
| Manifests and scripts | Stack detection and command selection |

## Slice Rules

A valid slice is:

- independently bounded
- reversible
- backed by repo evidence
- small enough to verify directly
- free of unresolved public API/product decisions

Prefer this priority order:

1. Restore or establish passing verification.
2. Resolve current failing tests/build/lint.
3. Implement the explicit user task.
4. Complete documented TODOs with clear acceptance criteria.
5. Add missing tests for existing behavior.
6. Make the smallest reversible refactor toward documented goals.

## Verification Pattern

1. Run the smallest relevant test or smoke check.
2. Run lint/type/policy checks for touched files when available.
3. Run the repo-native full suite before claiming repo-wide green.
4. Report exact commands and observed results.

Do not claim success from stale logs or assumed outcomes.

## Stop Conditions

Stop when:

- no concrete task can be derived
- action would be destructive or irreversible
- repo/tool access is missing
- verification fails after one focused repair
- secrets or credentials are required
- a public product/API decision is unresolved
- meaningful verification cannot be run or substituted
- task budget is exhausted

## Handoff Requirements

Include:

- changed files
- commands run
- pass/fail outcomes
- skipped checks
- residual risks
- remaining Unknowns
- next recommended bounded slice
