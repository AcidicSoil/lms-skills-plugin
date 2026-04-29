---
name: two-pass-review-resolution-orchestrator
description: Coordinates a two-pass blind review and evidence-based resolution workflow. Use when orchestrating independent review, author response, finding classification, revised output validation, and final audit records across agents, sessions, or providers.
metadata:
  short-description: Orchestrate blind review, author resolution, and final audit traceability.
---

# Two-Pass Review Resolution Orchestrator

## Purpose

Coordinate a two-pass review process without performing the substantive review or author-side resolution directly.

This skill defines the workflow contract, artifacts, handoffs, naming conventions, gates, and pass/fail rules for:

1. Packaging the original task and candidate output for independent evaluation.
2. Sending only the review packet to a reviewer using the conceptual `blind-output-review` subskill.
3. Sending the resulting review report to the author for evidence-based resolution using the conceptual `review-response-resolution` subskill.
4. Emitting a final audit record that shows what changed, what stood, and why.

Use neutral role terms consistently:

- `author`
- `reviewer`
- `candidate_output`
- `review_report`
- `resolution_report`
- `final_audit`
- `finding`

Do not use model-comparison framing. Do not disclose or imply to the reviewer that a later response or resolution phase exists.

## Applicability

Use this skill when the task requires a structured, auditable review-and-resolution workflow for a completed or proposed output.

Applicable inputs include:

- Original task, prompt, ticket, or specification.
- Candidate answer, plan, patch, artifact, document, or design.
- Stated constraints, evidence, rubric, and acceptance criteria.
- A need to separate independent review from author-side resolution.
- A need to produce traceable final audit metadata.

Do not use this skill for:

- One-pass review only.
- Style-only critique with no acceptance criteria.
- Direct generation of the candidate output.
- Direct adjudication without a review report and resolution report.
- Open-ended debate loops with no final audit boundary.

## Quick start

1. Collect the source material into a `review_packet`.
2. Send only the `review_packet` to the `reviewer`.
3. Validate the returned `review_report` with `review_validity_gate`.
4. Send the original task, candidate output, constraints, evidence, and `review_report` to the `author`.
5. Require the `author` to classify every finding in a `resolution_report`.
6. Validate the resolution using all gates.
7. Emit `final_audit` and the final output.

Minimum orchestration sequence:

```text
review_packet
  -> reviewer using blind-output-review
  -> review_report
  -> review_validity_gate
  -> author using review-response-resolution
  -> resolution_report
  -> resolution_integrity_gate
  -> revision_gate
  -> traceability_gate
  -> scope_gate
  -> final_audit
```

Inputs
------

Collect or derive these fields. If a field is unavailable, set it to `Unknown`. If a required value must be supplied later, set it to `TODO`.

```
review_packet:
  source_task:
  candidate_output:
  constraints:
  evidence:
  rubric:
  acceptance_criteria:
```

### Input rules

*   Preserve the original task exactly where available.
*   Preserve the candidate output exactly where available.
*   Separate explicit constraints from inferred constraints.
*   Treat missing evidence as `Unknown`; do not invent evidence.
*   Treat missing rubric or acceptance criteria as `Unknown`; do not fabricate criteria.
*   If ambiguity exists, choose the most reasonable interpretation, state it in the relevant artifact, and continue.
*   If the candidate output is absent, stop before Phase 2 and emit a failure record with `candidate_output: TODO`.

Workflow
--------

### Phase 1 — Package Inputs

Create a `review_packet` with the following schema:

```
review_packet:
  source_task:
    content:
    source_reference:
    known_ambiguities:
  candidate_output:
    content:
    artifact_type:
    source_reference:
  constraints:
    explicit:
    inferred:
    unknown:
  evidence:
    provided:
    unavailable:
    evidence_limits:
  rubric:
    criteria:
    severity_scale:
    scoring_method:
  acceptance_criteria:
    required_outcomes:
    disallowed_outcomes:
    pass_conditions:
```

Packaging requirements:

*   Do not include author identity unless it is directly part of the source task and required for evaluation.
*   Do not include hidden preferred outcomes.
*   Do not include expected response behavior.
*   Do not include previous defenses or author commentary.
*   Do not include workflow internals beyond what the reviewer needs to evaluate independently.
*   Normalize only structure; do not rewrite substantive task requirements.

### Phase 2 — Blind Review

Send only the `review_packet` to the `reviewer`.

Invoke the conceptual `blind-output-review` subskill by instruction, not by assuming a specific runtime or provider.

The reviewer receives:

```
reviewer_input:
  review_packet:
```

The reviewer must not receive:

