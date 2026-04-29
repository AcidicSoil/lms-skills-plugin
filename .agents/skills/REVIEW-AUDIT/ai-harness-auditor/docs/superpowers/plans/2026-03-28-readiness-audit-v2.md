# Readiness Audit v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `references/readiness-audit.md` to match the structural maturity of `contract-audit.md` v2, and do minor cleanup of `SKILL.md`.

**Architecture:** Pure text edits to two reference files. No code, no tests. Each task is a focused edit to one section, followed by a read verification and a commit. Tasks are independent and can be done in order without skipping.

**Tech Stack:** Markdown, git

---

### Task 1: Add Boundaries section (author/auditor separation)

**Files:**
- Modify: `references/readiness-audit.md`

- [ ] **Step 1: Add Boundaries section after the opening line**

The file currently starts with `# Readiness Audit` then `## Goal`. Insert a new `## Boundaries` section between them with this exact content:

```markdown
## Boundaries

- The agent executing this audit must not be the agent that recently defined or optimized the rules of the repository being audited. If it is, the audit conclusion lacks independence and a new session must be used.
- This skill audits whether structural prerequisites exist; it does not audit rule quality (contract mode) or execution evidence (verification mode).
```

The file should now read:

```markdown
# Readiness Audit

Use this mode to determine whether a repository is operationally ready for safe, controlled AI coding.

## Boundaries

- The agent executing this audit must not be the agent that recently defined or optimized the rules of the repository being audited. If it is, the audit conclusion lacks independence and a new session must be used.
- This skill audits whether structural prerequisites exist; it does not audit rule quality (contract mode) or execution evidence (verification mode).

## Goal
...
```

- [ ] **Step 2: Verify the edit**

Read `references/readiness-audit.md` lines 1-20 and confirm:
- `## Boundaries` appears before `## Goal`
- Both bullet points are present and match the text above exactly

- [ ] **Step 3: Commit**

```bash
git add references/readiness-audit.md
git commit -m "feat(readiness): add Boundaries section with author/auditor separation rule"
```

---

### Task 2: Restructure Hard Gates with dimension mapping and Gate #8 clarification

**Files:**
- Modify: `references/readiness-audit.md`

- [ ] **Step 1: Replace the Hard Gates section**

Find and replace the entire `## Hard Gates` section. Current content:

```markdown
## Hard Gates

If any item is missing, the repository cannot be rated `Ready`:

1. Unique rule entry
2. Explicit phase or execution boundary
3. Explicit task or plan mechanism
4. Explicit progress determination
5. Explicit local gate
6. Explicit task tracking and review rules
7. Explicit remote validation path and failure loop
8. Explicit AI coding boundary
9. Explicit stop or rollback after failure
10. Explicit completion backfill or delivery artifacts
```

Replace with:

```markdown
## Hard Gates

If any gate is missing, the repository cannot be rated `Ready`. A missing gate caps the corresponding dimension at 4/10. Two or more missing gates cap the overall rating at `Not Ready`; one missing gate caps it at `Partially Ready`.

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
```

- [ ] **Step 2: Verify the edit**

Read the Hard Gates section and confirm:
- The table is present with all 10 gates and their dimension mappings
- The cap rule (2+ missing → Not Ready, 1 missing → Partially Ready) is stated
- Gate 8 clarification paragraph is present

- [ ] **Step 3: Commit**

```bash
git add references/readiness-audit.md
git commit -m "feat(readiness): add dimension mapping and Gate 8 clarification to Hard Gates"
```

---

### Task 3: Add scoring anchors to each dimension

**Files:**
- Modify: `references/readiness-audit.md`

- [ ] **Step 1: Add anchors to Dimension 1**

Find the Dimension 1 block:

```markdown
### 1. Entry And Execution Boundaries

Check:

- unique rule entry
- coding allowed or forbidden boundary
- destructive or high-risk action boundary
```

Append scoring anchors after the check list:

