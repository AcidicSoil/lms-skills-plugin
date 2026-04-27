# Output Templates

Use this file to keep all modes consistent.

## Standard Output

Always use this structure:

1. Audit Scope
2. Evidence Basis
3. Scoring
4. Conclusion
5. High-Risk Findings
6. Recommendations
7. Uncertainties

## Scoring Format

Use one flat list of dimension scores, then give a concise overall assessment.

Example:

- Clarity: 8/10
- Convergence: 9/10
- Executability: 7/10
- Redundancy Control: 6/10
- Unambiguity: 8/10

Overall assessment:
- strong but still exposed to duplicate-rule drift

## Conclusion Rules

- Give exactly one primary conclusion.
- Match the conclusion set to the current mode.
- Do not mix bands from different modes.
- If evidence is materially incomplete, the conclusion must reflect that incompleteness.
- If key facts are inferred rather than directly evidenced, state that.

## Findings Rules

- High-Risk Findings should list only material issues.
- Prefer 3-5 findings over exhaustive restatement.
- Each finding should say what is wrong and why it matters.

## Recommendation Rules

- Default to 3-5 recommendations.
- Order by priority.
- Prefer minimal structural fixes over broad rewrites.
- Recommendations must not silently assume missing repository facts.
- Keep confirmed fixes separate from speculative improvements.

## Uncertainty Rules

Always separate uncertainties from findings.

Use this section for:

- missing documents
- missing execution evidence
- conflicting rule sources
- unclear authority source
- assumptions required to complete the audit

Do not hide uncertainty inside findings or recommendations.