*   `author` identity.
*   Expected author response behavior.
*   Prior defenses.
*   Hidden preferred outcome.
*   Later workflow phase descriptions.
*   Resolution criteria not present in the review packet.
*   Any instruction implying the review will be challenged, defended, or adjudicated.

Required `review_report` schema:

```
review_report:
  verdict:
  score:
  findings:
    - id:
      severity:
      category:
      claim:
      evidence:
      requirement_reference:
      impact:
      recommended_resolution:
      confidence:
  subjective_improvements:
    - id:
      suggestion:
      rationale:
      non_blocking: true
  open_questions:
    - id:
      question:
      blocking:
      reason:
```

Review report requirements:

*   Every finding must be actionable.
*   Every major or blocker finding must cite evidence or a requirement reference.
*   Subjective improvements must be separated from objective findings.
*   Open questions must identify what information is missing.
*   The reviewer must not assume the `candidate_output` is correct.
*   The reviewer must not assume the `candidate_output` is incorrect.
*   The reviewer must judge only against the task, constraints, evidence, rubric, and acceptance criteria.

### Phase 3 — Response & Resolution

Send to the `author`:

```
author_input:
  source_task:
  candidate_output:
  constraints:
  evidence:
  review_report:
```

Invoke the conceptual `review-response-resolution` subskill by instruction, not by assuming a specific runtime or provider.

The author must classify every review finding using exactly one disposition:

*   `accepted`
*   `partially_accepted`
*   `rejected`
*   `needs_more_evidence`
*   `out_of_scope`

Required `resolution_report` schema:

```
resolution_report:
  final_disposition:
  finding_resolutions:
    - finding_id:
      disposition:
      rationale:
      evidence_used:
      change_made:
      revised_output_location:
      residual_risk:
  defended_original_decisions:
    - finding_id:
      rationale:
      evidence_used:
  accepted_changes:
    - finding_id:
      change_summary:
      output_location:
      requirement_or_evidence_reference:
  rejected_findings:
    - finding_id:
      rejection_reason:
      evidence_used:
  revised_output:
    content:
    changed:
    change_log:
  residual_risks:
    - risk:
      source:
      mitigation:
      owner:
```

Resolution requirements:

*   Classify every finding.
*   Give evidence for each rejected finding.
*   Give scope rationale for each `out_of_scope` finding.
*   Give missing-evidence rationale for each `needs_more_evidence` finding.
*   Reflect accepted blocker and major findings in the revised output unless explicitly impossible.
*   Preserve valid original decisions when the review finding is unsupported, subjective, or out of scope.
*   Avoid overcorrection that degrades the final answer.

### Phase 4 — Final Audit

Emit a `final_audit` bundle after all gates pass or fail.

Required `final_audit` schema:

```
final_audit:
  original_verdict:
  final_disposition:
  accepted_finding_count:
  rejected_finding_count:
  partially_accepted_count:
  unresolved_count:
  final_output_changed:
  change_summary:
    - source:
      change:
      traceability_reference:
  remaining_risks:
    - risk:
      source:
      severity:
      next_step:
  recommended_next_action:
```

Audit requirements:

*   Count dispositions from `resolution_report.finding_resolutions`.
*   Treat `needs_more_evidence` as unresolved unless resolved by additional evidence.
*   Treat missing finding classifications as gate failures.
*   Set `final_output_changed` to `true` only if `resolution_report.revised_output.changed` is true.
*   Every change in `change_summary` must map to a finding, user requirement, or explicit author-discovered defect.
*   Include pass/fail status for every gate.

Recommended final audit bundle:

```
final_audit_bundle:
  review_packet:
  review_report:
  resolution_report:
  gate_results:
    review_validity_gate:
    resolution_integrity_gate:
    revision_gate:
    traceability_gate:
    scope_gate:
  final_audit:
  final_output:
```

Handoff rules
-------------

### Reviewer handoff

Send:

```
reviewer_handoff:
  review_packet:
```

Do not send:

```
withheld_from_reviewer:
  author_identity:
  author_defenses:
  expected_author_response:
  final_audit_schema:
  resolution_dispositions:
  orchestration_notes:
  hidden_preferred_outcome:
```

Reviewer prompt contract:

```
Evaluate candidate_output strictly against source_task, constraints, evidence, rubric, and acceptance_criteria. Produce review_report only. Separate objective findings from subjective improvements. Do not assume correctness or incorrectness. Do not speculate beyond the packet.
```

### Author handoff

Send:

```
author_handoff:
  source_task:
  candidate_output:
  constraints:
  evidence:
  review_report:
```

Author prompt contract:

