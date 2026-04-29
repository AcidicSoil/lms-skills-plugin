# Asset Model

Use this model before rewriting assets.

| Type | Purpose | Use When |
|---|---|---|
| Snippet | Atomic prompt macro | One action, 0-3 variables, one response, no staged refinement |
| Workflow | Ordered prompt routine | Multiple phases, audit-plan-execute-review, handoffs, or progressive refinement |
| Pack | Versioned collection | Shared namespace, catalog browsing, import/export, migration notes |
| Migration artifact | Transitional record | Mapping legacy prefixes, tags, variables, or schema fields |

## Actions

- **Keep**: clear, unique, current, and correctly scoped.
- **Revise**: useful but vague, poorly named, weakly tagged, or missing variables.
- **Merge**: overlaps another asset with the same purpose.
- **Promote to workflow**: contains staged steps, more than 3-5 meaningful variables, or handoff behavior.
- **Deprecate**: duplicated, obsolete, unsafe, misleading, or incompatible.
- **Archive**: retained only for history or migration traceability.

## Quality Criteria

Snippets need stable prefixes, compact templates, explicit intent, clear variables, safe defaults, tags, and catalog-preview descriptions.

Workflows need clear titles, ordered steps, step-level intent, `insertMode` values, variables, tags, expected output, fallback behavior, and a termination condition.
