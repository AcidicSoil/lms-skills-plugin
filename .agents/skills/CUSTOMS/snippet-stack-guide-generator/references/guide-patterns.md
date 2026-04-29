# Guide Patterns

Use these patterns to make snippet-stack documentation readable and reusable.

## Core Sections

| Section | Purpose |
|---|---|
| Purpose | State what problem the stack solves |
| Start Here | Fast routing for new users |
| Snippet Inventory | Short reference for every snippet |
| Canonical Flows | Ordered paths users can copy |
| Examples | Copy-paste invocations |
| Stop Rules | When an agent must pause |
| Compatibility Notes | Legacy aliases and migration notes |
| Handoff | What state to preserve after a run |

## Diagram Choices

| Diagram | Use When |
|---|---|
| Flowchart | Users must choose between modes |
| Sequence diagram | Multiple actors or verification loops matter |
| Mind map | The stack has many related snippet families |
| State diagram | Stop/continue transitions are central |

## Writing Rules

- Use exact snippet names in code formatting.
- Put default recommendations before alternatives.
- Keep each snippet entry short.
- Use tables for dense routing rules.
- Include one minimal example per major mode.
- Avoid implementation detail unless it affects user behavior.
- Use Mermaid diagrams only when they reduce ambiguity.