```
Resolve every finding in review_report by classifying it as accepted, partially_accepted, rejected, needs_more_evidence, or out_of_scope. For each classification, provide rationale and evidence. Revise the output only where justified by a finding, user requirement, or explicit author-discovered defect. Produce resolution_report.
```

### Audit handoff

Use the validated `review_report` and `resolution_report` to produce:

```
audit_handoff:
  original_verdict:
  final_disposition:
  finding_dispositions:
  revised_output:
  traceability_map:
  residual_risks:
```

Gates
-----

### 1. `review_validity_gate`

Reject the `review_report` if any of these are present:

*   Vague findings with no actionable claim.
*   Invented requirements not present in the source task, constraints, rubric, or acceptance criteria.
*   Unsupported major or blocker claims.
*   Objective and subjective issues mixed together without distinction.
*   Findings that lack evidence, requirement reference, or practical impact.
*   Review report focused only on style nitpicks when substantive acceptance criteria exist.
*   Verdict or score unsupported by the listed findings.

Pass conditions:

```
review_validity_gate:
  status: pass
  checks:
    actionable_findings: true
    no_invented_requirements: true
    supported_major_claims: true
    subjective_items_separated: true
    verdict_supported: true
```

Failure behavior:

*   Return the `review_report` for correction.
*   Do not proceed to author resolution until the gate passes.
*   If correction is impossible, emit `final_audit` with `final_disposition: review_invalid`.

### 2. `resolution_integrity_gate`

Reject the `resolution_report` if:

*   Any finding is unclassified.
*   Any finding uses a disposition outside the allowed set.
*   Rejected findings lack rationale.
*   Accepted findings lack change status.
*   Partially accepted findings do not state which part was accepted and which part was rejected.
*   `needs_more_evidence` findings do not state what evidence is missing.
*   `out_of_scope` findings do not state the scope boundary.

Pass conditions:

```
resolution_integrity_gate:
  status: pass
  checks:
    every_finding_classified: true
    dispositions_valid: true
    rationales_present: true
    change_status_present: true
```

Failure behavior:

*   Return the `resolution_report` for completion.
*   Do not emit a successful final audit while unresolved classifications remain.

### 3. `revision_gate`

Require accepted blocker or major findings to be reflected in the revised output.

Reject the revision if:

*   A blocker or major accepted finding has no corresponding change.
*   A partially accepted blocker or major finding lacks a clear partial remediation.
*   The revised output claims a fix that is not present.
*   The revised output removes correct content without justification.
*   The revision degrades compliance with the original task.

Pass conditions:

```
revision_gate:
  status: pass
  checks:
    accepted_blockers_reflected: true
    accepted_majors_reflected: true
    claimed_fixes_present: true
    no_unjustified_degradation: true
```

Failure behavior:

*   Return to the author for revision.
*   If no revision is possible, mark the relevant findings as residual risks.

### 4. `traceability_gate`

Every final change must map back to at least one of:

*   A `finding_id`.
*   A user requirement.
*   An explicit author-discovered defect.

Reject the final output if:

*   Any final change has no traceability reference.
*   The change log is missing.
*   The resolution claims a finding was addressed but the output location is absent or unverifiable.
*   Changes are justified only by preference without being marked subjective or optional.

Pass conditions:

```
traceability_gate:
  status: pass
  checks:
    all_changes_mapped: true
    change_log_present: true
    output_locations_present: true
```

Failure behavior:

*   Require a traceability map before final audit.
*   If traceability cannot be established, include the change as a residual risk or revert it.

### 5. `scope_gate`

Reject revisions that expand scope beyond the original task unless the expansion is explicitly justified.

Scope expansion examples:

*   Adding new deliverables not requested.
*   Introducing new assumptions not grounded in evidence.
*   Changing the task objective.
*   Adding external integrations, APIs, tools, commands, or runtime requirements not present in the source task.
*   Converting a correction into a broader redesign.

Pass conditions:

```
scope_gate:
  status: pass
  checks:
    no_unjustified_scope_expansion: true
    expansions_explicitly_justified: true
    original_task_preserved: true
```

Failure behavior:

*   Remove or isolate scope-expanded changes.
*   If retained, label the expansion explicitly and require justification in `final_audit.remaining_risks`.

Decision rules
--------------

### Finding severity handling

Use this default severity interpretation unless the review packet defines another scale:

| Severity | Meaning | Resolution requirement |
| --- | --- | --- |
| `blocker` | Prevents acceptance or violates a core requirement | Must be accepted, partially accepted with mitigation, or rejected with strong evidence |
| `major` | Material defect affecting correctness, completeness, safety, or usability | Must be resolved or defended with evidence |
| `minor` | Localized defect with limited impact | Resolve when useful; document rationale if rejected |
| `subjective` | Preference or optional improvement | Keep separate from objective findings |
| `question` | Missing information blocks confident judgment | Mark unresolved unless evidence is supplied |

