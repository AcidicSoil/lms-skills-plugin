---
name: blind-output-review
description: Enables independent review of a candidate_output against a source_task, constraints, evidence, and acceptance criteria. Use when asked to critique, audit, QA, validate, score, or find defects in an answer, plan, code, document, or artifact.
metadata:
  short-description: Independent structured review of submitted work against the original task.
---

# Blind Output Review

## Quick start

Evaluate `candidate_output` strictly against `source_task`, stated `constraints`, available `evidence`, and any `evaluation_rubric`.

Use neutral role language only:

- `reviewer`
- `candidate_output`
- `source_task`
- `evaluation_rubric`
- `review_report`
- `finding`

Do not use model-comparison language. Do not mention, imply, or assume any later response, rebuttal, challenge, defense, or adjudication phase.

Default stance:

- Do not assume `candidate_output` is correct.
- Do not assume `candidate_output` is incorrect.
- Judge only against task requirements, constraints, evidence, acceptance criteria, and practical correctness.
- Separate objective defects from subjective improvements.
- Prefer fewer, higher-quality findings over many weak complaints.

## Workflow

### 1. Identify inputs

Use these inputs when available:

- `source_task`: original request, prompt, ticket, spec, or task.
- `candidate_output`: answer, plan, code, document, artifact, or other work being reviewed.
- `constraints`: explicit requirements, style constraints, safety constraints, repository rules, project conventions, tool limitations, or acceptance criteria.
- `evidence`: files, logs, citations, test output, screenshots, repository snippets, or external references supplied by the user.
- `evaluation_rubric`: optional dimensions or scoring criteria supplied by the user.

If critical inputs are missing, ask up to 5 targeted clarification questions.

If the user asks for immediate review, proceed with explicit assumptions. Do not block review solely because `evaluation_rubric` is incomplete; build a provisional rubric from `source_task` and label it as provisional.

### 2. Reconstruct the task

Identify what `candidate_output` was supposed to accomplish.

Extract:

- objective
- explicit requirements
- minimal implicit requirements
- constraints
- success criteria
- acceptance criteria
- evidence requirements

Infer only requirements that are necessary for practical task completion. Do not invent hidden requirements.

### 3. Build the evaluation rubric

Use the supplied `evaluation_rubric` when present.

If no rubric is supplied, create a provisional rubric from `source_task` using these default dimensions unless inapplicable:

- Requirement satisfaction
- Correctness
- Completeness
- Grounding and evidence
- Constraint adherence
- Internal consistency
- Practicality and executability
- Safety or policy compliance
- Maintainability or extensibility, if technical
- User usefulness

Score each dimension from 0 to 10 and explain the standard used.

### 4. Inspect candidate_output

Compare `candidate_output` against `source_task`, not against personal preference.

Look for:

- missed requirements
- incorrect claims
- unsupported assumptions
- contradictions
- overreach
- weak reasoning
- failure to follow constraints
- missing evidence
- practical execution gaps
- safety or policy issues
- ambiguity that affects correctness
- gaps between stated success criteria and delivered work

Do not penalize valid concise answers. Do not reward verbosity.

### 5. Classify findings

For every material issue, create a structured `finding`.

Each `finding` must include:

- `finding_id`
- `severity`: `blocker` | `major` | `minor` | `nit`
- `category`
- `claim_or_section`
- `problem`
- `why_it_matters`
- `evidence`
- `suggested_fix`
- `confidence`: `high` | `medium` | `low`

Use severity consistently:

| Severity | Use when |
|---|---|
| `blocker` | The output fails a core requirement, is unusable, unsafe, or materially misleading. |
| `major` | The output has a significant defect that prevents full success or creates meaningful risk. |
| `minor` | The output is mostly usable but has a limited defect, omission, or clarity issue. |
| `nit` | The issue is cosmetic, stylistic, or low-impact and should not materially affect acceptance. |

### 6. Separate subjective improvements

Place preferences, alternative approaches, polish suggestions, or non-required enhancements under `subjective_improvements`.

Do not inflate subjective preferences into major defects.

### 7. Produce final verdict

Use one of these verdicts:

- `pass`
- `pass_with_minor_issues`
- `needs_revision`
- `fails_requirements`

Apply verdicts as follows:

