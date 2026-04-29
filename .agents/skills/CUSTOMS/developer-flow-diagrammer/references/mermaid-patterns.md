# Mermaid Patterns

Use these compact patterns for developer workflow documentation.

## Decision Flowchart

```mermaid
flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Path A]
    B -->|No| D[Path B]
    C --> E[Verify]
    D --> E
```

Best for: routing tables, mode selection, and “which tool do I use?” docs.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant R as Repo
    participant V as Verification
    U->>A: Request workflow
    A->>R: Inspect evidence
    A->>R: Apply change
    A->>V: Run checks
    V-->>A: Pass or fail
    A-->>U: Handoff summary
```

Best for: agent/tool/repo interactions, implementation loops, and verification paths.

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> Planned
    Planned --> Executing
    Executing --> Verifying
    Verifying --> Complete: checks pass
    Verifying --> Repairing: checks fail
    Repairing --> Verifying
    Complete --> [*]
```

Best for: lifecycle, retry, stop/continue, and status semantics.

## Mind Map

```mermaid
mindmap
  root((Workflow))
    Mode A
      Step 1
      Step 2
    Mode B
      Step 3
      Step 4
```

Best for: inventories and conceptual maps. Do not use mind maps for strict ordering.