### Disposition rules

Use `accepted` when the finding is valid and the output should change.

Use `partially_accepted` when part of the finding is valid but the recommended resolution is incomplete, excessive, or only partly applicable.

Use `rejected` when the finding is unsupported, incorrect, contradicted by evidence, or based on an invented requirement.

Use `needs_more_evidence` when the finding may be valid but cannot be resolved from available evidence.

Use `out_of_scope` when the finding concerns requirements outside the original task or acceptance criteria.

### Loop control

Allow at most one correction pass for each failed gate unless the user explicitly requests additional iterations.

Default loop policy:

```
loop_policy:
  max_review_repair_passes: 1
  max_resolution_repair_passes: 1
  max_revision_repair_passes: 1
  stop_condition: emit_final_audit_with_residual_risks
```

Do not create infinite review loops. If a gate still fails after the allowed repair pass, emit a final audit with the failure recorded.

Artifacts
---------

Use stable artifact names.

```
review_packet.yaml
review_report.yaml
resolution_report.yaml
final_audit.yaml
final_output.md
```

If the environment does not support file creation, emit the artifacts inline using the same names as section headers.

Artifact naming conventions:

*   Use lowercase snake_case keys.
*   Use stable finding IDs: `F-001`, `F-002`, `F-003`.
*   Use stable subjective improvement IDs: `S-001`, `S-002`.
*   Use stable open question IDs: `Q-001`, `Q-002`.
*   Use stable risk IDs where needed: `R-001`, `R-002`.

Output contract
---------------

Produce the final result in this order:

1.  `final_audit`
2.  `gate_results`
3.  `resolution_summary`
4.  `final_output`
5.  `artifact_index`

Minimum final response structure:

```
final_audit:
  original_verdict:
  final_disposition:
  accepted_finding_count:
  rejected_finding_count:
  partially_accepted_count:
  unresolved_count:
  final_output_changed:
  change_summary:
  remaining_risks:
  recommended_next_action:

gate_results:
  review_validity_gate:
    status:
    notes:
  resolution_integrity_gate:
    status:
    notes:
  revision_gate:
    status:
    notes:
  traceability_gate:
    status:
    notes:
  scope_gate:
    status:
    notes:

resolution_summary:
  accepted:
  partially_accepted:
  rejected:
  needs_more_evidence:
  out_of_scope:

final_output:
  content:

artifact_index:
  review_packet:
  review_report:
  resolution_report:
  final_audit:
```

For failed workflows, still emit:

```
final_audit:
  final_disposition: failed
  failure_point:
  reason:
  recoverable:
  recommended_next_action:
```

Failure modes
-------------

Prevent these failure modes:

### Leaking the response phase to the reviewer

Failure signal:

```
reviewer_received:
  expected_author_response: present
  resolution_dispositions: present
```

Required response:

*   Stop Phase 2.
*   Rebuild the reviewer handoff with only `review_packet`.
*   Restart blind review if possible.
*   Record the leak in `final_audit.remaining_risks` if the review cannot be rerun.

### Reviewer anchoring on author identity

Failure signal:

```
review_report:
  findings_reference_author_identity: true
```

Required response:

*   Reject the review under `review_validity_gate`.
*   Request a reviewer report grounded only in task requirements and evidence.

### Author dismissing findings without evidence

Failure signal:

```
finding_resolution:
  disposition: rejected
  evidence_used: null
```

Required response:

*   Fail `resolution_integrity_gate`.
*   Require evidence or reclassification.

### Unresolved findings

Failure signal:

```
review_report.findings.count != resolution_report.finding_resolutions.count
```

Required response:

*   Fail `resolution_integrity_gate`.
*   Require classification of every finding.

### Final revisions with no traceability

Failure signal:

```
accepted_changes:
  - finding_id: null
    requirement_or_evidence_reference: null
```

Required response:

*   Fail `traceability_gate`.
*   Require mapping or revert the change.

### Infinite review loops

Failure signal:

```
repair_pass_count_exceeded: true
```

Required response:

*   Stop the loop.
*   Emit `final_audit` with unresolved risks and recommended next action.

### Review becoming style-only nitpicking

Failure signal:

```
review_report:
  findings:
    only_subjective_style_comments: true
```

Required response:

*   Fail `review_validity_gate` when substantive acceptance criteria exist.
*   Require objective evaluation against source task and constraints.

