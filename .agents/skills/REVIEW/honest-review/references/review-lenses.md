# Creative Review Lenses

Eight techniques for finding issues that standard checklist review misses.
Apply at least 2 lenses per review scope. Pick based on code characteristics. For security-sensitive code, Adversary lens is mandatory.

## Contents

- [Inversion Lens](#inversion-lens)
- [Deletion Lens](#deletion-lens)
- [Newcomer Lens](#newcomer-lens)
- [Incident Lens](#incident-lens)
- [Evolution Lens](#evolution-lens)
- [Adversary Lens](#adversary-lens)
- [Compliance Lens](#compliance-lens)
- [Dependency Lens](#dependency-lens)

## Inversion Lens

"What if this assumption were false?"

**When to apply:** Code with implicit assumptions — config always present, network always available, user always authenticated, data always valid.

**Method:**

1. List every assumption the code makes (inputs, environment, ordering, availability).
2. For each assumption, invert it: the config is missing, the network is down, the user is unauthenticated, the data is malformed.
3. Ask: does the code handle the inverted case, or does it silently break?
4. Check for missing guards, missing defaults, and missing error paths.

**Expected output:** List of unhandled assumption violations with severity ratings.

**Cross-reference:** Security items in checklists.md (broken access control), resilience items (fallbacks, graceful degradation).

## Deletion Lens

"What if we deleted this code?"

**When to apply:** Mature codebases, code touched by many authors, code with unclear purpose.

**Method:**

1. For each function, class, or module in scope, ask: what breaks if this is deleted?
2. If nothing breaks (no tests fail, no callers exist), flag it as potentially dead code.
3. Check git blame for the last meaningful change. Stale code with no recent activity strengthens the dead-code signal.
4. Distinguish between truly dead code, likely dead code, and unclear-purpose code.

**Expected output:** Candidates for deletion with confidence level (dead, likely dead, unclear).

**Cross-reference:** Correctness simplification items in checklists.md (dead code, unused imports).

## Newcomer Lens

"Could a new team member understand this in 15 minutes?"

**When to apply:** All code — always useful. Prioritize complex modules, unclear naming, and sparse documentation.

**Method:**

1. Read the code as if encountering it for the first time. Forget all existing context.
2. Track every moment of confusion: unclear names, implicit context, non-obvious control flow, magic values, undocumented side effects.
3. Time yourself. If understanding takes more than 15 minutes for a single module, flag excessive cognitive load.
4. Note where you had to read other files to understand the current one — that is implicit coupling.

**Expected output:** Cognitive load hotspots with specific confusion points and suggested clarifications.

**Cross-reference:** Correctness items in checklists.md (readability), design items (cognitive complexity, naming).

## Incident Lens

"What would cause a 3am page?"

**When to apply:** Production services, data pipelines, anything with SLAs or uptime requirements.

**Method:**

1. Trace failure modes: what happens when external dependencies fail? When disk fills? When memory spikes? When a downstream service returns garbage?
2. Simulate a bad deploy: what happens if this code ships with a bug? Is rollback safe?
3. Identify missing circuit breakers, missing fallbacks, missing alerts, and missing graceful degradation paths.
4. Estimate likelihood and blast radius for each scenario.

**Expected output:** Incident scenarios ranked by likelihood and blast radius, with gaps in observability and resilience.

**Cross-reference:** Resilience and observability items in checklists.md.

## Evolution Lens

"How painful would common changes be?"

**When to apply:** Code expected to evolve — new features planned, growing team, scaling anticipated.

**Method:**

1. Imagine 3 likely future changes: add a new field, support a new provider, change a business rule.
2. For each change, count the files that must be touched. If a single-concept change requires editing 5+ files, flag change amplification.
3. Identify coupling hotspots: modules where unrelated changes collide.
4. Check for extension points. Determine whether the code supports addition without modification (open-closed alignment).

**Expected output:** Change amplification scores per scenario and a list of coupling hotspots with remediation suggestions.

**Cross-reference:** Design items in checklists.md (coupling, cohesion), backward compatibility items.

## Adversary Lens

"What would an attacker do with this code?"

**When to apply:** Any code handling auth, user input, external data, file I/O, network requests, or cryptographic operations. For security-sensitive code, this lens is mandatory.

**Method:**

1. Enumerate attacker goals: data exfiltration, privilege escalation, denial of service, lateral movement.
2. Map attack surfaces: every input path, every trust boundary crossing, every external interaction.
3. For each attack surface, trace: can an attacker reach this code? What can they control? What is the worst outcome?
4. Check for OWASP Top 10 patterns: injection, broken auth, sensitive data exposure, XXE, broken access control, security misconfiguration, XSS, insecure deserialization, known vulnerable components, insufficient logging.

**Expected output:** Attack scenarios ranked by feasibility and impact, with specific code paths identified.

**Cross-reference:** Security items in checklists.md.

## Compliance Lens

"Does this code meet regulatory and policy requirements?"

**When to apply:** Code handling personal data (GDPR, CCPA), financial transactions (PCI-DSS, SOX), healthcare data (HIPAA), or operating in regulated industries. Also apply for internal policy compliance (logging, data retention, access controls).

**Method:**

1. Identify which regulations apply based on data types handled (PII, financial, health, authentication).
2. For each applicable regulation, check key requirements: data minimization, consent tracking, retention limits, audit logging, encryption at rest/in transit, right to deletion.
3. Verify that data flows cross only expected jurisdictional boundaries.
4. Check for compliance gaps: missing audit trails, unencrypted sensitive data, overly broad data collection.

**Expected output:** Compliance gaps with regulatory references and remediation suggestions.

**Cross-reference:** Security and configuration items in checklists.md.

## Dependency Lens

"Is the dependency graph healthy?"

**When to apply:** Projects with 10+ dependencies, projects using unfamiliar packages, or any review where dependency health is relevant.

**Method:**

1. Enumerate direct and key transitive dependencies. Check total count against project complexity — flag bloated dependency trees.
2. For each critical dependency: check maintenance status (last release, open issues, bus factor), known vulnerabilities (CVE databases), license compatibility, and download trends.
3. Identify dependency concentration risk: does 80% of functionality depend on one unmaintained package?
4. Check for version pinning, lockfile integrity, and reproducible builds.

**Expected output:** Dependency health scorecard with risk ratings per package and overall supply chain assessment.

**Cross-reference:** AI code smells (slopsquatting) and security items in checklists.md. Also see references/supply-chain-security.md.

## Cost Lens

"What does this cost to run?"

**When to apply:** Cloud-deployed services, SaaS applications, projects with pay-per-use APIs, or any code with infrastructure cost implications.

**Method:**

1. Identify cost-sensitive operations: external API calls, database queries, cloud storage operations, compute-intensive loops, network egress.
2. Check for unbounded loops or recursion that could trigger runaway costs (e.g., pagination without limits, retry without backoff).
3. Check caching: are expensive operations cached? Is cache invalidation correct? Are TTLs reasonable?
4. Check batch vs. single: are N+1 queries or per-item API calls used where batch operations exist?
5. Estimate cost scaling: does cost grow linearly, quadratically, or exponentially with input size?

**Expected output:** Cost risk factors with estimated scaling behavior and optimization suggestions.

**Cross-reference:** Efficiency items in checklists.md (N+1 queries, pagination limits).

## Sustainability Lens

"Will this scale without linear cost growth?"

**When to apply:** Systems expected to grow significantly, services with elastic scaling, or any review where long-term operational efficiency matters.

**Method:**

1. Check scaling model: does the system scale horizontally? Are there single points of bottleneck?
2. Check cold start penalties: serverless functions, container startup, connection pool initialization — are these optimized?
3. Check resource lifecycle: connections, file handles, memory — are they pooled and reused or created per-request?
4. Check data growth: does storage grow unboundedly? Are there retention policies, archival strategies, or cleanup jobs?
5. Check observability cost: does logging/tracing volume scale with traffic? Are there sampling strategies for high-volume paths?

**Expected output:** Sustainability assessment with scaling bottlenecks and long-term operational risks.

**Cross-reference:** Efficiency items in checklists.md, Resilience items (circuit breakers, backpressure).
