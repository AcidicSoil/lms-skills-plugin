# Research Validation Playbook

Validate review findings with live research instead of relying on static checklist review.

## Contents

- [Three-Phase Review Pattern](#three-phase-review-pattern)
- [Research Tools and When to Use](#research-tools-and-when-to-use)
- [Research Subagent Templates](#research-subagent-templates)
- [Parallelism Strategy](#parallelism-strategy)
- [Evidence Quality](#evidence-quality)
- [Confidence Scoring Rubric](#confidence-scoring-rubric)
- [Triage-Aware Batch Routing](#triage-aware-batch-routing)
- [Batch Optimization](#batch-optimization)

## Degraded Mode Operation

When research tools are unavailable (CI environment, offline, rate-limited), apply confidence ceilings and fallback routing. Check tool availability during Wave 0 triage. Report degraded mode in the header: `[DEGRADED MODE: tools unavailable]`.

| Tool Unavailable   | Confidence Ceiling | Fallback                                                                          |
| ------------------ | ------------------ | --------------------------------------------------------------------------------- |
| Context7           | 0.6 max            | WebSearch for library docs; cite general documentation URLs                       |
| WebSearch          | 0.5 max            | Context7 for library-specific findings; skip best-practice validation             |
| WebFetch           | 0.5 max            | WebSearch for package health; skip registry lookups                               |
| gh CLI             | 0.5 max            | WebSearch for known issues; skip issue cross-referencing                          |
| All research tools | 0.4 max            | Report all findings as "unconfirmed"; only P0/S0 findings reliably survive filter |
| Grep (fact evidence) | Not subject to ceiling | Grep-based fact evidence is NOT subject to the WebSearch confidence ceiling. Degraded mode ceilings apply only to assumption evidence (WebSearch, Context7, DeepWiki). In degraded mode, fact evidence findings report at their normal confidence. |

When operating in degraded mode:

1. State which tools are unavailable in the report header
2. Apply the lowest applicable confidence ceiling to each finding
3. Skip slopsquatting detection if WebFetch is unavailable (note in report)
4. Reduce batch sizing — fewer findings per subagent when validation is limited
5. Increase the "obvious issue" threshold — report only high-impact findings

## Three-Phase Review Pattern

Phase 1 (Flag): Analyze code using LLM knowledge. Generate hypotheses.
Phase 2 (Verify): For each hypothesis, use tool calls to confirm before dispatching research:
  - Grep the codebase for the pattern claimed in the finding
  - Read the actual file at the cited lines to confirm the code exists as described
  - Check if tests cover the flagged code path
  - If the code does not match the hypothesis, discard immediately (no research needed)
Phase 3 (Validate): For each verified hypothesis, spawn research subagent(s). Only report findings with evidence.

## Research Tools and When to Use

| Tool                                           | Use When                                                                        | Example                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Context7 (resolve-library-id, then query-docs) | Verifying API usage, checking for deprecation, confirming method signatures     | "Is React.createClass still valid in React 18?"      |
| WebSearch (Brave, DuckDuckGo, Exa)             | Checking current best practices, security advisories, known issues              | "JWT storage best practices 2026"                    |
| WebFetch                                       | Querying package registries, reading changelogs, checking CVE databases         | "https://registry.npmjs.org/express/latest"          |
| DeepWiki (ask_question)                        | Understanding unfamiliar repo architecture, design decisions, internal patterns | "How does owner/repo handle authentication?"         |
| gh (GitHub CLI)                                | Checking open issues, security advisories, PR discussions                       | "gh api repos/expressjs/express/security-advisories" |

**Evidence tiers**: *Fact evidence* (Grep confirms X exists/doesn't in the codebase) maps to confidence 0.85-0.95 in the Scoring Rubric, depending on exactness of match. *Assumption evidence* (WebSearch, Context7) follows the existing Rubric tiers (multiple sources = 0.85+, single = 0.65-0.75). Reuse and simplification findings use fact evidence; label findings accordingly.

## Research Subagent Templates

### API Correctness Validator

Spawn when: a finding claims an API is used incorrectly or is deprecated.

Prompt template:

- Input: library name, method/API being used, code snippet
- Steps: Resolve library ID via Context7 (resolve-library-id tool), then query docs for the specific API (query-docs tool). Compare usage in code against current documentation.
- Output: validated (bool), evidence (string), citation (URL or doc section)
- Model: sonnet (needs judgment to compare usage against docs)

### Security Pattern Validator

Spawn when: a finding identifies a potential security concern.

Prompt template:

- Input: security-sensitive code snippet, pattern type (auth, crypto, SQL, etc.)
- Steps: WebSearch for current best practices for this pattern type. Check OWASP guidance. Compare code against recommendations.
- Output: validated (bool), severity (critical/high/medium/low), evidence, citation
- Model: sonnet (needs nuance for security assessment)

### Dependency Health Checker

Spawn when: a finding concerns dependency version, vulnerability, or deprecation.

Prompt template:

- Input: package name, installed version, language/ecosystem
- Steps: WebFetch the package registry for latest version and advisories (npm: registry.npmjs.org, PyPI: pypi.org/pypi/PKG/json, crates.io: crates.io/api/v1/crates/PKG). WebSearch for known issues. Check for deprecation notices.
- Output: status (healthy/outdated/vulnerable/deprecated), details, citation
- Model: opus (structured data extraction)

### Performance Assumption Validator

Spawn when: a finding questions a performance assumption or pattern.

Prompt template:

- Input: code snippet with performance assumption (from comments or patterns)
- Steps: Context7 for library performance characteristics. WebSearch for benchmarks or known performance issues with this pattern.
- Output: validated (bool), actual characteristics, evidence
- Model: opus

### Slopsquatting Detector

Spawn when: unfamiliar dependency names appear in imports or package manifest, or when code appears LLM-generated.

Prompt template:

- Input: list of package names from imports and dependency manifest, ecosystem (npm/PyPI/crates.io/Go)
- Steps: For each package name, WebFetch the package registry endpoint (npm: registry.npmjs.org/PKG, PyPI: pypi.org/pypi/PKG/json, crates.io: crates.io/api/v1/crates/PKG). If the package does not exist (404), flag as potential slopsquatting. If it exists but has very low download counts or was recently created, flag as suspicious.
- Output: list of {package, status (verified/not-found/suspicious), evidence}
- Model: opus (structured registry lookups)

### Repository Context Analyzer

Spawn when: reviewing an unfamiliar open-source dependency or understanding upstream architecture.

Prompt template:

- Input: GitHub repository owner/repo, specific question about architecture or design
- Steps: Use DeepWiki (ask_question) to query AI-generated documentation about the repository. Cross-reference findings with Context7 for library-specific details.
- Output: architectural summary, relevant design decisions, key patterns
- Model: opus (structured extraction from DeepWiki responses)

### Agentic Verifier

Spawn when: a finding makes a claim about code structure, behavior, or patterns.

Prompt template:

- Input: finding description, claimed file path and line range, claimed pattern
- Steps: Grep for the claimed pattern in the codebase. Read the actual file at the cited lines. Compare the actual code against the finding's claim. Check if test files cover the flagged code path.
- Output: verified (bool), actual_code_snippet (string), discrepancy (string if not verified)
- Model: opus (fast tool calls, structured verification)

Agentic verification runs BEFORE research validation. Findings that fail verification
(cited code does not match the claim) are discarded without consuming research cycles.
This reduces both false positives and unnecessary research tool calls.

IMPORTANT: Prioritize this check — slopsquatting is a supply chain attack vector.
Non-existent packages in import statements indicate hallucinated dependencies.

### Test Quality Validator

Spawn when: a finding questions test coverage or test quality.

Prompt template:

- Input: test file paths, corresponding source file paths
- Steps: Read test files. List all public methods/functions in source files. Compare: which public APIs have no corresponding test? Check assertion density: flag test functions with zero assertions or only mock verifications. Check for common anti-patterns: tests that test implementation details, tests that never fail.
- Output: coverage gaps (list of untested public APIs), quality issues (list of anti-patterns found), assertion density score
- Model: sonnet (needs judgment to evaluate test quality)

## Parallelism Strategy

- Spawn ALL research subagents for a review pass in a single message
- Use opus for simple lookups (doc extraction, version checks)
- Use sonnet for nuanced validation (security, architecture decisions)
- If more than 10 findings to validate, batch into groups of 5-6 parallel subagents
- Set reasonable scope: do not research-validate obvious issues (null deref, syntax error). Only validate assumptions and non-obvious concerns.
- Spawn lens subagents (Inversion, Deletion, Newcomer, Incident, Evolution) in parallel with checklist reviewers when applying creative lenses
- Prioritize slopsquatting detection — spawn slopsquatting detector subagents before other research, as non-existent packages are security-critical
- Use opus for lens-based analysis (requires creative reasoning); use opus for slopsquatting detection (structured lookups)

## Evidence Quality

| Level  | Confidence | Criteria                                                                              | Action                      |
| ------ | ---------- | ------------------------------------------------------------------------------------- | --------------------------- |
| Strong | 0.8-1.0    | Current official docs confirm the issue (Context7 citation) or reproduction confirmed | Report with high confidence |
| Medium | 0.6-0.7    | Multiple web sources agree (WebSearch results)                                        | Report with citation        |
| Weak   | 0.2-0.5    | Single blog post, outdated source, or heuristic match only                            | Flag as "unconfirmed"       |
| None   | 0.0-0.1    | No evidence found after research                                                      | Discard the finding         |

## Confidence Scoring Rubric

Assign a confidence score to every finding after the research validation phase. Use the highest applicable level.

| Score   | Basis                                                                              | Example                                                                         |
| ------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1.0     | Reproduction confirmed — test failing, build error visible, runtime crash observed | Unit test fails on the exact code path; CI log shows the error                  |
| 0.8-0.9 | Official docs directly confirm — Context7 with exact API match                     | Context7 query returns deprecation notice for the method in question            |
| 0.6-0.7 | Multiple web sources agree — WebSearch consensus across 2+ independent sources     | Three Stack Overflow answers and an OWASP page all flag the same pattern        |
| 0.4-0.5 | Single authoritative source — one OWASP reference, one official blog post          | One OWASP cheat sheet mentions the risk, no other corroboration                 |
| 0.2-0.3 | Heuristic match only — LLM reasoning without external confirmation                 | Pattern looks problematic based on training knowledge, but no live source found |
| 0.0-0.1 | Speculative — no evidence found after research                                     | WebSearch and Context7 both return nothing relevant                             |
| **0.90** | **Grep / Fact evidence: exact behavioral match found in codebase**                | Grep confirms the identical pattern or function signature exists elsewhere      |
| **0.70** | **Grep / Fact evidence: near match found (similar signature or logic)**            | Grep finds a closely related pattern, not an exact match                        |
| —       | **Grep / Fact evidence: no match found (confirms uniqueness of new code)**         | Discard reuse finding — absence of match means the code is not a duplicate      |

When reporting findings, include the confidence score in the output. Findings below 0.4 should carry an explicit "unconfirmed" label. Findings below 0.2 should be discarded unless the reviewer judges the risk warrants mention.

## Triage-Aware Batch Routing

Route findings to research validation based on their risk classification. This avoids wasting research cycles on low-risk obvious issues while ensuring high-risk findings get thorough validation.

| Risk Level | Validation Requirement               | Research Depth                                                                              |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------- |
| HIGH       | Validate with 2+ independent sources | Context7 + WebSearch (both required). If sources disagree, escalate to opus-level analysis. |
| MEDIUM     | Validate with 1 source               | Context7 OR WebSearch (whichever is most relevant to the finding type).                     |
| LOW        | Skip research validation             | Obvious issues (syntax errors, null derefs, typos) do not need external confirmation.       |

Cross-reference: See [references/triage-protocol.md](references/triage-protocol.md) for the full risk classification criteria used to assign HIGH/MEDIUM/LOW levels to findings.

## Batch Optimization

Group findings by validation type before dispatching research subagents. This reduces subagent count and avoids redundant tool calls.

**Grouping rules:**

- Combine related API checks into a single Context7 subagent when they target the same library (e.g., three React API concerns become one Context7 subagent with three queries against the React docs).
- Combine related security checks into a single WebSearch subagent when they fall under the same OWASP category (e.g., two XSS findings and one CSRF finding in the injection category become one subagent).
- Keep different validation types separate — do not mix Context7 and WebSearch work in the same subagent.

**Batch sizing:**

| Findings per Subagent | Expected Quality | Recommendation                                      |
| --------------------- | ---------------- | --------------------------------------------------- |
| 1-4                   | High             | Acceptable but may under-utilize the subagent       |
| 5-8                   | High             | Optimal — best throughput-to-quality ratio          |
| 9-10                  | Acceptable       | Upper bound; quality starts to degrade              |
| 11+                   | Degraded         | Diminishing returns — split into multiple subagents |

**Dispatch order:**

1. Slopsquatting detection (security-critical, fast, opus)
2. HIGH-risk findings (require 2+ sources, sonnet)
3. MEDIUM-risk findings (require 1 source, sonnet or opus)
4. LOW-risk findings (skip research, no subagent needed)