### Final answer degrading from overcorrection

Failure signal:

```
revision_gate:
  no_unjustified_degradation: false
```

Required response:

*   Require the author to restore valid original content.
*   Keep only changes justified by findings, requirements, or explicit defects.

### Scope expansion disguised as correction

Failure signal:

```
scope_gate:
  no_unjustified_scope_expansion: false
```

Required response:

*   Remove the expansion or document explicit justification.
*   Mark retained expansions as residual risks.

Final output schema
-------------------

Use this complete schema when a structured final audit bundle is required:

```
final_audit_bundle:
  metadata:
    workflow_name: two-pass-review-resolution-orchestrator
    subskills:
      reviewer: blind-output-review
      author_resolution: review-response-resolution
    status:
    created_at:
  review_packet:
    source_task:
    candidate_output:
    constraints:
    evidence:
    rubric:
    acceptance_criteria:
  review_report:
    verdict:
    score:
    findings:
      - id:
        severity:
        category:
        claim:
        evidence:
        requirement_reference:
        impact:
        recommended_resolution:
        confidence:
    subjective_improvements:
      - id:
        suggestion:
        rationale:
        non_blocking:
    open_questions:
      - id:
        question:
        blocking:
        reason:
  resolution_report:
    final_disposition:
    finding_resolutions:
      - finding_id:
        disposition:
        rationale:
        evidence_used:
        change_made:
        revised_output_location:
        residual_risk:
    defended_original_decisions:
    accepted_changes:
    rejected_findings:
    revised_output:
      content:
      changed:
      change_log:
    residual_risks:
  gate_results:
    review_validity_gate:
      status:
      failures:
      repair_attempted:
    resolution_integrity_gate:
      status:
      failures:
      repair_attempted:
    revision_gate:
      status:
      failures:
      repair_attempted:
    traceability_gate:
      status:
      failures:
      repair_attempted:
    scope_gate:
      status:
      failures:
      repair_attempted:
  final_audit:
    original_verdict:
    final_disposition:
    accepted_finding_count:
    rejected_finding_count:
    partially_accepted_count:
    unresolved_count:
    final_output_changed:
    change_summary:
      - source:
        change:
        traceability_reference:
    remaining_risks:
      - risk:
        source:
        severity:
        next_step:
    recommended_next_action:
  final_output:
    content:
```

Invocation examples
-------------------

### Example 1 — Standard two-pass review

```
Use two-pass-review-resolution-orchestrator.

source_task:
  Create a repository-local skill for blind output review.

candidate_output:
  [paste candidate SKILL.md]

constraints:
  Must use neutral role language.
  Must separate objective findings from subjective improvements.

evidence:
  User-provided prompt only.

rubric:
  Correctness, completeness, traceability, constraint adherence.

acceptance_criteria:
  Paste-ready SKILL.md with required sections.
```

Expected orchestration:

```
1. Build review_packet.
2. Send review_packet only to reviewer.
3. Validate review_report.
4. Send review_report and source materials to author.
5. Validate resolution_report and revised output.
6. Emit final_audit and final_output.
```

### Example 2 — Missing rubric

```
Use two-pass-review-resolution-orchestrator with this candidate output and original task.
No rubric was provided.
```

Expected handling:

```
review_packet:
  rubric: Unknown
```

Continue using explicit constraints and acceptance criteria. Do not invent rubric criteria.

### Example 3 — Invalid review report

```
review_report:
  verdict: fail
  score: 2
  findings:
    - id: F-001
      claim: "This is bad."
```

Expected gate result:

```
review_validity_gate:
  status: fail
  failures:
    - vague finding
    - missing evidence
    - missing requirement reference
    - missing impact
```

Do not proceed to author resolution until the review report is repaired or the workflow is ended with `final_disposition: review_invalid`.

### Example 4 — Resolution missing a finding

```
review_report:
  findings:
    - id: F-001
    - id: F-002

resolution_report:
  finding_resolutions:
    - finding_id: F-001
      disposition: accepted
```

Expected gate result:

```
resolution_integrity_gate:
  status: fail
  failures:
    - F-002 is unclassified
```

Return to the author for completion before final audit.

### Example 5 — Accepted major finding not reflected

```
review_report:
  findings:
    - id: F-003
      severity: major
      claim: "Required failure modes section is missing."

resolution_report:
  finding_resolutions:
    - finding_id: F-003
      disposition: accepted
      change_made: false
```

Expected gate result:

```
revision_gate:
  status: fail
  failures:
    - accepted major finding F-003 is not reflected in revised output
```

Require revised output or document why revision is impossible and carry the issue as a residual risk.
