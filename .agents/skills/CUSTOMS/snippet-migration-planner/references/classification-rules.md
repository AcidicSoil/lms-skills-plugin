# Classification Rules

Classify each item after inventory and normalization.

| Action | Use When |
|---|---|
| Keep | Clear, unique, current, compact, and correctly scoped. |
| Revise | Useful but vague, poorly named, weakly tagged, or missing variables. |
| Merge | Multiple items serve the same purpose with minor wording differences. |
| Promote to workflow | The item has phases, handoffs, review loops, or more than 3-5 meaningful variables. |
| Deprecate | Obsolete, unsafe, misleading, or superseded by a better item. |
| Archive | Retain for traceability but exclude from active catalog use. |

## Snippet Heuristics

Keep as snippet when it performs one prompt action, has 0-3 variables, returns one response, and does not require staged refinement.

## Workflow Heuristics

Promote to workflow when it includes audit → plan → execute → review, requires multiple messages, coordinates handoff behavior, or benefits from step-level `insertMode`.

## Duplicate Checks

- Exact duplicate: same prefix and same content.
- Semantic duplicate: different names but same reusable action.
- Collision: same prefix but different behavior.

Preserve original IDs when the meaning is unchanged. Create new IDs when the action or scope changes materially.
