---
name: gsd-browser-evidence-verification
description: "Use when verifying browser-facing GSD work, writing browser evidence, or deciding whether UI/frontend/browser-flow work can be reported complete."
---

# GSD Browser Evidence Verification

Use this skill when verifying browser-facing GSD work or writing completion evidence for frontend tasks.

## Activation scope

Activate this skill when a browser-facing change needs completion evidence, when a summary mentions browser verification, or when GSD Browser is unavailable and verification status must be reported honestly.

## Concern boundary

This skill defines evidence requirements and verification reporting. Use `skills/gsd-browser-automation/SKILL.md` for driving the browser, and `skills/opengsd-docs-lookup/SKILL.md` for OpenGSD, GSD Core, or GSD Browser docs lookup.

## Cross-skill routing

- Use this skill to report evidence and completion status.
- Use `skills/gsd-browser-automation/SKILL.md` to drive the browser and capture artifacts.
- Use `skills/gsd-frontend-skill-routing/SKILL.md` to include frontend/UI skill records for browser-facing frontend work.
- Use `skills/gsd-frontend-skill-routing/references/planning-execution-integration.md` for the combined frontend skill routing record and browser evidence record.
- Use `skills/opengsd-docs-lookup/SKILL.md` to retrieve OpenGSD or GSD Browser reference details.

## Completion rule

Browser-facing work is not complete until the changed route or flow is exercised in GSD Browser and the intended result is observed.

Every browser-facing verification requires a screenshot. The screenshot proves what the browser showed after the work was exercised.

If a screenshot alone does not prove the result, add the artifact that fits the work: trace, debug bundle, logs, test output, server response evidence, or action/result notes.

For design/frontend work, inspect the created design itself. Do not report the work complete when the browser output looks wrong, incomplete, or like uninspected AI-generated UI.

## Artifact taxonomy

Lightweight screenshots may be committed as browser review or verification evidence when they help prove the result.

Heavy browser artifacts are local-only by default. Keep traces, HAR files, recordings, debug bundles, temporary logs, caches, generated dumps, and similar browser output out of normal commits unless a specific plan asks for one of those artifacts.

Use repo-relative artifact paths in reports, normally under `.planning/browser-artifacts/`. Do not write reusable evidence guidance with hard-coded maintainer-specific absolute paths.

## Required evidence fields

Every browser evidence report must include:

When the work is frontend/UI-related, also include the frontend skill routing record from `skills/gsd-frontend-skill-routing/SKILL.md`: work type, skills considered, skills applied, skipped with reason, and evidence expectation.

- browser session name;
- route or page;
- action path tested;
- screenshot path under `.planning/browser-artifacts/`;
- additional artifacts, if any;
- expected result;
- actual result;
- pass/fail status;
- gaps or limitations.

## Unavailable browser handling

If GSD Browser is unavailable but the work is browser-facing:

1. Finish implementation, docs, or other non-browser work when useful.
2. Run fallback checks such as builds, tests, static checks, or server checks.
3. Mark browser verification as missing.
4. Use this status exactly: `Implemented, verification blocked`.
5. Do not claim browser-facing work is fully complete or browser-verified.

Blocked browser verification can be cleared only by agent-captured GSD Browser evidence or explicit human verification from the user. Fallback checks alone cannot clear browser verification.

## Strict browser verification block

Use this block in completion summaries for browser-facing work.

### Outcome Summary

`<one sentence describing what changed, what route or flow was exercised, and whether the intended result passed>`

### Evidence Table

| Browser Session | Route/Page | Action Path | Screenshot Path | Additional Artifacts | Expected Result | Actual Result | Pass/Fail | Gaps |
|-----------------|------------|-------------|-----------------|----------------------|-----------------|---------------|-----------|------|
| `<session>` | `<route-or-url>` | `<actions taken>` | `.planning/browser-artifacts/<file>.png` | `<none-or-path>` | `<expected observable result>` | `<actual observed result>` | `<PASS|FAIL|BLOCKED>` | `<none-or-limitations>` |

## Result language

Use `PASS` only when the browser evidence proves the intended result. Use `FAIL` when the browser result was exercised and did not meet the expectation. Use `BLOCKED` with `Implemented, verification blocked` when browser verification could not be completed.
