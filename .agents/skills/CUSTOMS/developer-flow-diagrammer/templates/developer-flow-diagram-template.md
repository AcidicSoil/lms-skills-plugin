# [Workflow Name] Diagrams

## Purpose

State what workflow these diagrams clarify and who should use them.

## Source Basis

- Source notes/docs reviewed:
- Assumptions:
- Unknowns:

## Routing Decision Tree

Use this when the reader needs to choose a path.

```mermaid
flowchart TD
    A[Start] --> B{Primary decision?}
    B -->|Option 1| C[Path 1]
    B -->|Option 2| D[Path 2]
    C --> E[Verify]
    D --> E
```

## Interaction Sequence

Use this when multiple actors or tools pass control.

```mermaid
sequenceDiagram
    participant U as User
    participant A as Agent
    participant S as System
    participant V as Verification
    U->>A: Request
    A->>S: Inspect or execute
    A->>V: Verify
    V-->>A: Evidence
    A-->>U: Result and handoff
```

## Lifecycle / State Model

Use this when status changes or stop rules matter.

```mermaid
stateDiagram-v2
    [*] --> Ready
    Ready --> Running
    Running --> Verifying
    Verifying --> Done: pass
    Verifying --> Blocked: unsafe or unavailable
    Verifying --> Repairing: fixable failure
    Repairing --> Verifying
    Done --> [*]
```

## Diagram Notes

| Diagram | What It Shows | How to Use It |
|---|---|---|
| Routing Decision Tree | Path selection | Start here for mode choice |
| Interaction Sequence | Actor/tool order | Use for implementation flow |
| Lifecycle / State Model | Status transitions | Use for stop/continue rules |

## Maintenance Rules

- Update diagrams when workflow order, actors, stop rules, or verification gates change.
- Keep node labels short and action-oriented.
- Split diagrams before they become dense.
- Keep assumptions outside the diagram unless they are part of the public workflow.
