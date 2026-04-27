---
description: generate the visual Beagle strategy bundle for a repo and resolve it to one active task
---

# Generate Visual Strategy

You are creating the working Beagle strategy for a repo.

The goal is to make a browser-first strategy bundle that helps the next run move immediately into the right Beagle skills and one clear active task.

## Default approach

When the user does not narrow the request, assume:
- the current repo is the target
- the full visual strategy bundle is wanted
- AI coding agents are the main audience
- the primary output is a self-contained HTML strategy artifact with supporting markdown and JSON files
- the strategy should be practical enough to use in the next execution step, not just descriptive

## What to do

### 1. Inspect the repo
- inspect the repo and identify the important code, config, docs, and workflow surfaces
- refresh or derive repo-map artifacts if they are part of the current flow
- separate verified facts from inference
- prefer concrete paths, commands, tests, and repo realities over generic language

### 2. Classify the work
- identify the current scenario only as a routing step
- use that scenario to choose the Beagle skill or skills that should be forced before execution
- then collapse the strategy to exactly one active task
- make the task the main execution unit and phase only a sequencing boundary

### 3. Build the strategy bundle
Create a strategy bundle that makes these things easy to find:
- what this repo is trying to do with Beagle
- which scenario currently applies
- which Beagle skills are mapped to that scenario and active task
- which task is active right now
- what counts as done for that task
- what proof or checks should back that task up
- what the next task should be if the current one completes or blocks

### 4. Render useful artifacts
By default, generate the artifact bundle instead of answering with a long chat-only summary.

The strategy should feel like a working visual guide, not governance paperwork.
Keep it readable, direct, and easy to reopen later.

## Required output shape

The generated strategy should:
- name the current scenario
- promote exactly one active task
- map the required Beagle skill or skills to that active task
- make the task acceptance criteria easy to find
- make the next task easy to find
- keep supporting files aligned with the strategy HTML

## Delivery guidance

The bundle can include the existing supporting artifacts, but the HTML strategy should be the primary handoff surface.

Write the outputs so a later agent can:
- open the strategy
- see the current scenario
- see the forced Beagle skills
- execute the active task
- update task state
- continue to the next task

## Output goal

Generate the visual Beagle strategy bundle and return a short status note that names:
- what was generated
- where it lives
- which scenario was selected
- which active task was promoted
- which Beagle skills are now expected for that task
