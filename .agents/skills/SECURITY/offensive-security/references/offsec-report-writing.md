# Offensive Security — Report Writing

> Sources:
> - PTES Reporting: http://www.pentest-standard.org/index.php/Reporting
> - HackTheBox Report Guide: https://www.hackthebox.com/blog/penetration-testing-reports-template-and-guide
> - PlexTrac Finding Template: https://plextrac.com/penetration-testing-report-example-a-blueprint-for-success/

---

## Report Structure

```
1. Cover Page
2. Table of Contents
3. Executive Summary          ← non-technical; 1-2 pages max
4. Scope and Methodology
5. Summary of Findings        ← prioritised table; all audiences read this
6. Detailed Findings          ← one section per finding
7. Strategic Recommendations  ← beyond individual fixes
8. Appendices                 ← raw tool output, credentials found, scan logs
```

---

## Executive Summary

Audience: executives, decision-makers, non-technical stakeholders. No jargon,
no CVE IDs, no exploit details.

Content:
- Engagement objective and dates
- Overall risk posture (one sentence)
- Count of findings by severity
- 2-3 most critical issues in plain language with business impact
- Top recommended actions

Length: 1-2 pages. Anything longer will not be read.

```
Example tone:
"An attacker on the internet could access the customer database without 
authentication, exposing personal data for approximately 45,000 users. 
This finding requires immediate remediation."
```

---

## Scope and Methodology

- In-scope assets (exact list from authorisation document)
- Out-of-scope assets (explicit — prevents ambiguity)
- Test type: black-box / grey-box / white-box
- Dates and times of testing
- Tester names and contact
- Frameworks referenced: PTES, OWASP WSTG, NIST SP 800-115
- Tools used (names and versions — appendix if long)
- Limitations: what could not be tested and why

---

## Summary of Findings Table

One row per finding. Sorted by severity descending.

| ID | Title | Severity | CVSS | Affected Asset | Status |
|---|---|---|---|---|---|
| F-01 | Unauthenticated SQL Injection | Critical | 9.8 | api.target.com/login | Open |
| F-02 | Stored XSS in Admin Panel | High | 8.2 | admin.target.com | Open |
| F-03 | Missing Security Headers | Low | 3.1 | target.com | Open |

---

## Detailed Finding Template

Every finding uses the same structure. Consistency makes the report scannable
and makes remediation tracking possible.

```
Finding ID:     F-01
Title:          Unauthenticated SQL Injection in Login Endpoint
Severity:       Critical
CVSS Score:     9.8
CVSS Vector:    CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Asset:          https://api.target.com/v1/login
Discovered:     2024-11-15 14:32 UTC

Description:
The `username` parameter in the login endpoint is concatenated directly into
a SQL query without parameterisation. An unauthenticated attacker can extract
the full database contents, including hashed credentials and PII.

Steps to Reproduce:
1. Send POST to /v1/login with body: username=admin'--&password=x
2. Observe successful authentication response
3. Use sqlmap -u ... to confirm full database dump

Evidence:
[Screenshot: HTTP request and response]
[Screenshot: extracted database table listing]

Impact:
Full database read access. Exposure of 45,000 user records including email
addresses, bcrypt hashes, and order history. Authentication bypass possible
for all accounts.

Remediation:
Use parameterised queries or prepared statements for all database interactions.
Do not construct SQL strings through string concatenation.
Short-term: Add WAF rule to block obvious SQL metacharacters on this endpoint.
Long-term: Audit all database queries across the application.

References:
- OWASP SQL Injection: https://owasp.org/www-community/attacks/SQL_Injection
- CWE-89: https://cwe.mitre.org/data/definitions/89.html
```

---

## Writing Quality Rules

**Clarity over completeness.** A finding with clear impact and a single
reproducible PoC is more valuable than a finding with six screenshots and
no explanation.

**Business impact in every finding.** "Allows SQL injection" is not impact.
"Allows an unauthenticated attacker to read all customer records" is impact.

**Remediation must be specific.** "Fix the vulnerability" is not remediation.
Specify: what to change, what library/pattern to use, what to avoid.

**One finding per vulnerability class per asset.** Do not group all XSS across
ten pages into one finding — each distinct location and impact gets its own
entry. Do not create ten near-identical findings for the same root cause.

**Severity is not marketing.** Do not inflate severity to appear thorough.
Do not deflate to spare the client embarrassment. Score accurately, defend
the CVSS vector if challenged.

---

## Evidence Standards

- Screenshot per finding — HTTP request and response at minimum
- Annotate screenshots — highlight the relevant data, redact irrelevant PII
- Include timestamps on all evidence
- Raw tool output (nmap, sqlmap, etc.) belongs in appendices, not in findings
- Do not include actual data exfiltrated — document existence and data class only

---

## Remediation Prioritisation

Group remediation into timeframes in the strategic recommendations section:

| Timeframe | Criteria | Examples |
|---|---|---|
| Immediate (24-48h) | Critical / actively exploitable / data exposure | SQLi, auth bypass, exposed credentials |
| Short-term (2 weeks) | High severity / likely to be exploited | Stored XSS, IDOR, unpatched services |
| Medium-term (1-3 months) | Medium severity / hardening | Missing headers, insecure session config |
| Long-term (roadmap) | Architectural / systemic issues | Input validation strategy, patching cadence |

---

## Handling Sensitive Data Found

Never include actual credentials, PII, or exfiltrated data in the report body.
- State the data class and estimated volume: "BCrypt hashed passwords for
  approximately 45,000 accounts"
- Notify the client immediately if critical data (PII, financial, credentials)
  was exposed — do not wait for the final report
- Include the notification timestamp and channel in the report

---

## Delivery and Confidentiality

- Deliver as encrypted PDF or via secure portal — never plain email attachment
- Include data handling notice: "Destroy after remediation confirmed"
- Retain a copy per engagement agreement (typical: 1 year)
- Report is confidential — not to be shared outside the engagement parties

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Executive summary with CVE IDs and payloads | Non-technical language; business impact only |
| Findings without reproduction steps | Every finding must be independently reproducible |
| CVSS score without vector string | Always include both |
| Remediation as "apply patches" | Specific instructions: what, how, with what |
| Raw tool output in finding body | Tool output in appendix; findings are human-written |
| Severity inflation | Score accurately; defend with vector if challenged |
| Grouping all instances of one vuln class | One finding per distinct affected asset/context |
| Actual PII in evidence screenshots | Redact; document data class and volume only |
