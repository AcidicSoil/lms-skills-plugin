---
name: implementation-slice-executor
description: "Break approved repository work into small testable implementation slices and execute them. WHEN: \"approved proceed\", \"begin working\", \"next best slice\", \"implement the plan\", \"continue execution\", \"testable slice\"."
---

# Implementation Slice Executor

Use this skill when the user has approved repository work and wants implementation to proceed in small, verifiable increments.

## Workflow

1. **Confirm approved scope**
   - Identify the exact approved task or next slice.
   - Preserve prior plan constraints, repository direction, and user-approved decisions.
   - Do not expand scope unless required to complete the approved slice.

2. **Inspect current state**
   - Read relevant source files, tests, configs, docs, and existing patterns.
   - Prefer direct repository evidence over assumptions.
   - Identify the smallest safe change that advances completion.

3. **Define the slice**
   - State the implementation goal in one sentence.
   - List files expected to change.
   - Define the verification check before editing.

4. **Implement narrowly**
   - Make focused changes only for the current slice.
   - Follow existing architecture, naming, and test conventions.
   - Avoid broad refactors unless the slice explicitly requires them.

5. **Verify**
   - Run the smallest relevant test, build, lint, or smoke check.
   - If no automated check exists, perform a direct manual inspection and state the limitation.
   - Fix regressions introduced by the slice before moving on.

6. **Update state**
   - Record completed work, remaining gaps, and next recommended slice.
   - Update docs or memory files only when the approved task requires project-state synchronization.

7. **Continue only within approval**
   - If the user has authorized continued execution, proceed to the next dependent slice.
   - Stop when the next step changes scope, requires destructive action, or lacks enough evidence.

## Output Format

```md
## Slice Objective
[One-sentence implementation goal]

## Files Changed
| File | Change |
|---|---|

## Verification
| Check | Result |
|---|---|

## Completion State
[Complete / Partial / Blocked]

## Next Slice
[Next smallest useful implementation step]
```

## Rules

- Prefer small, reversible changes.
- Do not invent repository facts or test results.
- Do not skip verification when a relevant check exists.
- Treat failing tests, build errors, broken imports, and type errors as blockers.
- Keep each slice independently reviewable.
- Preserve existing behavior unless the task explicitly changes it.