```markdown
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
```

- [ ] **Step 2: Add anchors to Dimension 2**

Find the Dimension 2 block and append:

```markdown
Scoring anchors:

- `0-2`: no task or plan carrier, current task cannot be determined
- `3-5`: carriers exist but status model is incomplete, or current task requires inference
- `6-8`: task and plan carriers complete, current task and next step can be uniquely determined
- `9-10`: status model complete with explicit conflict resolution rules, no dependence on chat history
```

- [ ] **Step 3: Add anchors to Dimension 3**

Find the Dimension 3 block and append:

```markdown
Scoring anchors:

- `0-2`: no progress rule, no path for recording failure
- `3-5`: progress rule exists but completion definition is vague, or temporary work has no tracking path
- `6-8`: completion definition explicit, failures recorded, temporary work is bounded
- `9-10`: progress fully traceable, delivery artifact requirements explicit, exception paths bounded
```

- [ ] **Step 4: Add anchors to Dimension 4**

Find the Dimension 4 block and append:

```markdown
Scoring anchors:

- `0-2`: no local gate, completion can be self-declared
- `3-5`: gate exists but commands are not concrete, or no rule for when validation is not possible
- `6-8`: gate explicit and commands executable, completion claims require gate passage
- `9-10`: gate complete, evidence requirements explicit, environment failure triggers mandatory risk report
```

- [ ] **Step 5: Add anchors to Dimension 5**

Find the Dimension 5 block and append:

```markdown
Scoring anchors:

- `0-2`: no review or remote validation requirement
- `3-5`: review exists but not bound to task, or no repair path after failure
- `6-8`: review and remote validation explicitly bound to task, failure has repair and re-validation path
- `9-10`: full loop, completion before checks pass is explicitly prohibited, repair path is explicit
```

- [ ] **Step 6: Add anchors to Dimension 6**

Find the Dimension 6 block and append:

```markdown
Scoring anchors:

- `0-2`: new session cannot recover current state, depends on chat history
- `3-5`: partial recovery possible, but version or next step is ambiguous
- `6-8`: new session can uniquely determine phase, task, and next step
- `9-10`: fully stateless recovery, rules have a versioned evolution path, mutable and immutable documents are distinguishable
```

- [ ] **Step 7: Verify all six dimensions have anchors**

Read the full Scoring Dimensions section and confirm each of the 6 dimensions ends with a `Scoring anchors:` block containing four bullet points.

- [ ] **Step 8: Commit**

```bash
git add references/readiness-audit.md
git commit -m "feat(readiness): add scoring anchors to all six dimensions"
```

---

### Task 4: Replace Rating Bands with judgment rules

**Files:**
- Modify: `references/readiness-audit.md`

- [ ] **Step 1: Replace the Rating Bands section**

Find the current `## Rating Bands` section:

```markdown
## Rating Bands

- `Not Ready`
- `Partially Ready`
- `Ready`
- `Strongly Ready`
```

Replace with:

```markdown
## Rating Bands

- `Not Ready`: 2 or more Hard Gates missing, or 2 or more dimensions below 4/10
- `Partially Ready`: 1 Hard Gate missing, or all Hard Gates present but one or more structural gaps exist, or 1-2 dimensions in the 4-5 range
- `Ready`: all Hard Gates satisfied, all dimensions at 6/10 or above, no High-Risk Signal triggered
- `Strongly Ready`: all dimensions at 8/10 or above, context recovery complete, no High-Risk Signal triggered
```

- [ ] **Step 2: Verify the edit**

Read the Rating Bands section and confirm all four bands have explicit conditions and match the text above exactly.

- [ ] **Step 3: Commit**

```bash
git add references/readiness-audit.md
git commit -m "feat(readiness): replace bare rating band list with explicit judgment rules"
```

---

### Task 5: Add Structural vs Operational Gap section

**Files:**
- Modify: `references/readiness-audit.md`

- [ ] **Step 1: Add new section before Output Requirements**

