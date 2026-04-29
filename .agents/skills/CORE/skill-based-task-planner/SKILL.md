---
name: skill-based-task-planner
description: "Map repository tasks to relevant project skills and produce an execution plan. WHEN: \"map skills to tasks\", \"use pertinent skills\", \"create implementation plan\", \"plan repo work\", \"sync docs then plan\", \"approved proceed\"."
---

# Skill-Based Task Planner

Use this skill when a user asks to apply available project skills to repository work, map skills to implementation tasks, or create a completion plan before execution.

## Workflow

1. **Identify the task objective**
   - Extract the concrete repo, docs, implementation, debug, or planning goal.
   - Ignore incidental phrasing unless it affects execution.

2. **Resolve skill scope**
   - Parse any provided skill lookup pattern.
   - Treat listed skill names as keyword/path-fragment filters.
   - If the filter is empty, consider all available project skills.

3. **Load relevant skills**
   - Match direct and nested `SKILL.md` files under matching skill directories.
   - Read only skills relevant to the task.
   - Do not apply unrelated skills merely because they matched the filter.

4. **Map skills to tasks**
   - Break the work into concrete implementation or documentation tasks.
   - Assign one or more pertinent skills to each task.
   - Mark unmapped tasks explicitly when no relevant skill applies.

5. **Create the execution plan**
   - Order tasks by dependency and risk.
   - Include verification steps for each implementation slice.
   - Prefer small, testable slices over broad batches.

6. **Proceed only when authorized**
   - If the user has already said “approved, proceed,” continue execution.
   - Otherwise, present the plan and wait for approval before modifying files.

## Output Format

```md
## Objective
[One-sentence task objective]

## Relevant Skills
| Skill | Why it applies |
|---|---|

## Task-to-Skill Map
| Task | Skills | Verification |
|---|---|---|

## Execution Plan
1. [First testable slice]
2. [Second testable slice]
3. [Next slice]

## Execution State
[Planned / In progress / Complete / Blocked]
```

## Rules

- Prefer direct repository evidence over assumptions.
- Do not invent available skills.
- Do not execute destructive changes without explicit approval.
- Keep plans tied to verifiable outcomes.
- Update docs or memories only when the task explicitly requires synchronization.
