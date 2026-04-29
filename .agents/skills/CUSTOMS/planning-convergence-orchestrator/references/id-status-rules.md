# ID and Status Rules

## Item Types and Prefixes

| item_type | prefix |
|---|---|
| goal | G |
| scope | S |
| requirement_functional | FR |
| requirement_nonfunctional | NFR |
| architecture | ARCH |
| data_contract | DATA |
| workflow | WF |
| artifact | ART |
| milestone | MS |
| risk | RISK |
| dependency | DEP |
| decision_point | DP |
| open_question | Q |

## Stable IDs

Format: `<TYPE>-<slug>`.

Slug rules:
- lowercase, hyphen-separated
- remove stopwords where possible
- under 8 words
- once assigned, do not change unless deleted or merged
- if merged, keep old IDs in `supersedes`

## Status Values

| status | Meaning |
|---|---|
| aligned | Multiple sources support the same meaning. |
| variant | Sources differ but can plausibly coexist. |
| conflict | Sources are incompatible. |
| new | Introduced by latest artifacts or absent from prior AM. |
| missing_from_others | Present in one source but not comparable sources. |
| unknown | Source implies a category but lacks specifics. |

## Convergence Actions

Use exactly one action per ledger row:

| action | Use when |
|---|---|
| accept | Item is aligned, source-grounded, and non-conflicting. |
| choose | Conflict requires selecting one option. |
| merge | Variants can be combined without inventing content. |
| defer | Missing data or unresolved decision prevents convergence. |

## Conflict Handling

For every conflict, render:
- Option A with provenance
- Option B with provenance
- decision criteria grounded in artifacts when possible
- resolution path, or `Decision Needed`

Decision criteria may include cost, complexity, determinism, compatibility, and explicit user preference only when present in source artifacts or iteration context.