Find the `## Output Requirements` heading. Insert a new section immediately before it:

```markdown
## Structural vs Operational Gap

Distinguish between two types of gaps before scoring.

**Structural gap:** the mechanism does not exist — no rule defines it, AI finds no entry point.
Examples: no task carrier defined, no gate definition anywhere in the repository.
Effect: triggers Hard Gate failure, caps the corresponding dimension at 4/10, caps overall rating at `Partially Ready`.

**Operational gap:** the mechanism exists but in its current state AI cannot use it effectively.
Examples: task carrier exists but is structured such that the current task cannot be uniquely determined; gate command defined but points to a non-existent script.
Effect: recorded as a finding, lowers the affected dimension score, does not trigger Hard Gate failure.

**Readiness does not judge:**

- Whether mechanisms have been executed or evidenced — that is `verification` mode.
- Whether rules are well-written, clear, or redundant — that is `contract` mode.

**Default:** If missing evidence prevents distinguishing structural from operational gap, treat as structural gap and note the assumption explicitly in the Uncertainties section.
```

- [ ] **Step 2: Verify the edit**

Read the section and confirm:
- Both gap types are defined with examples and effects
- The two explicit exclusions (verification, contract) are present
- The default rule is present
- The section appears before `## Output Requirements`

- [ ] **Step 3: Commit**

```bash
git add references/readiness-audit.md
git commit -m "feat(readiness): add Structural vs Operational Gap section"
```

---

### Task 6: Minor SKILL.md cleanup

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Replace the Output Contract section with a reference**

Find the `## Output Contract` section in `SKILL.md`:

```markdown
## Output Contract

Always structure the result as:

1. Audit Scope
2. Evidence Basis
3. Scoring
4. Conclusion
5. High-Risk Findings
6. Recommendations
7. Uncertainties

Rules:

- Give one primary conclusion only.
- Separate confirmed findings from uncertainties.
- Do not hide missing evidence inside recommendations.
- Prefer high-signal findings over exhaustive restatement.
- When a conclusion depends on inference, mark it clearly as an inference.
- When repository materials conflict, describe the conflict before scoring downstream impact.
```

Replace with:

```markdown
## Output Contract

See `references/output-templates.md` for the required output structure, scoring format, and section rules.

Additional rule: when repository materials conflict, describe the conflict before scoring downstream impact.
```

- [ ] **Step 2: Add mode sequencing note to the Mode Selection section**

Find the Mode Selection section. After the `If the user does not specify a mode...` sentence, add:

```markdown
When uncertain where to start, prefer this order: `contract` first, then `readiness`, then `verification`. Each mode builds on the assurances of the prior one.
```

- [ ] **Step 3: Verify both edits**

Read `SKILL.md` and confirm:
- The Output Contract section is now 3 lines (reference + blank + conflict rule)
- The mode sequencing note appears in the Mode Selection section

- [ ] **Step 4: Commit**

```bash
git add SKILL.md
git commit -m "chore: remove redundant output contract from SKILL.md, add mode sequencing note"
```

---

## Self-Review

**Spec coverage:**
1. New Boundary (author/auditor separation) → Task 1 ✓
2. Hard Gates → Dimension mapping + Gate #8 clarification → Task 2 ✓
3. Scoring anchors for all 6 dimensions → Task 3 ✓
4. Rating Bands judgment rules → Task 4 ✓
5. Structural vs Operational Gap section → Task 5 ✓
6. SKILL.md cleanup → Task 6 ✓

**Placeholder scan:** No TBDs, no "implement later", no vague steps. All edit content is fully written out.

**Consistency check:** Rating Bands in Task 4 use "2 or more Hard Gates missing" for Not Ready and "1 Hard Gate missing" for Partially Ready — consistent with the cap rule written in Task 2 ("Two or more missing gates cap the overall rating at `Not Ready`; one missing gate caps it at `Partially Ready`"). No drift.
