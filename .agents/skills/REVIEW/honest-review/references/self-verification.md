# Self-Verification Protocol (Wave 3.5)

LLM-as-judge adversarial pass on reconciled findings. Run after Judge (Wave 3)
and before presenting the final report. Reduces false positives by attempting
to disprove each top finding.

## Contents

- [When to Run](#when-to-run)
- [Procedure](#procedure)
- [Confidence Adjustment](#confidence-adjustment)
- [Subagent Prompt Template](#subagent-prompt-template)

## When to Run

Run self-verification when ALL conditions are met:

- 2+ findings survived Judge reconciliation
- Not in fully degraded mode (all research tools unavailable)
- At least one finding has confidence between 0.5 and 0.9

Skip when ANY condition is true:

- Fewer than 2 findings survived
- All surviving findings are P0/S0 (critical findings warrant immediate attention)
- skip only in fully degraded mode (all research tools unavailable and no Grep-based evidence available)

## Procedure

1. **Select targets**: Take the top 5 findings by score (from Judge Step 8 ranking). If fewer than 5, take all.

2. **Spawn devil's advocate subagent**: For each target finding, attempt to construct a counter-argument:
   - Is the evidence outdated or misinterpreted?
   - Does the finding apply to this specific version/context?
   - Is there a compensating control or design pattern that mitigates the risk?
   - Could the "defect" actually be intentional or documented behavior?

2.5. **Agentic verification**: For each target finding, verify the citation anchor:
   - Read the actual source file at the cited `[file:start-end]` location
   - Confirm the code at those lines matches what the finding describes
   - Grep for the claimed pattern across the codebase (is it systemic or isolated?)
   - Check if existing tests exercise the flagged code path
   If the cited code does not match the finding's description, classify as "Hallucinated."

3. **Classify outcome** per finding:
   - **Survives**: counter-argument fails, finding stands
   - **Weakened**: counter-argument partially succeeds (e.g., edge case, low real-world probability)
   - **Disproven**: counter-argument fully succeeds with evidence
   - **Hallucinated**: citation anchor does not match actual source code, or finding describes code that does not exist

4. **Apply confidence adjustments** (see below).

5. **Re-filter**: re-apply Step 4 (Confidence Filter) from Judge protocol — some weakened findings may now drop below threshold.

6. **Annotate**: surviving findings get `[self-verified]` tag in the report.

## Confidence Adjustment

| Outcome   | Adjustment           | Rationale                                  |
| --------- | -------------------- | ------------------------------------------ |
| Survives  | +0.05 (cap at 0.99)  | Adversarial pass strengthens confidence    |
| Weakened  | −0.10 (floor at 0.0) | Partial counter-argument reduces certainty |
| Disproven | Set to 0.0 → discard | Full counter-argument invalidates finding  |
| Hallucinated | Set to 0.0 → discard | Citation does not match source code — finding is fabricated |

After adjustment, re-run the confidence filter:

- ≥ 0.7: report with full confidence + `[self-verified]`
- 0.3–0.7: report as "unconfirmed" (P0/S0 exception still applies)
- < 0.3: discard to audit trail

## Subagent Prompt Template

> You are the **Self-Verification Judge** performing an adversarial review of findings.
>
> **Your goal:** Attempt to disprove each finding below. You are a devil's advocate — your job is to find reasons the finding is wrong, inapplicable, or overstated.
>
> **Findings to challenge:**
> [paste top 5 findings with ID, description, evidence, confidence]
>
> **For each finding, answer:**
>
> 1. Is the evidence current and correctly interpreted? Check if the cited source actually supports the claim.
> 2. Does this finding apply to the specific code version, framework version, and runtime context?
> 3. Is there a compensating control, documented exception, or design rationale that mitigates the issue?
> 4. Could this be intentional behavior (documented, tested, or acknowledged in comments)?
>
> **Output for each finding:**
>
> - Finding ID: HR-{S|A}-{NNN}
> - Outcome: survives | weakened | disproven
> - Counter-argument: [your reasoning]
> - Evidence: [any source that supports the counter-argument]
>
> Be honest. If you cannot construct a credible counter-argument, say "survives — no credible counter-argument found."

Cross-references: references/judge-protocol.md (Wave 3), references/research-playbook.md (confidence rubric).
