# Scope Boundary

Clear delineation between security-scanner and adjacent skills/activities.

## Contents

1. [Security-Scanner IS For](#security-scanner-is-for)
2. [Security-Scanner is NOT For](#security-scanner-is-not-for)
3. [Boundary with honest-review](#boundary-with-honest-review)
4. [Redirect Table](#redirect-table)

---

## Security-Scanner IS For

- **Proactive pre-deployment security audit** — scanning code before it ships
- **SAST pattern matching** — static analysis for known vulnerability patterns
- **Secrets detection** — finding hardcoded credentials and API keys
- **Dependency scanning** — checking lockfiles for known-vulnerable packages
- **OWASP/CWE mapping** — classifying findings against standard taxonomies
- **Compliance heuristics** — lightweight SOC2/GDPR/HIPAA code-level checks
- **Remediation guidance** — specific fix suggestions with code examples
- **SARIF output** — CI/CD integration via standard interchange format

---

## Security-Scanner is NOT For

| Activity | Why Not | Redirect To |
|----------|---------|-------------|
| Code review (quality, design, efficiency) | Different scope — reactive per-change review | honest-review |
| Penetration testing | Requires runtime testing, not static analysis | External tooling (Burp Suite, OWASP ZAP) |
| Runtime security monitoring | Requires deployed infrastructure | External tooling (Falco, Datadog) |
| Supply chain deep analysis | Requires runtime dependency resolution | External tooling (Snyk, Dependabot) |
| Writing code or fixing bugs | Read-only analysis only | Direct coding |
| Infrastructure security scanning | IaC-specific security checks | infrastructure-coder (security mode) |
| Compliance certification | Code scan is necessary but not sufficient | Compliance auditor |
| Malware analysis | Behavioral analysis, not pattern matching | External tooling |

---

## Boundary with honest-review

| Dimension | security-scanner | honest-review |
|-----------|-----------------|---------------|
| **Timing** | Pre-deployment audit | Per-change review |
| **Trigger** | Explicit invocation or scheduled scan | Code changes (git diff, PR) |
| **Focus** | Security vulnerabilities and compliance | Code quality, design, efficiency |
| **Depth** | Security-specific patterns only | All code quality dimensions |
| **Output** | Findings with CWE/OWASP mapping | Findings with confidence scores |
| **Modifications** | Never (read-only) | Suggests fixes, can implement with approval |
| **Dependencies** | Scans lockfiles for CVEs | Reviews dependency choices for design |
| **Secrets** | Regex-based detection | Not in scope |
| **Compliance** | SOC2/GDPR/HIPAA heuristics | Not in scope |

**When both should run:**
- Pre-release: run security-scanner first for security audit, then honest-review for quality
- The skills are complementary, not overlapping

---

## Redirect Table

When a user request falls outside scope, respond with:

| Request Pattern | Response |
|----------------|----------|
| "Review this code" / "What do you think of this PR" | "For code review, use `/honest-review`. Security-scanner is for pre-deployment security audits." |
| "Pen test this" / "Try to hack this" | "Security-scanner performs static analysis only. For penetration testing, use dedicated tools like Burp Suite or OWASP ZAP." |
| "Monitor for attacks" | "Security-scanner is a pre-deployment tool. For runtime monitoring, consider Falco, Datadog, or similar." |
| "Fix this vulnerability" | Present the finding and remediation guidance, but do not modify files. State: "This skill is read-only. Apply the suggested fix manually or ask for implementation assistance." |
| "Is this SOC2 certified?" | "Compliance mode provides heuristic indicators only. Code-level checks are necessary but not sufficient for certification. Consult a certified auditor." |
