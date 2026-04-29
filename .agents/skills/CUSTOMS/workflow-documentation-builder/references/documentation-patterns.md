# Documentation Patterns

Use these patterns to structure workflow documentation.

## Single Workflow

Use when there is one canonical path.

```text
Purpose
Prerequisites
Inputs
Ordered Steps
Verification
Outputs
Troubleshooting
```

## Multi-Mode Workflow

Use when users must choose among modes, snippets, commands, or tools.

```text
Purpose
Start Here
Mode Comparison Table
Decision Tree
Mode 1 Flow
Mode 2 Flow
Mode 3 Flow
Shared Verification
Risks and Edge Cases
Examples
```

## Snippet or Prompt Stack

Use when documenting reusable prompt snippets or agent commands.

```text
Purpose
Canonical Snippet Inventory
Which Snippet Do I Use?
Ordering Rules
Checkpointed Flow
Autonomous Flow
Support Snippets
Invocation Examples
Stop Conditions
Handoff Format
```

## Recommended Repo Layout

```text
docs/
  <topic>/
    README.md
    workflow-user-flow.md
    reference.md
    examples/
      first-run.md
      advanced-run.md
      handoff.md
```

## Section Rules

| Section | Include When | Content |
|---|---|---|
| Start Here | Multiple entry points exist | Short routing path for new users |
| Mode table | Modes/tools/snippets vary by context | Use case, trigger, primary command/snippet |
| Decision tree | Routing depends on user/repo state | Mermaid `flowchart TD` |
| Sequence diagram | Actors or systems interact over time | Mermaid `sequenceDiagram` |
| Mind map | Concepts need a taxonomy | Mermaid `mindmap` |
| Examples | Users invoke a command, snippet, or prompt | Copy-pasteable blocks |
| Stop conditions | Workflow can continue autonomously | Explicit blocking and non-blocking cases |

## Assumption Handling

State assumptions near the top only when they materially affect routing or correctness. Keep implementation guesses out of canonical flow sections.