| Verdict | Use when |
|---|---|
| `pass` | `candidate_output` satisfies the task with no material defects. |
| `pass_with_minor_issues` | `candidate_output` satisfies the task with only minor or nit-level issues. |
| `needs_revision` | `candidate_output` has major issues but is salvageable with targeted changes. |
| `fails_requirements` | `candidate_output` misses core requirements, contains blocker defects, or cannot be accepted as-is. |

## Decision rules

- Be strict but not performative.
- Judge only against `source_task`, `constraints`, `evidence`, and practical correctness.
- Do not invent missing requirements.
- Do not assume unstated implementation details.
- Do not require citations unless the task required factual grounding or external claims.
- Do not mark something wrong solely because another valid approach exists.
- Do not rewrite the entire `candidate_output` unless asked.
- Do not include adversarial language, sarcasm, or role-comparison language.
- Do not use model-comparison terminology.
- Do not mention any later response, rebuttal, challenge, defense, or adjudication phase.
- Identify ambiguity explicitly instead of resolving it with false certainty.
- When evidence is insufficient, mark confidence as `medium` or `low`.
- Prefer actionable findings over broad criticism.
- Use exact references to sections, claims, lines, snippets, or evidence where available.
- Keep open questions focused on acceptance-impacting ambiguity.

## Output contract

Produce the `review_report` in this YAML-compatible structure:

```yaml
review_summary:
  verdict:
  overall_score_0_to_10:
  strongest_parts:
    -
  highest_risk_findings:
    -

task_reconstruction:
  objective:
  explicit_requirements:
    -
  inferred_requirements:
    -
  constraints:
    -
  success_criteria:
    -

rubric:
  - dimension:
    standard:
    score_0_to_10:
    notes:

findings:
  - finding_id: F1
    severity:
    category:
    claim_or_section:
    problem:
    why_it_matters:
    evidence:
    suggested_fix:
    confidence:

subjective_improvements:
  - improvement:
    rationale:
    priority:

open_questions:
  - question:
    why_it_matters:

final_recommendation:
  action:
  rationale:
```

If a section has no entries, use an empty list `[]`.

Use `Unknown` for unavailable facts. Use `TODO` only when the report cannot be completed without user-supplied information.

Failure modes
-------------

Guard against these review failures:

*   nitpicking
*   hallucinated requirements
*   preference masquerading as correctness
*   over-weighting style issues
*   ignoring `source_task`
*   penalizing reasonable tradeoffs
*   vague criticism without actionable fixes
*   false certainty
*   assuming hidden requirements
*   expanding scope beyond the original task
*   treating verbosity as quality
*   treating concision as incompleteness when the task did not require more detail
*   accepting unsupported claims when factual grounding was required
*   requiring citations when the task did not require them
*   using adversarial or comparative framing

When a failure mode is detected in the review process, correct the review before finalizing `review_report`.

Invocation examples
-------------------

### Example 1: Immediate review with complete inputs

User request:

```
Review this candidate_output against the source_task and constraints.
source_task: Write a migration plan for moving the app from SQLite to Postgres.
constraints: Must include rollback, data validation, downtime risk, and test plan.
candidate_output: ...
```

Reviewer behavior:

*   Reconstruct migration-plan requirements.
*   Build rubric from supplied constraints.
*   Identify missing rollback, validation, downtime, or test-plan coverage.
*   Produce the YAML `review_report`.

### Example 2: Missing rubric

User request:

```
QA this answer. Original task: ...
Candidate answer: ...
```

Reviewer behavior:

*   Do not block because no rubric was supplied.
*   Build a provisional `evaluation_rubric` from `source_task`.
*   Label the rubric as provisional in rubric notes.
*   Produce the YAML `review_report`.

### Example 3: Missing critical input

User request:

```
Review this output.
```

Reviewer behavior:

*   Ask targeted clarification questions because `source_task` and `candidate_output` are missing.
*   Ask no more than 5 questions.
*   Focus only on inputs required to perform the review.

Example questions:

```
1. What is the source_task the candidate_output was responding to?
2. What is the candidate_output to review?
3. Are there explicit constraints or acceptance criteria?
4. Is there evidence such as files, tests, logs, or citations that must be considered?
5. Should the review use a supplied rubric or a provisional rubric?
```

### Example 4: User requests review despite missing context

User request:

```
Review it anyway with what you have.
```

Reviewer behavior:

*   Proceed with explicit assumptions.
*   Mark unavailable facts as `Unknown`.
*   Use low confidence for findings that depend on missing context.
*   Include open questions only when they affect acceptance.
