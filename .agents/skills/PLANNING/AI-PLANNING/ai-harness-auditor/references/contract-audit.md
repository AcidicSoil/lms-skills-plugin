# Contract Audit

Use this mode to evaluate whether a repository's AI collaboration contract is clear, convergent, executable, non-redundant, and unambiguous.

## Goal

A strong contract should let an auditor answer, from repository evidence and without guesswork:

- what the authoritative rule source is
- what is allowed, forbidden, required, and exceptional
- when development is allowed
- what determines the current phase, task, and next step
- what happens after failure
- how overrides are authorized and bounded

This mode audits the contract as an execution system, not as prose quality.

## Evidence Rules

Use only materials the repository treats as formal authority.

Typical formal sources may include:

- top-level AI contract
- phase or execution rules
- development rules
- issue / PR rules
- progress rules
- verification or CI rules

Do not treat templates, examples, notes, or informal comments as formal contract unless the repository explicitly says they are authoritative.

If evidence is missing, conflicting, or incomplete:

- report it explicitly
- lower the affected score
- reflect the gap in the conclusion

Do not invent repository-specific rules from general best practices.

## Minimum Questions

The contract should allow a uniquely grounded answer to these questions:

1. What source has final authority?
2. What work is permitted now?
3. What must be true before coding starts?
4. What determines the current phase?
5. What determines the current task and next step?
6. What happens if a gate or verification step fails?
7. How are exceptions or overrides approved and constrained?

If multiple questions cannot be answered uniquely, the contract is not strong.

## Structural vs Live-State Defects

Distinguish carefully between:

- structural contract defects: the rules do not define authority, gates, pointer semantics, or recovery behavior clearly enough
- live-state defects: the rules are clear, but the repository's current progress or plan documents are stale, inconsistent, or poorly maintained

Treat structural defects as stronger evidence against `Convergence`, `Executability`, and `Unambiguity`.

Treat live-state defects as confirmed findings, but do not automatically downgrade the entire contract as if the rule itself were missing. If the contract clearly defines how current state should be represented, but the repository's present documents fail to follow that rule, prefer lowering the affected dimensions rather than assuming the contract itself lacks structure.

## Quick Failure Signals

If any of the following is present, the contract cannot be rated above `Usable` unless strong counter-evidence clearly limits the impact:

1. No unique formal entry contract
2. No stable authority hierarchy across rule documents
3. Phase boundary cannot be uniquely determined
4. Development preconditions cannot be uniquely determined
5. Current task or next step cannot be uniquely determined because the contract lacks a canonical pointer rule or tie-break rule
6. Failure has no explicit stop, rollback, or recovery entry
7. Non-formal documents are required in practice to interpret formal rules
8. The same rule appears in multiple places with materially inconsistent wording
9. Overrides exist but have no defined scope, priority, or approval rule
10. Completion can be claimed without explicit gates passing

If 3 or more Quick Failure Signals are confirmed, strongly prefer `Weak`.

Do not trigger signal 5 solely because the current repository state looks stale or inconsistent. Trigger it when the contract lacks a clear rule for resolving current-task or next-step authority.

## Scoring Dimensions

Score each dimension from `0-10`.

### 1. Clarity

Check whether the contract clearly distinguishes:

- allowed work
- forbidden work
- required actions
- exceptions
- development vs non-development behavior
- failure behavior
- output or reporting requirements when relevant

Scoring anchors:

- `0-2`: core rules are vague or mixed together
- `3-5`: important distinctions remain implicit
- `6-8`: most operational distinctions are explicit and usable
- `9-10`: rules are crisp and leave little interpretive drift

### 2. Convergence

Check whether the contract gives one authoritative answer rather than multiple competing answers.

Check:

- unique formal entry
- clear authority hierarchy
- separation of rule sources by responsibility
- prevention of templates, notes, and examples becoming de facto authority
- one authoritative answer for the same operational question

