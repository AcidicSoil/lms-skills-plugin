# Logging and Verification

Use this guide when logs prove only that code ran but not what the model actually received or why it acted that way.

## Useful Log Events

Default logs should be human-readable and focused on interaction boundaries:

| Event | What to include |
|---|---|
| route decision | mode, selected skills, scores, confidence, reasons |
| explicit activation | tokens, resolved/unresolved skills, expansion count |
| context injection | kind, injected characters, hash, preview, payload hash |
| expanded skill proof | name, source path, byte count, body hash, short preview |
| tool result | tool, target skill/path, elapsed time, success/error |
| timeout/abort | boundary, budget, elapsed time, structured result |

Verbose JSON traces should be opt-in. Default logs should let a maintainer answer: what was injected, why, and what the model was expected to do.

## Verification Matrix

Add smoke tests for these cases:

1. Explicit `$example-skill` expands before model reasoning.
2. Shell variables such as `$HOME` are ignored as skill tokens.
3. Explicit payload removes the skill token but preserves user payload.
4. Routed prompt injects only capped candidates.
5. No confident route injects only a compact reminder.
6. Disabled skills are hidden from auto-routing but still explicit-invocable if policy allows.
7. Invalid schema inputs are rejected before runtime logic.
8. Tool timeouts return structured failure instead of hanging.
9. Command execution defaults to disabled.
10. README and onboarding memory match the implemented behavior.

## Response Standard

For each runtime improvement, report:

- root cause or design gap,
- behavior before and after,
- changed files,
- validation command and result,
- remaining risk or required manual integration test.
