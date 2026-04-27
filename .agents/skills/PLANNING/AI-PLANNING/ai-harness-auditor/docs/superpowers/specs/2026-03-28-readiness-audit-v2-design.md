# Readiness Audit v2 Design

Date: 2026-03-28

## Scope

Primary change: `references/readiness-audit.md`
Secondary change: `SKILL.md` (minor cleanup, no spec required)

Files not changed: `references/contract-audit.md`, `references/verification-audit.md`, `references/output-templates.md`

## Design Intent

Each mode in the ai-harness-auditor skill serves a strictly bounded purpose:

- `contract`: audits rule quality — clarity, convergence, executability, redundancy, unambiguity
- `readiness`: audits whether the structural prerequisites for safe AI coding exist
- `verification`: audits whether the workflow has been exercised and evidenced through real execution

readiness-audit.md must not bleed into contract or verification concerns. Every check, scoring anchor, and gap distinction must serve readiness's intent only.

## Changes

### 1. New Boundary: Author/Auditor Separation

Add to the Boundaries section in `references/readiness-audit.md`:

> The agent executing this audit must not be the agent that recently defined or optimized the rules of the repository being audited. If it is, the audit conclusion lacks independence and a new session must be used.

This mirrors the principle that code reviewers should not review their own PRs.

### 2. Hard Gates → Dimension Mapping

Each Hard Gate is annotated with its governing dimension. A missing gate caps the corresponding dimension at 4/10 and caps the overall rating at `Partially Ready`.

| Hard Gate | Dimension |
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

**Clarification of Hard Gate #8:**

> The repository must have an explicit rule stating when AI may and may not modify code. A broad statement such as "follow the process" does not satisfy this gate. The boundary must be stated as a condition, not implied by convention.

### 3. Scoring Anchors

Each dimension receives 0-2 / 3-5 / 6-8 / 9-10 anchors.

**Dimension 1: Entry And Execution Boundaries**
- `0-2`: no unique entry, coding boundary undefined
- `3-5`: entry exists but not unique, or AI coding boundary relies on convention rather than explicit rule
- `6-8`: unique entry, coding and high-risk action boundaries are mostly explicit
- `9-10`: unique and unambiguous entry, all boundaries explicit, executable, requiring no inference

**Dimension 2: Task And Plan System**
- `0-2`: no task or plan carrier, current task cannot be determined
- `3-5`: carriers exist but status model is incomplete, or current task requires inference
- `6-8`: task and plan carriers complete, current task and next step can be uniquely determined
- `9-10`: status model complete with explicit conflict resolution rules, no dependence on chat history

**Dimension 3: Progress And Traceability**
- `0-2`: no progress rule, no path for recording failure
- `3-5`: progress rule exists but completion definition is vague, or temporary work has no tracking path
- `6-8`: completion definition explicit, failures recorded, temporary work is bounded
- `9-10`: progress fully traceable, delivery artifact requirements explicit, exception paths bounded

**Dimension 4: Local Validation And Completion Definition**
- `0-2`: no local gate, completion can be self-declared
- `3-5`: gate exists but commands are not concrete, or no rule for when validation is not possible
- `6-8`: gate explicit and commands executable, completion claims require gate passage
- `9-10`: gate complete, evidence requirements explicit, environment failure triggers mandatory risk report

**Dimension 5: Review And Remote Validation Loop**
- `0-2`: no review or remote validation requirement
- `3-5`: review exists but not bound to task, or no repair path after failure
- `6-8`: review and remote validation explicitly bound to task, failure has repair and re-validation path
- `9-10`: full loop, completion before checks pass is explicitly prohibited, repair path is explicit

**Dimension 6: Context Recovery And Evolution**
- `0-2`: new session cannot recover current state, depends on chat history
- `3-5`: partial recovery possible, but version or next step is ambiguous
- `6-8`: new session can uniquely determine phase, task, and next step
- `9-10`: fully stateless recovery, rules have a versioned evolution path, mutable and immutable documents are distinguishable

### 4. Rating Bands — Judgment Rules

Replace the bare band list with explicit conditions:

- `Not Ready`: 2+ Hard Gates missing, or 2+ dimensions below 4/10
- `Partially Ready`: 1 Hard Gate missing, or all Hard Gates present but one or more structural gaps exist, or 1-2 dimensions in the 4-5 range
- `Ready`: all Hard Gates satisfied, all dimensions at 6/10 or above, no High-Risk Signal triggered
- `Strongly Ready`: all dimensions at 8/10 or above, context recovery complete, no High-Risk Signal triggered

### 5. Structural vs Operational Gap

Add a dedicated section:

**Structural gap**: the mechanism does not exist — no rule defines it, AI finds no entry point.
Example: no task carrier, no gate definition.
→ Triggers Hard Gate failure. Caps corresponding dimension at 4/10. Caps overall rating at `Partially Ready`.

**Operational gap**: the mechanism exists but in its current state AI cannot use it effectively.
Example: task carrier exists but is structured such that the current task cannot be uniquely determined; gate command defined but points to a non-existent script.
→ Recorded as a finding. Lowers the affected dimension score. Does not trigger Hard Gate failure.

**Explicit exclusions — readiness does not judge:**

> Whether the mechanisms have been executed or evidenced → `verification` mode.

> Whether the rules are well-written, clear, or redundant → `contract` mode.

**Default rule:** If missing evidence prevents distinguishing structural from operational gap, treat as structural gap and note the uncertainty explicitly in the Uncertainties section.
