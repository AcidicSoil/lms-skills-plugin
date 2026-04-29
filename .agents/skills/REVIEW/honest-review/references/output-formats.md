# Output Formats

Report templates for final output. Read when producing the final report.

## Contents

- [Compact Format](#compact-format-5-or-fewer-findings-small-reviews)
- [Session Review Format](#session-review-format-6-findings)
- [Full Codebase Audit Format](#full-codebase-audit-format)
- [Individual Finding Format](#individual-finding-format)
- [Verification Summary](#verification-summary)
- [Report Statistics](#report-statistics)

## Compact Format (5 or fewer findings, small reviews)

Use for quick reviews of 1-2 files with few findings.
Every listed finding still follows the Individual Finding Format: keep the
`[file:start-end]` citation anchor and the reasoning-first ordering even when
the presentation is compressed.

```
HONEST REVIEW (N files)

STRENGTHS:
+ [well-engineered pattern or decision worth preserving]

P1: [file:start-end] Reasoning: [WHY this matters]. Description: [WHAT is wrong] — evidence: [citation]. Fix: approach. (Level)
S0: [module] Reasoning: [WHY this simplification matters]. Description: [WHAT is overly complex] — evidence: [citation]. Fix: approach. (Level)

Verified: build clean, tests pass.
```

## Session Review Format (6+ findings)

Use for session reviews with multiple findings across files.
Every finding below expands to the Individual Finding Format. Read-only review
output and post-approval fix reporting are separate shapes; do not mix them.

```
======================================
HONEST REVIEW
======================================

FILES REVIEWED:
- path/to/file1.ts (created)
- path/to/file2.ts (modified)

STRENGTHS:
+ [pattern] Well-implemented [description of what works well]
+ [pattern] Good [description of positive design choice]
+ [pattern] [additional strength if applicable]

DEFECTS:

P0 - MUST FIX:
1. HR-S-001 [file:start-end] Missing null check
   Level: Correctness
   Confidence: 0.95
   Reasoning: The code dereferences a nullable value on the hot path without a guard.
   When the upstream lookup misses, the review path shifts from a recoverable miss to a crash.
   Description: Missing null check before dereference.
   Evidence: [research result — doc citation, advisory URL, etc.]
   Impact: Can crash when user not found
   Fix: Add guard clause

P1 - SHOULD FIX:
2. HR-S-002 [file:start-end] Query in loop
   Level: Efficiency
   Confidence: 0.85
   Reasoning: The current structure issues one query per item even though the data can be fetched in one batch.
   That pattern scales linearly with the collection size and compounds latency under larger review scopes.
   Description: Query in loop produces an avoidable N+1 pattern.
   Evidence: [research result]
   Impact: N+1 pattern, O(n) queries where 1 suffices
   Fix: Batch fetch

SIMPLIFICATIONS:

S0 - SHOULD SIMPLIFY:
3. HR-S-003 [module] Service layer wraps repository 1:1
   Level: Design
   Confidence: 0.90
   Reasoning: The layer adds no policy, orchestration, or stability boundary beyond simple delegation.
   Keeping it separate increases indirection and maintenance cost without protecting a real contract.
   Description: Pure delegation layer adds unnecessary indirection.
   Evidence: [codebase analysis — N files, M lines of pure delegation]
   Impact: Removes 2 files, 1 layer of indirection, ~80 lines
   Fix: Inline repository calls

CROSS-LEVEL NOTES:
- [conflicts resolved, symptoms elevated to root causes]

NEXT STEP:
- Approval gate: `Implement fixes? [all / select / skip]`
```

### Post-Approval Fix Addendum

Append this block only after the user approves a fix pass and the fixes have
actually been implemented and verified.

```

IMPROVEMENTS MADE:
- #1 (HR-S-001): Added null check [x]
- #2 (HR-S-002): Refactored to batch [x]

VERIFIED:
- Build: clean [x]
- Tests: all passing [x]
- Behavior: [how confirmed] [x]

STATISTICS:
- Findings: N total (X high-confidence, Y unconfirmed, Z discarded)
- Coverage: N files reviewed of M total (P% by risk-weighted LOC)
- Research: N validations performed, X confirmed, Y refuted
======================================
```

## Full Codebase Audit Format

Use for Mode 2 full audit reports.
Every enumerated finding in this format still expands to the Individual Finding
Format, including `[file:start-end]` anchors and `Reasoning` before
`Description`.

```
======================================
FULL CODEBASE AUDIT
======================================

PROJECT: [name] ([language/framework])
SCOPE: [N files across M directories]
TEAM: [list of reviewers and their domains]
PROJECT TYPE: [prototype | production | library] — severity bar: [P0/S0 only | full | full + backward compat]

STRENGTHS:
+ [pattern] [well-engineered aspect worth preserving]
+ [pattern] [positive architectural decision]
+ [pattern] [additional strength]

CRITICAL (P0/S0):
1. HR-A-001 [file:start-end or module] [category] description
   Level: [Correctness/Design/Efficiency]
   Confidence: [0.0-1.0]
   Reasoning: [WHY this is a problem]
   Description: [WHAT is wrong]
   Evidence: [research citation]
   Impact: [what breaks or what complexity it removes]
   Fix: [recommended approach]

SIGNIFICANT (P1/S1):
2. HR-A-002 ...

MINOR (P2/S2):
3. HR-A-003 ...

CROSS-DOMAIN FINDINGS:
- [architectural or systemic observations with evidence]

DEPENDENCY HEALTH:
- [package]: [status] — [details, citation]

HEALTH SUMMARY:
- Correctness: [overall assessment]
- Security: [overall assessment]
- Performance: [overall assessment]
- Simplicity: [where is unnecessary complexity concentrated?]
- Test coverage: [overall assessment]
- Technical debt: [overall assessment]

TOP RECOMMENDATIONS:
1. [highest-impact improvement]
2. [second highest]
3. [third highest]

STATISTICS:
- Findings: N total (X high-confidence, Y unconfirmed, Z discarded)
- Coverage: N files reviewed of M total (P% by risk-weighted LOC)
- Research: N validations performed, X confirmed, Y refuted
======================================
```

## Differential Review Format

Use when comparing against a previous review (via `scripts/review-store.py diff`).
Each `NEW FINDINGS` entry still follows the Individual Finding Format; the
summary lists may compress wording, but not the citation-anchor or reasoning
requirements.

```
======================================
HONEST REVIEW — DIFFERENTIAL
======================================
BASELINE: [date] ([commit]) → CURRENT: [date] ([commit])

PROGRESS SUMMARY:
  +N new findings | -N resolved | ~N recurring

NEW FINDINGS (not in baseline):
1. HR-S-001 [file:start-end] [description]
   Level: [level] | Confidence: [score] | Reasoning: [WHY] | Evidence: [citation]

RESOLVED (in baseline, not in current):
- HR-S-003 [was: file:line] [description] — resolved by [commit/change]

RECURRING (present in both):
- HR-S-002 [file:line] [description] — unchanged since [baseline date]

TREND: [improving | stable | degrading] — [brief justification]
======================================
```

## History Format

Use for `history` output from review-store history/list operations. This is a
read-only summary of stored reviews, not a finding report.

```
======================================
HONEST REVIEW — HISTORY
======================================
PROJECT: [name]

REVIEWS:
- [date] [mode] [commit or range] — [N findings, trend or note]
- [date] [mode] [commit or range] — [N findings, trend or note]

LATEST BASELINE:
- [date] [commit]
- [scope]
- [high-level outcome]
======================================
```

## Individual Finding Format

Use this structure for each finding in any report format:

```
[priority] — [finding-id] [file:start-end] [category]
  Level: [Correctness/Design/Efficiency]
  Confidence: [0.0-1.0]
  Reasoning: [WHY this is a problem — 2-3 sentences explaining the root cause and risk]
  Description: [WHAT is wrong — 1 sentence]
  Evidence: [research validation result — doc citation, advisory URL, etc.]
  Impact: [consequence or complexity cost]
  Fix: [recommended approach]
  Effort: [S (< 1 hour, single file) | M (1-4 hours, few files) | L (4+ hours, cross-cutting)]
```

**Finding ID format:** `HR-{mode}-{seq}` where mode is `S` (session) or `A` (audit),
seq is zero-padded 3-digit (e.g., `HR-S-001`, `HR-A-015`).
See `scripts/finding-formatter.py` for programmatic ID generation.

**Citation anchor format:** `[file:start-end]` references the exact source lines. Anchors are mechanically verified — the referenced lines must exist and contain the described code. Findings with invalid anchors are discarded.

## Conventional Comments Format

Use when `--format conventional` flag is set or when output targets PR annotations.
See references/conventional-comments.md for the full label taxonomy and severity mapping.

**Format Selection Rule:**
- **Traditional format** (default): session reviews, full audits, conversation output
- **Conventional Comments**: `--format conventional` flag, PR reviews (`/honest-review <PR#>`), CI annotations

**Compact example:**
```
issue (blocking): Race condition in concurrent session access

**[HR-S-005]** [src/session.py:45-52] | Level: Correctness | Confidence: 0.85

**Reasoning:** Multiple coroutines access session_store without synchronization.
Under concurrent load, interleaved reads and writes produce stale session data.

**Finding:** Missing lock on shared session store allows race condition.

**Evidence:** Python asyncio docs confirm dict operations are not atomic across await points.
**Fix:** Wrap session access in asyncio.Lock().
```

## Verification Summary

Append only to post-approval fix reports after implementing fixes:

```
VERIFIED:
- Build/lint: [status]
- Tests: [status]
- Behavior: [what was checked]
```

## Report Statistics

Append to every report as the final section (after Verification Summary when present):

```
STATISTICS:
- Findings: N total (X high-confidence, Y unconfirmed, Z discarded)
- Coverage: N files reviewed of M total (P% by risk-weighted LOC)
- Research: N validations performed, X confirmed, Y refuted
```

- **high-confidence**: findings with Confidence >= 0.8
- **unconfirmed**: findings with Confidence < 0.8 that lack corroborating evidence
- **discarded**: findings investigated but dropped (false positives, duplicates)
- **risk-weighted LOC**: lines of code weighted by file risk (entry points, auth, data handling score higher)

## Machine-Readable Formats

For CI integration and tooling interop, additional output formats are available:

- **SARIF v2.1**: `scripts/finding-formatter.py --format sarif` — see references/sarif-output.md
- **JSON Schema**: `scripts/finding-formatter.py --format json-schema` — structured finding objects
- **Auto-fix diffs**: see references/auto-fix-protocol.md for diff preview format
