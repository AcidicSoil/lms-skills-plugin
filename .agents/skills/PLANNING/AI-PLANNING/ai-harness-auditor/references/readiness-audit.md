# Readiness Audit

Use this mode to determine whether a repository is operationally ready for safe, controlled AI coding.

## Boundaries

- The agent executing this audit must not be the same agent session that defined or optimized the rules being audited in the current engagement. If it is, the audit conclusion lacks independence and a new session must be used.
- This skill audits whether structural prerequisites exist; it does not audit rule quality (contract mode) or execution evidence (verification mode).

## Goal

A ready repository should let AI reliably determine:

- whether it may change code
- what task it is executing
- what plan governs the task
- what validation gates must pass
- what review and remote validation rules apply
- what to do after failure
- how to recover context in a new session

## Hard Gates

If any gate is missing, the repository cannot be rated `Ready`. A missing gate caps the corresponding dimension at 4/10, regardless of how many gates within that dimension are missing. Two or more missing gates cap the overall rating at `Not Ready`; one missing gate caps it at `Partially Ready`. Dimension 6 (Context Recovery And Evolution) has no hard gate; a low score there affects the overall band through the dimension scoring rules only.

| Gate | Governing Dimension |
|---|---|
| 1. Unique rule entry | 1. Entry And Execution Boundaries |
| 2. Explicit phase or execution boundary | 1. Entry And Execution Boundaries |
| 3. Explicit task or plan mechanism | 2. Task And Plan System |
| 4. Explicit progress determination | 3. Progress And Traceability |
| 5. Explicit local gate | 4. Local Validation And Completion Definition |
| 6. Explicit task tracking and review rules | 5. Review And Remote Validation Loop |
| 7. Explicit remote validation path and failure loop | 5. Review And Remote Validation Loop |
| 8. Explicit AI coding boundary | 1. Entry And Execution Boundaries |
| 9. Explicit stop or rollback after failure | 4. Local Validation And Completion Definition |
| 10. Explicit completion backfill or delivery artifacts | 3. Progress And Traceability |

**Gate 8 — Explicit AI coding boundary:** The repository must have an explicit rule stating when AI may and may not modify code. A broad statement such as "follow the process" does not satisfy this gate. The boundary must be stated as a condition, not implied by convention.

**Required in audit output:** For every gate, report its status and cite the evidence. Use this format:

| Gate | Status | Evidence |
|---|---|---|
| 5. Explicit local gate | PRESENT | `docs/PHASE_DEVELOPMENT.md §4` — ordered gate commands defined |
| 8. Explicit AI coding boundary | MISSING | no explicit condition found in entry contract |

A `PRESENT` finding without an evidence citation is not acceptable. If the gate exists but the evidence cannot be located, treat it as `MISSING` and note the gap in Uncertainties.

## High-Risk Signals

Any of the following should materially downgrade the result:

- AI can bypass task or plan and change code directly
- AI can bypass validation and still claim completion
- AI can bypass review or remote checks
- AI cannot read or use failure results for repair
- AI can continue downstream work after a failed node
- temporary paths can bypass the main flow
- a new session cannot recover version, phase, task, and next step
- non-formal materials can override formal rules

## Scoring Dimensions

Score each dimension from `0-10`.

**Required in audit output:** Each dimension score must include:
- **Evidence**: the specific files and sections that support the score
- **Rationale**: one sentence connecting the evidence to the anchor band

Example:
```
Dimension 4 — Local Validation And Completion Definition: 9/10
Evidence: docs/PHASE_DEVELOPMENT.md §4 (gate commands), §6 (environment failure rule)
Rationale: gate commands are concrete and ordered; completion requires gate passage; environment failure triggers mandatory risk report
```

A score without evidence and rationale is not acceptable.

### 1. Entry And Execution Boundaries

Check:

- unique rule entry
- coding allowed or forbidden boundary
- destructive or high-risk action boundary

Scoring anchors:

- `0-2`: no unique entry, coding boundary undefined
- `3-5`: entry exists but not unique, or AI coding boundary relies on convention rather than explicit rule
- `6-8`: unique entry, coding and high-risk action boundaries are mostly explicit
- `9-10`: unique and unambiguous entry, all boundaries explicit, executable, requiring no inference

### 2. Task And Plan System

Check:

- task carrier exists
- plan carrier exists
- status model exists
- current task and next step can be uniquely determined

