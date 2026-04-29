# Determinism and Convergence Rules

## Item Types and ID Prefixes

| item_type | Prefix |
|---|---|
| `goal` | `G` |
| `scope` | `S` |
| `requirement_functional` | `FR` |
| `requirement_nonfunctional` | `NFR` |
| `architecture` | `ARCH` |
| `data_contract` | `DATA` |
| `workflow` | `WF` |
| `artifact` | `ART` |
| `milestone` | `MS` |
| `risk` | `RISK` |
| `dependency` | `DEP` |
| `decision_point` | `DP` |
| `open_question` | `Q` |

`item_id` format: `<TYPE>-<slug>`.

Slug rules:

- lowercase and hyphen-separated
- remove stopwords where possible
- keep under 8 words
- preserve existing IDs from prior AM unless the item is deleted or merged
- if merged, keep old IDs in `supersedes`

## Status Values

Use only: `aligned`, `variant`, `conflict`, `new`, `missing_from_others`, `unknown`.

Relationships:

- `conflicts_with`: only incompatible items
- `supersedes`: only explicit replacement or merge
- `depends_on`: only explicitly stated dependencies

## Convergence Actions

Use only: `accept`, `choose`, `merge`, `defer`.

| Action | Use When |
|---|---|
| `accept` | Item is aligned or uncontested |
| `choose` | Competing options cannot both be true |
| `merge` | Variants can be combined without contradiction |
| `defer` | Evidence is insufficient or decision belongs to user |

## Conflict Handling

Every conflict must include:

- Option A with provenance
- Option B with provenance
- decision criteria grounded in artifacts when possible
- proposed path, compatible merge, or `Decision Needed`

## Ordering

- Documents: `DOC-##`
- Master Plan sections: canonical outline order
- Items inside sections: sort by `item_type`, then `item_id`
- Ledger rows: sort lexicographically by `item_id`
- `section_ref`: prefer heading path like `H2: Scope > H3: In Scope`; otherwise `LineRange: Lx-Ly`
