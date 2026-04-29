# Status and Action Rules

## Status Values

| Status | Meaning |
|---|---|
| `aligned` | Multiple sources support the same meaning. |
| `variant` | Sources differ but can plausibly coexist. |
| `conflict` | Sources are incompatible. |
| `new` | Item is introduced by latest artifacts or absent from prior plan. |
| `missing_from_others` | Item appears in one source but not comparable sources. |
| `unknown` | Source implies a category but lacks specifics. |

## Convergence Actions

| Action | Use when |
|---|---|
| `accept` | Item is aligned, source-grounded, and non-conflicting. |
| `choose` | Conflict requires selecting one option. |
| `merge` | Variants can be combined without inventing content. |
| `defer` | Missing data or unresolved decisions prevent convergence. |

## Conflict Rules

For each conflict, notes must include:

- Option A with provenance.
- Option B with provenance.
- Decision criteria grounded in artifacts when possible.
- Resolution path or `Decision Needed`.

Do not convert a conflict to an accepted item unless the sources explicitly resolve it.
