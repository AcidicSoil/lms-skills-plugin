---
name: ai-harness-auditor
description: Use when auditing an AI collaboration contract or checking whether a repository is ready for AI coding. Reviews rule clarity, convergence, redundancy, execution safety, and structural prerequisites. Produces audits with scores, conclusions, risks, and prioritized recommendations.
---

# AI Harness Auditor

This skill audits a repository's AI collaboration system in one of two modes:

- `contract`: audit rule clarity, convergence, ambiguity, and redundancy
- `readiness`: audit whether the repository is structurally ready for safe AI coding

## Boundaries

- This skill audits repository rules; it does not define repository rules.
- If this skill conflicts with the audited repository's formal contract, the repository contract wins.
- Do not invent missing project facts.
- Do not use this skill as the authority source for the target repository.
- When evidence is missing, downgrade the conclusion and report the gap explicitly.
- Do not convert repository-specific facts into generic assumptions.
- Do not treat templates, examples, or convenience notes as formal contract unless the repository explicitly does so.

## Mode Selection

Choose exactly one mode.

Use `contract` when the user asks whether rules are clear, convergent, non-redundant, or unambiguous.

Use `readiness` when the user asks whether a repository is operationally ready for safe AI coding.

If the user does not specify a mode, infer the closest one from the request and state which mode you chose.

When uncertain where to start, prefer `contract` first, then `readiness`. Contract audits the rule system; readiness audits whether the structural prerequisites exist to act on it.

## Required Inputs

Read the repository's formal entry contract and only the documents needed for the selected mode.

Typical sources may include:

- top-level AI contract
- phase rules
- issue / PR rules
- progress rules
- plan documents
- CI or verification documents

If the repository lacks a unique formal entry, report that as a finding rather than compensating for it.

## Workflow

1. Identify the audit mode.
2. Read the formal repository documents relevant to that mode.
3. Load the matching reference:
   - `references/contract-audit.md`
   - `references/readiness-audit.md`
4. Audit the repository against that framework.
5. Produce:
   - audit scope
   - evidence basis
   - scoring
   - conclusion
   - high-risk findings
   - prioritized recommendations
   - uncertainties

## Output Contract

See `references/output-templates.md` for the required output structure, scoring format, and section rules.

Additional rule: when repository materials conflict, describe the conflict before scoring downstream impact.

## References

- For `contract` mode, read `references/contract-audit.md`
- For `readiness` mode, read `references/readiness-audit.md`
- For scoring format and result layout, read `references/output-templates.md`
