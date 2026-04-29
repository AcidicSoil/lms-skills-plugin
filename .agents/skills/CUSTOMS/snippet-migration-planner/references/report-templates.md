# Report Templates

## Migration Report

```markdown
## Summary

[1-3 sentence migration summary]

## Inventory

| Old ID | Old Prefix/Name | Type | Variables | Tags | Concern |
|---|---|---|---|---|---|

## Migration Actions

| Old ID | New ID | Action | Reason | Compatibility Note |
|---|---|---|---|---|

## Duplicates and Collisions

| Items | Issue | Resolution |
|---|---|---|

## Workflow Promotions

| Source Item | New Workflow ID | Reason | Steps |
|---|---|---|---|

## Risks

- [schema drift, missing fields, unsafe prompt, or importer uncertainty]
```

## Revised Snippet Contract

Return: prefix or ID, title, description, template, variables, tags, usage note, and migration note.

## Workflow Candidate Contract

Return: workflow ID, title, description, variables, ordered steps, `insertMode` per step, tags, expected output, and fallback behavior.

## Import-Ready JSON Caveat

If the exact importer schema is unknown, label the JSON as review-ready and include `sha256:<to-compute>` rather than invented hashes.
