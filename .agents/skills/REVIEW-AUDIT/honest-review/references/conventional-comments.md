# Conventional Comments Format

Machine-parseable, human-friendly labeling for PR comments and CI annotations.
Based on [conventionalcomments.org](https://conventionalcomments.org/).

## Contents

- [Labels](#labels)
- [Decorations](#decorations)
- [Severity Mapping](#severity-mapping)
- [Format Template](#format-template)
- [Format Selection Rule](#format-selection-rule)

## Labels

| Label | Use When |
|-------|----------|
| **praise** | Acknowledging well-engineered patterns, clean abstractions, thoughtful design (strengths) |
| **issue** | A defect that must or should be fixed (P0-P1, S0-S1) |
| **suggestion** | An improvement that would benefit the code but is not a defect (P2+, S2+) |
| **nitpick** | A minor stylistic or cosmetic concern (only report if positive ratio allows) |
| **question** | Seeking clarification about intent or design choice |
| **thought** | An observation for the author to consider — no action required |
| **todo** | A small task to address before merging (blocking) or in a follow-up (non-blocking) |

## Decorations

| Decoration | Meaning |
|------------|---------|
| **(blocking)** | Must be resolved before merge. Use for P0/S0 and critical P1/S1 findings. |
| **(non-blocking)** | Should be addressed but does not block merge. Default for P2+/S2+ findings. |
| **(if-minor)** | Only address if the fix is trivial. Used for nitpicks and low-effort suggestions. |

## Severity Mapping

Map internal severity classifications to Conventional Comments labels:

| Internal Severity | Conventional Comment Label |
|------------------|---------------------------|
| P0 (critical defect) | `issue (blocking)` |
| S0 (critical simplification) | `issue (blocking)` |
| P1 (significant defect) | `issue (non-blocking)` |
| S1 (significant simplification) | `suggestion (blocking)` |
| P2 (minor defect) | `suggestion (non-blocking)` |
| S2 (minor simplification) | `suggestion (non-blocking)` or `nitpick` |
| P3 (informational) | `thought` or `nitpick (if-minor)` |
| S3 (informational) | `thought` or `nitpick (if-minor)` |
| Strength | `praise` |
| Clarification needed | `question` |

## Format Template

```
<label> (<decoration>): <one-line subject>

**[HR-{S|A}-{NNN}]** [file:start-end] | Level: <level> | Confidence: <score>

**Reasoning:** <WHY this is a problem — 2-3 sentences>

**Finding:** <WHAT the problem is — 1 sentence>

**Evidence:** <citation — URL, doc reference, or reproduction>
**Fix:** <recommended approach>
```

Example:

```
issue (blocking): Race condition in concurrent session access

**[HR-S-005]** [src/session.py:45-52] | Level: Correctness | Confidence: 0.85

**Reasoning:** Multiple coroutines access `session_store` without synchronization.
Under concurrent load, interleaved reads and writes can produce stale session data,
leading to authentication bypass or data corruption.

**Finding:** Missing lock on shared session store allows race condition.

**Evidence:** Python asyncio docs confirm dict operations are not atomic across await points.
**Fix:** Wrap session access in `asyncio.Lock()` or use `aioredis` for atomic operations.
```

## Format Selection Rule

- **Traditional format** (default): Use for session reviews (`/honest-review` with session changes) and full audits (`/honest-review audit`). This is the standard output format from references/output-formats.md.
- **Conventional Comments format**: Use when:
  - `--format conventional` flag is explicitly set
  - Output destination is a PR review (`/honest-review <PR#>`)
  - Running in CI pipeline (references/ci-integration.md)
- **Both formats together**: When reviewing a PR, produce the full traditional report in the conversation AND post individual findings as Conventional Comments on the PR via `gh api`.

Cross-references: references/output-formats.md (traditional format), references/ci-integration.md (CI posting).
