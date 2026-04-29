# Judge Reconciliation Protocol

8-step process for reconciling reviewer findings into a ranked, deduplicated
report. Run after all reviewer waves complete. Input: all findings from all
reviewers, each with confidence score and evidence (block or compact format
per references/output-formats.md).

## Contents

- [Step 1 — Normalize](#step-1--normalize)
- [Step 2 — Cluster](#step-2--cluster)
- [Step 3 — Deduplicate](#step-3--deduplicate)
- [Step 4 — Confidence Filter](#step-4--confidence-filter)
- [Step 5 — Conflict Resolution](#step-5--conflict-resolution)
- [Step 6 — Interaction Analysis](#step-6--interaction-analysis)
- [Step 7 — Elevation](#step-7--elevation)
- [Step 8 — Final Ranking](#step-8--final-ranking)
- [Reconciled Output Template](#reconciled-output-template)

## Step 1 — Normalize

Pipe raw reviewer output through scripts/finding-formatter.py:

```bash
cat reviewer-output.txt | python scripts/finding-formatter.py --mode session  # or --mode audit
```

Each finding gets a unique ID: `HR-{S|A}-{seq:03d}` (S = session, A = audit).

Example: `{"id": "HR-S-001", "priority": "P1", "location": "src/auth.py:45", "confidence": 0.85, "description": "Missing token expiry validation", "evidence": "RFC 6749 Section 5.1"}`

## Step 2 — Cluster

Group findings by root cause. Assign cluster IDs (`C-001`, `C-002`, ...).

| Signal | Interpretation |
|--------|----------------|
| Same file, within 10 lines | Same issue at different abstraction levels |
| Same pattern across files | Systemic issue |
| Same dependency | Dependency-level finding |

Example: HR-S-003 at `routes.py:112`, HR-S-007 at `routes.py:118` (within 10 lines),
HR-S-012 at `handlers.py:45` (same pattern) — all cluster into `C-001: missing input validation`.

## Step 3 — Deduplicate

Within each cluster:

1. Keep the finding with highest confidence and most specific evidence.
2. Merge complementary evidence — append sources confirming the same issue.
3. Compute merged confidence: `c_merged = 1 - (1-c1)(1-c2)...(1-cN)` where c1..cN are individual confidence scores. Cap at 0.99.
4. Update the surviving finding's description to incorporate merged context.

Example: HR-S-003 (0.9, cites OWASP) and HR-S-007 (0.7, cites library docs) — keep
HR-S-003, merge the library doc citation into its evidence field.

## Step 4 — Confidence Filter

**Step 4a — Learnings Check:**
Before applying the confidence filter, check findings against stored learnings:

```bash
cat findings.json | python scripts/learnings-store.py check --project [project-slug]
```

Findings matching a stored false-positive learning have their confidence reduced by 0.3.
Use `--dry-run` to preview suppressions before applying. Suppress findings only when
the match is relevant to the current review context.

See scripts/learnings-store.py for matching criteria (file path + category/keyword).

| Confidence | Action |
|------------|--------|
| >= 0.7 | Report with full confidence |
| 0.3 -- 0.7 | Report as "unconfirmed", mark with warning marker |
| < 0.3 | Discard — log in audit trail at end of report |

**Exception:** P0/S0 findings with confidence 0.3--0.7 are always reported. The blast
radius of a missed critical finding outweighs a false positive.

Example: `HR-S-005 [P0, 0.55]` — reported as unconfirmed (P0 exception). `HR-S-014 [P2, 0.20]` — discarded to audit trail.

## Step 5 — Conflict Resolution

When two findings contradict:

- **"Over-engineered" vs "needs more abstraction"**: compare evidence strength, lines of code affected, number of callers. Tied evidence — flag for human judgment.
- **Research vs heuristic**: research evidence (library docs, OWASP, benchmarks) wins over heuristic-only reasoning.
- **Irreconcilable**: present both, mark `CONFLICT — see also HR-{id}`, defer to reviewer.

Example: HR-S-008 ("1:1 wrapper, 4 methods, 0 bypass callers" — concrete) vs HR-S-011 ("needed for future auth hooks" — heuristic). HR-S-008 wins.

## Step 6 — Interaction Analysis

For each pair of high-priority (P0/P1/S0/S1) findings:

| Interaction | Action |
|-------------|--------|
| **Conflict** — fixing A worsens B | Annotate both: "Conflicts with HR-{id}" |
| **Subsumption** — fixing A fixes B | Keep A, annotate B: "Resolved by HR-{id}" |
| **Independent** | No annotation |

Group related fixes into implementation batches (`Batch: B-{n}`).

Example: HR-S-005 (race condition) and HR-S-009 (missing lock) — `Batch B-1`: implement
together since session locking resolves both.

## Step 7 — Elevation

When the same pattern appears in 3+ files:

1. Create an elevated finding at the design/architecture level.
2. Replace individual findings with the elevated finding.
3. List all affected locations as sub-items.
4. Increase priority by one level (P2 becomes P1, S2 becomes S1; P0/S0 unchanged).

Example: three P2 "missing validation" findings across `users.py`, `orders.py`,
`products.py` — elevate to P1 SYSTEMIC finding with fix: "add validation middleware."

## Step 8 — Final Ranking

Score each surviving finding: `score = severity_weight x confidence x blast_radius`

| Priority | Weight | | Blast Radius | Multiplier |
|----------|--------|-|--------------|------------|
| P0 | 10 | | Single file | 1 |
| P1 | 5 | | Module | 2 |
| P2 | 2 | | Cross-module | 3 |
| S0 | 8 | | System-wide | 5 |
| S1 | 4 | | | |
| S2 | 1 | | | |

Sort descending by score. Group into tiers:

| Tier | Criteria |
|------|----------|
| **Must Fix** | P0, S0, or score >= 20 |
| **Should Fix** | P1, S1, or score >= 8 |
| **Consider** | Everything else above confidence threshold |
| **Discarded** | Below confidence threshold (audit trail) |

Example: `HR-S-005 [P0, 0.85, system-wide] = 10 x 0.85 x 5 = 42.5 → Must Fix`

## Reconciled Output Template

Final output after all 8 steps (follows references/output-formats.md):

```
======================================
RECONCILED REVIEW — JUDGE REPORT
======================================
REVIEWERS: [list reviewer roles]
FINDINGS IN: [total raw]  AFTER DEDUP: [surviving]  ELEVATED: [count]

MUST FIX:
1. HR-S-005 [P0, score 42.5] Race condition in session store
   Level: Correctness | Confidence: 0.85 | Effort: M
   Evidence: [citation] | Impact: [consequence] | Fix: [approach]
   Batch: B-1 (implement with HR-S-009)

SHOULD FIX:
2. HR-S-003 [P1, score 13.5] SYSTEMIC — missing input validation
   Level: Correctness | Confidence: 0.90 | Effort: M
   Evidence: [merged citations] | Fix: [approach]
   Affected: src/api/users.py:30, src/api/orders.py:55, src/api/products.py:22

CONSIDER:
3. HR-S-009 [P1, score 7.5] Missing session lock
   Level: Correctness | Confidence: 0.75 | Effort: S | Batch: B-1

UNCONFIRMED:
4. HR-S-019 [P0] Potential memory leak — P0 exception (confidence: 0.45)

DISCARDED (audit trail):
- HR-S-014 [P2, 0.20] Possible over-fetching — insufficient evidence

CONFLICTS: HR-S-008 vs HR-S-011 (resolved: HR-S-008 wins)
BATCHES: B-1 [HR-S-005, HR-S-009] — session locking (implement together)
======================================
```

**Schema version:** Include `"schema": 2` in all JSON output. v4.0 reviews (schema 1 or missing)
are loaded with `reasoning: null` for backward compatibility.
