---
name: review-response-resolution
description: Resolves external reviews of completed work through evidence-based acceptance, rejection, partial acceptance, or targeted revision. Use when a source_task, original_output, and review_report are available and a final resolution, pushback, adjudication, or revised_output is needed.
metadata:
  short-description: Evidence-based review response and revision resolution.
---

# Review Response Resolution

## Quick start

Use this skill to resolve a `review_report` against a `source_task` and `original_output`.

Required inputs:
- `source_task`: original prompt, ticket, task, or specification.
- `original_output`: output being reviewed.
- `review_report`: critique, audit, QA report, defect report, or list of findings.

Optional inputs:
- `constraints`: policies, acceptance criteria, repository conventions, style rules, safety constraints, or implementation constraints.
- `evidence`: files, logs, test outputs, citations, screenshots, repository state, or supplied context.
- `revision_permission`: whether to revise, defend unchanged, or provide both `resolution` and `revised_output`.

If essential context is missing:
- Ask up to 5 targeted questions when resolution cannot proceed safely.
- If immediate resolution is requested, proceed with labeled assumptions.
- Mark missing facts as `Unknown`.
- Mark unresolved action items as `TODO`.

Core posture:
- Treat the `review_report` as useful input, not authority.
- Preserve valid `original_output` decisions.
- Revise only where a change is justified by the `source_task`, constraints, evidence, factual correctness, implementation feasibility, risk, or user goals.
- Never justify a decision using authority, identity, confidence, role status, or ownership of the `original_output`.

## Workflow

### 1. Discover structure and locate inputs

Identify whether the request includes:
- `source_task`
- `original_output`
- `review_report`
- `constraints`
- `evidence`
- `revision_permission`

If the request references files, repository state, logs, tests, screenshots, or other evidence:
- Attempt to read the referenced material if available.
- If a referenced item is missing, record `Unknown` and continue unless explicitly mandatory.
- Do not fabricate evidence from unavailable files or execution.

### 2. Reconstruct the `source_task`

Extract:
- Objective.
- Explicit requirements.
- Constraints.
- Success criteria.
- Output format requirements.
- Scope boundaries.
- Any acceptance criteria.

Separate:
- Hard requirements from preferences.
- Explicit requirements from inferred goals.
- In-scope defects from optional improvements.

### 3. Normalize the `review_report`

Break the review into atomic `finding` entries.

For each `finding`:
- Assign an ID if absent: `F1`, `F2`, `F3`, etc.
- Extract the reviewer’s claim.
- Identify whether the claim alleges a defect, missing requirement, unsupported claim, style issue, ambiguity, risk, implementation problem, or optional improvement.
- Separate objective defects from subjective preferences.
- Split mixed claims into separate findings when they require different decisions.

### 4. Evaluate each `finding`

Classify each `finding` as exactly one of:

- `accepted`
- `partially_accepted`
- `rejected`
- `needs_more_evidence`
- `out_of_scope`

For every classification, provide:
- What the `reviewer` claimed.
- Whether the claim is valid.
- Evidence from the `source_task`, `original_output`, constraints, or supplied evidence.
- Decision rationale.
- Whether the `original_output` should change.
- Exact revision action, if any.

### 5. Push back where justified

Reject or partially reject a `finding` when it:
- Invents requirements not present in the `source_task`.
- Ignores explicit constraints.
- Misreads the `original_output`.
- Treats preference as objective failure.
- Recommends excessive scope expansion.
- Asks for unnecessary complexity.
- Ignores tradeoffs.
- Contradicts the `source_task`.
- Conflicts with safety, legal, or project constraints.
- Makes a major claim without evidence.
- Is factually wrong.

Pushback must be evidence-based. Do not write conclusory responses such as “the review is wrong” without explaining why.

### 6. Concede where justified

Accept or partially accept a `finding` when it identifies:
- Missed requirement.
- Factual inaccuracy.
- Unsupported claim.
- Unsafe recommendation.
- Non-executable instruction.
- Broken code.
- Format violation.
- Scope violation.
- Material reasoning gap.
- Missing edge case that affects correctness.
- Incomplete deliverable.

