# Output Contracts

Use the smallest contract that satisfies the request.

## Audit Report

Return:

1. Summary
2. Inventory table
3. Duplicate or overlap findings
4. Snippet/workflow classification
5. Recommended revisions
6. Migration actions
7. Risks and edge cases

## Individual Snippet

Return:

- prefix or ID
- title
- description
- template
- variables
- tags
- usage note
- migration note when applicable

## Workflow

Return:

- workflow ID
- title
- description
- variables
- ordered steps
- `insertMode` per step
- tags
- expected output
- fallback or failure behavior

## Curated Pack

Return:

- pack name and namespace
- purpose and target users
- taxonomy
- snippets
- workflows
- metadata strategy
- import/export notes
- migration notes

## Migration Plan

Inventory first, normalize second, deduplicate third, classify fourth, rewrite last.

Use a table with: old ID, old prefix/name, new ID, action, reason, and compatibility note.

## JSON Output Rules

Prefer canonical fields when supported: `id`, `template`, `variables`, `metadata`, `createdAt`, `updatedAt`, and `usage`. Do not invent real hashes or schema guarantees.
