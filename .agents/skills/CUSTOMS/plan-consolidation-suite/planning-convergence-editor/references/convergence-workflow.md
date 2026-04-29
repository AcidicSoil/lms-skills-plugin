# Convergence Workflow

## 1. Reconcile Inputs

Read the Master Plan and Merge Ledger together. Check that ledger item IDs referenced in Top Deltas, Decision Log, Open Questions, and Next Iteration Focus exist in the ledger or atomic register.

## 2. Preserve Differences

For unresolved differences:

| Difference | Treatment |
|---|---|
| Equivalent wording | Keep one canonical item with variants noted. |
| Compatible variants | Mark `merge` and preserve provenance. |
| Incompatible options | Mark `choose`; include Option A vs Option B. |
| Missing specifics | Mark `defer`; create or preserve an open question. |

## 3. Update Master Plan

Carry forward the canonical outline exactly. Add or update Decision Log and Change Log entries only when grounded by sources, prior plan, ledger, or iteration context.

## 4. Produce Next Iteration Focus

Create 3 to 10 bullets. Prioritize unresolved conflicts, high-impact variants, missing required data, and validation failures. Every bullet must reference one or more `item_id` values.
