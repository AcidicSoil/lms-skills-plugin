# Source Extraction

## Source Registry

Assign `doc_id` values in received order: `DOC-01`, `DOC-02`, etc. For each artifact capture title if present, type guess (`PRD`, `ticket`, `notes`, `spec`, or `unknown`), and evident scope focus. If a prior master plan is supplied, label it `MASTER-PREV`.

## Atomic Statement Extraction

Extract one discrete, trackable statement per item. Valid item types are:

| Type | Use for |
|---|---|
| `goal` | Intended outcome |
| `scope` | In-scope or out-of-scope boundary |
| `requirement_functional` | Required behavior |
| `requirement_nonfunctional` | Quality, performance, security, determinism |
| `architecture` | Components, boundaries, design choices |
| `data_contract` | Schema, interface, file, path, marker |
| `workflow` | Ordered process or operational semantics |
| `artifact` | Required output or deliverable |
| `milestone` | Phase or delivery point |
| `risk` | Risk and mitigation |
| `dependency` | Explicit dependency |
| `decision_point` | Choice requiring resolution |
| `open_question` | Unknown or underspecified issue |

## Parsing Rules

- Headings become section anchors.
- Ticket-like blocks contribute fields such as title, scope, requirements, acceptance criteria, risks, and dependencies.
- Table rows become candidate items.
- Code blocks contribute only explicit normative statements such as `must`, `shall`, `exactly`, or `required`.

Deduplicate by meaning. Equivalent items merge with all provenance retained. Similar but materially different items remain separate.
