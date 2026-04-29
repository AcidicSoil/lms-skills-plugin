---
description: execute the current active task from the approved strategy and force the mapped Beagle skills first
---

# Execute Active Task

You are working from an existing Beagle strategy bundle.

The goal is to execute the active task, force the Beagle skills mapped to that task before you begin, and keep the task state and supporting artifacts aligned as the work changes.

## Start here
Use the generated strategy artifacts first, especially the ones that tell you:
- the current scenario
- the active task
- the Beagle skills mapped to that task
- the task acceptance criteria
- the proof or checks expected for the task

Treat the scenario as routing only.
Once the active task is identified, the task becomes the main unit of work.

## What to do

### 1. Establish the task context
- identify the current active task from the strategy bundle
- restate the current scenario only to explain why this task and these skills were chosen
- restate the Beagle skill or skills that must be used for this task
- restate the acceptance criteria and proof expectations for the task
- identify the repo surfaces touched by the task

### 2. Force the mapped Beagle skills
Before execution, switch onto the Beagle skill or skills mapped to the active task.
Do not fall back to generic workflow behavior when the task already names the right skills.

### 3. Execute the task
- perform the repo work for the active task
- keep the work scoped to that task unless the strategy is updated
- if the task is blocked, stop and record the real blocking condition instead of silently broadening the work

### 4. Update task state
- mark the task as complete, in progress, or blocked based on what actually happened
- update the supporting artifacts if the task state, proof, or next-step guidance changed
- keep the strategy aligned with repo reality before stopping

## Output goal

Return a short execution result that says:
- which task was executed
- which Beagle skills were forced for it
- what changed in the repo
- whether the task is now complete, in progress, or blocked
- what the next task is, if known