Scoring anchors:

- `0-2`: authority is fragmented or conflicting
- `3-5`: authority exists but practical drift is likely
- `6-8`: authority is mostly centralized and stable
- `9-10`: authority is explicit, singular, and resistant to drift

### 3. Executability

Check whether a compliant actor can actually execute the workflow from the contract.

Check:

- startup or self-check steps
- explicit development preconditions
- explicit execution order where needed
- explicit gate behavior
- rollback or recovery entry after failure
- explicit prohibition on claiming completion before gates pass

Scoring anchors:

- `0-2`: contract is descriptive but not operational
- `3-5`: some execution path exists, but sequencing or failure handling is unclear
- `6-8`: workflow is operational with manageable gaps
- `9-10`: workflow is directly executable with clear gates and recovery behavior

### 4. Redundancy Control

Check whether the contract avoids duplication that can cause drift.

Check:

- repeated expansion of the same gate or phase rule
- repeated definitions of task, version, phase, or override behavior
- explanatory sections that add wording but no new constraint
- opportunities to replace repeated rule text with reference
- whether repeated text stays materially consistent

Scoring anchors:

- `0-2`: duplication is widespread and destabilizing
- `3-5`: duplication is noticeable and creates maintenance risk
- `6-8`: some duplication exists but is mostly controlled
- `9-10`: duplication is minimal and low-risk

### 5. Unambiguity

Check whether key operational decisions can be made uniquely.

Check:

- unique phase determination
- unique task determination
- unique version-selection rule where relevant
- bounded exception paths
- explicit override format or constraints
- clear tie-break behavior when rules interact

Scoring anchors:

- `0-2`: multiple reasonable interpretations exist for key decisions
- `3-5`: some key decisions still require judgment calls
- `6-8`: most decisions can be made uniquely from the text
- `9-10`: key decisions are deterministically grounded by the contract

## Cross-Dimension Rules

Apply these constraints during scoring:

- Do not give high `Executability` if phase, task, or preconditions are not uniquely grounded
- Do not give high `Convergence` if multiple documents can answer the same question differently
- Do not give high `Unambiguity` if override behavior is underspecified
- Do not reward repetition as clarity
- If a conclusion depends on inference rather than direct evidence, cap the affected dimension at `6/10` unless the repository explicitly authorizes that inference path
- If live repository state is inconsistent but the governing rule is explicit, score the contract rule and the live-state drift separately; do not automatically treat state drift as proof that the contract lacks authority structure

## Strength Protection

A better contract is shorter and sharper without becoming weaker.

A proposed simplification is only valid if it:

- reduces duplication without reducing gate strength
- preserves execution boundaries
- keeps exceptions explicit and narrow
- preserves the repository's authority structure
- does not move formal rules into informal documents

## Rating Bands

Use exactly one overall band:

- `Weak`: major ambiguity, authority drift, or non-executable workflow
- `Usable`: workable, but exposed to split interpretation or recovery gaps
- `Strong`: clear and mostly convergent, with limited ambiguity and manageable duplication
- `Robust`: highly clear, highly convergent, directly executable, and resistant to drift

Prefer:

- `Weak` when multiple Minimum Questions cannot be answered uniquely, or when authority and execution boundaries are not structurally grounded
- `Usable` when the workflow is workable but still depends on interpretation, or when live-state drift materially weakens handoff safety
- `Strong` when authority, execution flow, and failure behavior are mostly grounded, even if some current-state documents are stale or inconsistent
- `Robust` only when both authority structure and operational determinism are strongly evidenced

## Output Requirements

Always provide:

1. Audit Scope
2. Evidence Basis
3. Scoring
4. Conclusion
5. High-Risk Findings
6. Recommendations
7. Uncertainties

Recommendations should prioritize:

- collapsing duplicate rule text
- restoring a single authority source
- tightening ambiguous preconditions
- making rollback and completion conditions explicit
- constraining override format and scope
