# Extraction Workflow

## 1. Source Artifact Registry

Assign stable IDs in input order:

| Field | Rule |
|---|---|
| `doc_id` | `DOC-01`, `DOC-02`, ... |
| title | Use artifact title if present; otherwise `Unknown` |
| type guess | `PRD`, `ticket`, `notes`, `spec`, or `unknown` |
| scope focus | Short source-grounded phrase or `Unknown` |
| prior AM | Label as `MASTER-PREV` when supplied |

## 2. Normalize Atomic Items

Create one atomic item per discrete trackable statement: requirement, feature, constraint, metric, risk, decision, milestone, module boundary, artifact, or workflow step.

Use these parsing heuristics:

- Headings become section anchors.
- Ticket-like blocks expose Title, Summary, Scope, Requirements, Acceptance Criteria, Risks, and Dependencies.
- Tables produce one candidate item per row.
- Code blocks contribute only explicit normative statements about contracts, paths, artifacts, or behavior.

Atomic item fields:

| Field | Requirement |
|---|---|
| `item_id` | Stable ID from deterministic rules |
| `item_type` | One allowed type from the ID mapping |
| `statement` | One normalized sentence |
| `details` | Optional short source-grounded bullets |
| `sources` | `doc_id`, `section_ref`, optional quote of 20 words or fewer |

## 3. Deduplicate by Meaning

- Equivalent items become one canonical item with source variants in details.
- Similar but materially different items remain separate.
- Incompatible items remain separate and list `conflicts_with`.
