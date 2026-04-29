# Diagram Patterns

Use diagrams only when they reduce ambiguity.

## Decision Tree

Best for choosing a workflow, command, or snippet.

```mermaid
flowchart TD
    A[User wants to run workflow] --> B{Condition?}
    B -->|Yes| C[Use primary path]
    B -->|No| D[Use fallback path]
```

## Sequence Diagram

Best for showing actor/system order.

```mermaid
sequenceDiagram
    participant U as User
    participant W as Workflow
    participant R as Repo or Source
    participant V as Verification

    U->>W: Start workflow
    W->>R: Inspect evidence
    W->>W: Select next slice
    W->>V: Verify result
    V-->>W: Pass or fail
    W-->>U: Handoff summary
```

## Mind Map

Best for showing categories and relationships.

```mermaid
mindmap
  root((Workflow Stack))
    Manual
      Checkpointed run
      User approval
    Autonomous
      Budgeted continuation
      Stop conditions
    Support
      Verify
      Audit
      Handoff
```

## Flow Diagram Checklist

Before adding a diagram, verify:

1. It answers a routing, order, ownership, or taxonomy question.
2. Labels are user-facing, not implementation-internal.
3. The diagram matches the prose steps exactly.
4. Mermaid syntax is copy-pasteable.
5. The same information is not already clearer as a table.

## Diagram Placement

- Put routing diagrams before detailed flows.
- Put sequence diagrams after the user understands the selected path.
- Put mind maps after inventory/reference sections.
- Avoid more than three diagrams in a single README unless the workflow is complex.