Scoring anchors:

- `0-2`: no task or plan carrier, current task cannot be determined
- `3-5`: carriers exist but status model is incomplete, or current task requires inference
- `6-8`: task and plan carriers complete, current task and next step can be uniquely determined
- `9-10`: status model complete with explicit conflict resolution rules, no dependence on chat history

### 3. Progress And Traceability

Check:

- progress rule exists
- completion definition exists
- failure traces exist
- temporary or exception work has a bounded tracking path

Scoring anchors:

- `0-2`: no progress rule, no path for recording failure
- `3-5`: progress rule exists but completion definition is vague, or temporary work has no tracking path
- `6-8`: completion definition explicit, failures recorded, temporary work is bounded
- `9-10`: progress fully traceable, delivery artifact requirements explicit, exception paths bounded

### 4. Local Validation And Completion Definition

Check:

- local gates are defined
- validation commands are concrete
- completion claims require validation
- environment-related inability to validate has a required risk report
- evidence is expected, not implied

Scoring anchors:

- `0-2`: no local gate, completion can be self-declared
- `3-5`: gate exists but commands are not concrete, or no rule for when validation is not possible
- `6-8`: gate explicit and commands executable, completion claims require gate passage
- `9-10`: gate complete, evidence requirements explicit, environment failure triggers mandatory risk report

### 5. Review And Remote Validation Loop

Check:

- issue or ticket and review carrier binding
- remote validation must-pass definition
- local and remote validation relationship
- failure result reading entry
- repair and re-validation path
- prohibition on claiming completion before checks pass

Scoring anchors:

- `0-2`: no review or remote validation requirement
- `3-5`: review exists but not bound to task, or no repair path after failure
- `6-8`: review and remote validation explicitly bound to task, failure has repair and re-validation path
- `9-10`: full loop explicitly defined end-to-end, completion before checks pass is explicitly prohibited, and repair path is documented rather than implied

### 6. Context Recovery And Evolution

Check:

- new sessions can recover phase, task, next step, and version
- rules do not depend on chat history
- versioned evolution path is explicit
- mutable vs immutable documents are distinguishable

Scoring anchors:

- `0-2`: new session cannot recover current state, depends on chat history
- `3-5`: partial recovery possible, but version or next step is ambiguous
- `6-8`: new session can uniquely determine phase, task, next step, and version
- `9-10`: fully stateless recovery, rules have a versioned evolution path, mutable and immutable documents are distinguishable

## Rating Bands

- `Not Ready`: 2 or more Hard Gates missing, or 2 or more dimensions below 4/10
- `Partially Ready`: 1 Hard Gate missing, or all Hard Gates present but one or more structural gaps exist, or 1-2 dimensions in the 4-5 range
- `Ready`: all Hard Gates satisfied, all dimensions at 6/10 or above, no High-Risk Signal triggered
- `Strongly Ready`: all dimensions at 8/10 or above, Dimension 6 at 9/10 or above, no High-Risk Signal triggered

## Structural vs Operational Gap

Distinguish between two types of gaps before scoring.

**Structural gap:** the mechanism does not exist — no rule defines it, AI finds no entry point.
Examples: no task carrier defined, no gate definition anywhere in the repository.
Effect: triggers Hard Gate failure, caps the corresponding dimension at 4/10, and caps overall rating per the Hard Gates section (1 missing gate → `Partially Ready` max; 2 or more missing gates → `Not Ready` max).

**Operational gap:** the mechanism exists but in its current state AI cannot use it effectively.
Examples: task carrier exists but is structured such that the current task cannot be uniquely determined; gate command defined but points to a non-existent script.
Effect: recorded as a finding, lowers the affected dimension score, does not trigger Hard Gate failure.

**Readiness does not judge:**

- Whether mechanisms have been executed or evidenced — that is `verification` mode.
- Whether rules are well-written, clear, or redundant — that is `contract` mode.

**Default:** If missing evidence prevents distinguishing structural from operational gap, treat as structural gap and note the assumption explicitly in the Uncertainties section.

## Output Requirements

Always provide:

1. Audit Scope
2. Evidence Basis
3. Scoring — for each Hard Gate: PRESENT/MISSING with file+section citation; for each dimension: score, evidence, and rationale
4. Conclusion
5. High-Risk Findings
6. Recommendations
7. Uncertainties

Recommendations should prioritize the smallest changes that restore a stable AI coding loop.