Concession must be direct. Do not minimize a valid defect.

### 7. Decide revision scope

Choose the smallest justified revision scope:

- `unchanged`: all material findings are rejected, out of scope, or need more evidence.
- `minor revision`: accepted findings require localized corrections.
- `major revision`: accepted findings require broad restructuring or replacement.
- `fundamental failure`: the review reveals that the `original_output` does not satisfy the `source_task`.

Preserve valid decisions from the `original_output` even when other sections require revision.

### 8. Produce the resolution

Generate:
- Structured `resolution_summary`.
- Reconstructed task.
- Finding-by-finding resolutions.
- Defended original decisions.
- Accepted changes.
- Rejected findings.
- Revised output if revision is permitted or requested.
- Final notes with residual risks and open questions.

## Decision rules

### Evidence hierarchy

Prefer evidence in this order:
1. Explicit `source_task` requirements.
2. Explicit constraints and acceptance criteria.
3. Supplied evidence, files, logs, tests, citations, screenshots, or repository state.
4. Factual correctness and implementation feasibility.
5. User goals implied by the `source_task`.
6. Tradeoff and risk analysis.
7. Style preferences, only when relevant to the task or constraints.

### Classification rules

Use `accepted` when:
- The `finding` is valid and requires a change.

Use `partially_accepted` when:
- The `finding` combines valid and invalid claims.
- The issue exists but the proposed remedy is excessive, unsafe, or mis-scoped.
- A narrower revision addresses the valid concern.

Use `rejected` when:
- The claim is unsupported, factually wrong, preference-based, contradictory, or invented.
- The original decision better satisfies the `source_task` or constraints.

Use `needs_more_evidence` when:
- The claim may be valid but cannot be verified from available context.
- Required files, logs, tests, or facts are missing.
- A safe final decision would require evidence not supplied.

Use `out_of_scope` when:
- The `finding` addresses work not requested by the `source_task`.
- The requested change would exceed the authorized scope.
- The issue may be useful but does not affect satisfaction of the current task.

### Revision rules

Revise surgically:
- Change only what accepted or partially accepted findings justify.
- Preserve correct structure, reasoning, and tradeoffs from the `original_output`.
- Do not rewrite broadly to appease the `reviewer`.
- Do not make cosmetic changes unless they resolve a classified `finding`.
- Trace every substantive change back to a `finding`.

### Justification rules

Allowed justification:
- `source_task` requirements.
- Explicit constraints.
- Available evidence.
- Tests.
- Repository conventions.
- User goals.
- Factual correctness.
- Implementation feasibility.
- Tradeoff analysis.
- Risk analysis.

Forbidden justification:
- Authority-based dismissal.
- Role-based dismissal.
- “Because I wrote it.”
- “The review is wrong” without evidence.
- Defensive rejection without analysis.
- Automatic agreement.
- Automatic rejection.
- Confidence as a substitute for evidence.

### Distinction rules

Always distinguish:
- Incorrect vs. incomplete.
- Worse vs. different.
- Missing requirement vs. optional improvement.
- Objective defect vs. subjective preference.
- Necessary revision vs. unnecessary scope expansion.
- Unsupported critique vs. critique supported by evidence.

## Output contract

Return exactly this YAML-shaped structure unless the user explicitly requests another format:

```yaml
resolution_summary:
  final_disposition:
  original_output_status:
  review_quality:
  revision_required:
  key_decision:

task_reconstruction:
  objective:
  explicit_requirements:
    -
  constraints:
    -
  success_criteria:
    -

finding_resolutions:
  - finding_id: F1
    reviewer_claim:
    classification:
    validity:
    evidence:
    response:
    change_required:
    revision_action:

defended_original_decisions:
  - decision:
    why_it_stands:
    evidence:
    tradeoff:

accepted_changes:
  - issue:
    change:
    rationale:

rejected_findings:
  - finding_id:
    reason_rejected:
    evidence:

revised_output:
  status: unchanged | revised | not_provided
  content: |

final_notes:
  residual_risks:
    -
  open_questions:
    -
```

