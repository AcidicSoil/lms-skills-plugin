# Diagram Selection

Use the smallest diagram set that removes ambiguity from the workflow.

## Selection Table

| Need | Diagram | Use When |
|---|---|---|
| Choose a path | Flowchart | The user must pick between modes, tools, or next actions |
| Show interactions | Sequence diagram | Multiple actors, services, tools, or verification steps exchange control |
| Track lifecycle | State diagram | Status changes, retries, stop rules, or transitions matter |
| Organize concepts | Mind map | The source contains related families, categories, or feature areas |
| Show ownership | Swimlane-style flowchart | Handoffs between roles or systems are central |

## Extraction Checklist

Capture these before writing Mermaid:

- entry point and trigger
- actors or systems
- ordered steps
- decision points
- repeat loops
- stop conditions
- success criteria
- outputs and handoff state

## Split Rules

Split a diagram when it has more than 12 nodes, mixes user routing with system internals, or combines happy path with repair paths. Prefer one routing diagram plus one lifecycle or sequence diagram.

## Assumption Handling

If the source implies but does not state an edge, label it as an assumption in text rather than hiding it inside the diagram.
