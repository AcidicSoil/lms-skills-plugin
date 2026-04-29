# Consolidation Protocol

Use this protocol to reconcile repository state without losing useful history or breaking compatibility.

## Evidence Inventory

| Evidence | Use |
|---|---|
| `.serena/memories` or equivalent | Determine active state, stale handoffs, durable decisions |
| README, TODO, roadmap, docs | Find user-facing truth and planned work |
| Source tree and tests | Verify canonical implementation and compatibility paths |
| CI, Makefile, manifests | Select repo-native verification commands |
| Recent logs/handoffs | Recover completed work and remaining Unknowns |

## Classification Rules

| Label | Meaning | Action |
|---|---|---|
| Active | Still describes current work or durable decisions | Keep and refresh |
| Superseded | Replaced by newer state | Archive or summarize |
| Stale | Finished or contradicted by current repo | Archive with clear name |
| Contradicted | Conflicts with verified source/tests | Update or archive |
| Unknown | Cannot verify safely | Preserve and mark Unknown |

## Duplicate Structure Rules

1. Identify all duplicate paths and import/docs references.
2. Select the canonical path from source ownership, package data, tests, and docs.
3. Convert old paths to thin compatibility shims only when compatibility is required.
4. Add or preserve tests for canonical imports, compatibility imports, asset loading, and packaging.
5. Do not delete a duplicate implementation until tests prove it is unused or safely shimmed.

## Verification Pattern

1. Run focused tests for the affected behavior.
2. Run lint/policy checks for touched files when available.
3. Run full repo verification before repo-wide success claims.
4. Report exact commands and observed results.
