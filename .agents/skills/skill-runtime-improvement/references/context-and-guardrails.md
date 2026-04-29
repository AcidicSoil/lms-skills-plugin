# Context and Guardrails

Use this guide when skill runtime changes could overload context, hang the model, or expose unsafe tools.

## Context Budget Rules

- Do not inject all installed skills.
- Use metadata/frontmatter for discovery.
- Cap routed candidates, commonly at 3.
- Keep no-route output to a compact reminder.
- Expand full instructions only for explicit activation or selected skills.
- Log injection size and a short hash so behavior can be audited.

## Tool Schemas

Every model-callable tool needs strict input validation:

| Input | Required constraints |
|---|---|
| skill name | length, trimmed, no control chars, no path traversal |
| file path | relative only, no absolute path, no `..` escape |
| command | single line, max length, no control chars |
| environment target | enum only |
| timeout | integer range |
| env vars | safe identifiers, value size limit, count limit |

Schema validation is not enough. Keep runtime path checks and command safety checks as defense-in-depth.

## Timeouts and Aborts

Add request-level budgets for every tool boundary. Propagate `AbortSignal` through path resolution, scanning, file reads, and subprocess execution. Abort should return a structured timeout result or rethrow when required by the host runtime.

Keep prompt-preprocessor timeouts short because preprocessing blocks the model from responding. Tool timeouts can be longer, but they should still fail closed.

## Command Safety

Command execution should be disabled by default. If enabled, prefer modes:

1. Disabled — no shell execution.
2. Read-only — allow inspection commands only.
3. Guarded — broader commands with destructive/network/package-manager patterns blocked.

A policy guard is not a sandbox. For stronger isolation, use an OS-level sandbox, locked-down container, VM, or WSL environment with read-only mounts, no network, and resource limits.