Field requirements:

*   `final_disposition`: one of `original_stands`, `minor_revision`, `major_revision`, `fundamental_failure`, `insufficient_evidence`.
*   `original_output_status`: concise status of the `original_output` after review.
*   `review_quality`: concise assessment of the `review_report`, including whether it is evidence-based, mixed, preference-heavy, incomplete, or materially correct.
*   `revision_required`: boolean or concise phrase.
*   `key_decision`: most important acceptance, rejection, or tradeoff.
*   `evidence`: cite concrete text, requirement, file, test, or supplied fact when available; otherwise write `Unknown`.
*   `change_required`: `true`, `false`, or `partial`.
*   `revision_action`: specific edit, `none`, `TODO`, or `Unknown`.
*   `revised_output.status`: use `unchanged` when no revision is required, `revised` when revised content is supplied, and `not_provided` when revision is not permitted or not possible.

Failure modes
-------------

Guard against these errors:

*   Authority-based response.
*   Blanket rejection of the `review_report`.
*   Blanket acceptance of the `review_report`.
*   Cosmetic revision without resolving substance.
*   Overwriting sound original decisions.
*   Overfitting to reviewer preference.
*   Ignoring the `source_task`.
*   Confusing confidence with correctness.
*   Treating reviewer preference as binding.
*   Failing to trace changes to findings.
*   Failing to distinguish objective defects from preferences.
*   Inventing requirements not present in the `source_task`.
*   Fabricating evidence, test results, repository state, or file contents.
*   Treating missing evidence as proof.
*   Revising beyond `revision_permission`.

When blocked:

*   Record the missing context under `final_notes.open_questions`.
*   Use `needs_more_evidence` for findings that cannot be resolved.
*   Use `Unknown` for unavailable evidence.
*   Use `TODO` for required future verification or edits.
*   Do not fabricate a `revised_output`.

Invocation examples
-------------------

### Example 1: Resolve a structured review

Input shape:

```
source_task:
Create a repository-local skill for resolving review feedback.

original_output:
[Paste original skill output.]

review_report:
F1: The output omitted a required section.
F2: The output should use a completely different format.
F3: The output includes unsupported claims.

revision_permission:
Produce both a resolution and revised output.
```

Expected behavior:

*   Accept `F1` if the section was explicitly required.
*   Reject or partially accept `F2` if the requested format was not required and the original format satisfies the task.
*   Accept `F3` if claims lack evidence.
*   Produce revised content only for accepted or partially accepted findings.

### Example 2: Push back on preference-based critique

Input shape:

```
source_task:
Write a concise implementation plan in Markdown.

original_output:
[Paste plan.]

review_report:
The plan is bad because it does not include a RACI matrix and a multi-quarter roadmap.
```

Expected behavior:

*   Determine whether a RACI matrix or roadmap was required.
*   If not required, classify the finding as `rejected` or `out_of_scope`.
*   Explain that the requested additions are scope expansion unless tied to the `source_task`.
*   Preserve the concise plan if it satisfies the task.

### Example 3: Partially accept a mixed finding

Input shape:

```
source_task:
Generate runnable setup instructions.

original_output:
[Paste instructions.]

review_report:
The setup is unusable because it omits one environment variable and should be rewritten into a Docker-based architecture.
```

Expected behavior:

*   Accept the missing environment variable if required for execution.
*   Reject Docker rewrite if not required and unjustified.
*   Revise only the setup instructions needed to include the missing variable.
*   Explain the tradeoff.

### Example 4: Handle missing evidence

Input shape:

```
source_task:
Review the implementation for repository convention compliance.

original_output:
[Paste implementation summary.]

review_report:
The implementation violates repository conventions.

evidence:
No repository files supplied.
```

Expected behavior:

*   Classify the convention claim as `needs_more_evidence`.
*   Record missing repository convention files under `open_questions`.
*   Avoid claiming the implementation complies or violates conventions without evidence.
