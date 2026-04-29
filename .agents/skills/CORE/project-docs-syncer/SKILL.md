---
name: project-docs-syncer
description: "Update project docs, onboarding docs, and memory files to match current repository state. WHEN: \"sync docs\", \"update onboarding docs\", \"update memories\", \"docs current state\", \"project documentation sync\", \"refresh repo docs\"."
---

# Project Docs Syncer

Use this skill when a user asks to update repository documentation, onboarding docs, `.serena` memories, or project state files so they reflect the current implementation.

## Workflow

1. **Identify documentation targets**
   - Find requested docs, onboarding files, memory files, and project state references.
   - Include `.serena/memories/*` only when explicitly requested or clearly part of the project workflow.

2. **Inspect current repository state**
   - Read source files, configs, tests, scripts, and recent implementation artifacts relevant to the docs.
   - Prefer direct repo evidence over assumptions.

3. **Compare docs against implementation**
   - Detect stale claims, missing features, renamed paths, obsolete commands, and outdated workflows.
   - Mark uncertain items instead of inventing state.

4. **Update documentation**
   - Make targeted edits that align docs with observed behavior.
   - Preserve existing structure unless it is misleading.
   - Keep onboarding docs action-oriented and executable.

5. **Sync memory/state files**
   - Update project memories with concise current-state facts.
   - Avoid duplicating long docs inside memory files.
   - Record only durable implementation state, decisions, and next steps.

6. **Validate integrity**
   - Check local links, referenced paths, command examples, and file names.
   - Verify docs do not reference missing or obsolete artifacts.
   - Run available documentation or test validation commands when present.

7. **Report changes**
   - Summarize files changed.
   - List evidence used.
   - Call out unresolved gaps or assumptions.

## Output Format

```md
## Documentation Sync Summary
[One-sentence summary]

## Files Updated
| File | Change |
|---|---|

## Current-State Evidence
| Evidence | Source |
|---|---|

## Validation
| Check | Result |
|---|---|

## Remaining Gaps
- [Gap or “None”]
```

## Rules

- Do not update docs from intent alone; ground changes in repository evidence.
- Do not create new onboarding structure unless the existing structure cannot represent the current state.
- Do not duplicate large content across docs and memories.
- Keep memory updates concise and durable.
- Treat broken links, obsolete commands, and stale paths as defects.
- Preserve user-approved implementation direction when syncing project state.
