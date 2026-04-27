---
description: resume the Beagle workflow from the current task state and advance to the next task only when appropriate
---

# Resume Workflow

You are resuming work from an existing Beagle strategy bundle.

The goal is to pick up from the current task state, force the Beagle skills mapped to the active task, and only advance to the next task when the current one is complete or clearly blocked.

## Default behavior

Work from the strategy bundle first.
Do not treat the workflow as a broad scenario review.
Use the scenario only to confirm routing. After that, operate on the active task.

## What to do

### 1. Read the current state
- identify the current scenario, active task, and task status
- identify the Beagle skill or skills mapped to that task
- identify the acceptance criteria, proof expectations, and next-task hint if one already exists

### 2. Decide how to resume
- if there is an in-progress task, resume that task
- if the active task is blocked, keep the task blocked and update the strategy with the real blocker
- if the active task is complete, promote the next task and restate the mapped Beagle skills for it
- never hop to a different broad scenario unless the strategy itself now classifies the work differently

### 3. Force the mapped skills and continue
Before continuing, switch onto the Beagle skill or skills mapped to the task you are about to work on.
Then either:
- continue the in-progress task
- repair the blocked task state with clearer next steps
- begin the newly promoted next task

### 4. Keep the workflow honest
- update the active task state when reality changes
- update next-task selection when the current task completes or blocks
- update supporting artifacts if the task guidance, proof expectations, or mapped Beagle skills changed

## Output goal

Return a short workflow update that says:
- which task is now active
- whether it was resumed, completed, blocked, or newly promoted
- which Beagle skills are now in force for that task
- what changed in the strategy or repo state
- what should happen next
