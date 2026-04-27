# Offensive Security — Disclose

> Sources:
> - OWASP Vulnerability Disclosure Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Vulnerability_Disclosure_Cheat_Sheet.html
> - CISA CVD Program: https://www.cisa.gov/coordinated-vulnerability-disclosure-process
> - ISO/IEC 29147 — Vulnerability Disclosure standard
> - CERT/CC Guide to CVD: https://resources.sei.cmu.edu/library/asset-view.cfm?assetid=503330

---

## Disclosure Models

| Model | How | When appropriate |
|---|---|---|
| **Private** | Report to vendor only; vendor controls publication timing | Default for most engagements; required by most bug bounty programmes |
| **Coordinated (CVD)** | Private report + agreed publication timeline | Standard practice; gives vendor time to patch before details go public |
| **Full** | Immediate public release of all details | Last resort when vendor is unresponsive or actively suppressing; damages trust |

Default to coordinated. Full disclosure is a pressure lever, not a default.

---

## Standard CVD Timeline

| Phase | Action | Typical window |
|---|---|---|
| Day 0 | Find and document vulnerability | — |
| Day 1 | Report to vendor / programme | As soon as report is ready |
| Day 1–7 | Vendor acknowledges receipt | Expected within 7 days |
| Day 1–90 | Vendor develops and deploys fix | 90 days is the Google Project Zero standard |
| Day 90 | Public disclosure if unpatched | With or without fix |
| Extended | By mutual agreement only | For critical infrastructure, complex fixes |

CISA escalation: if vendor unresponsive after 45 days of contact attempts, CISA may disclose independently.

---

## How to Report

**Step 1 — Find the contact channel (in order):**
1. Programme page on HackerOne, Bugcrowd, Intigriti (check scope first)
2. `security.txt` at `https://target.com/.well-known/security.txt`
3. `security@target.com` or `psirt@target.com`
4. CERT/CC VINCE platform if vendor is unresponsive
5. National CERT/CSIRT as last resort

**Step 2 — Report content (minimum):**
```
Vulnerability class: [e.g. SQLi, RCE, IDOR]
Affected asset: [URL, IP, version]
CVSS vector: [CVSS:3.1/AV:N/AC:L/...]
Severity: [Critical / High / Medium / Low]
Steps to reproduce: [numbered, reproducible]
PoC: [minimal, non-destructive evidence]
Impact: [what an attacker could achieve]
Discovered: [date]
Reporter: [your handle / contact]
```

Use PGP/GPG if the vendor provides a key. For bug bounty platforms, use the
platform's submission form directly — do not email separately.

**Step 3 — After submission:**
- Record submission timestamp
- Do not disclose publicly while awaiting response
- Follow up after 7 days if no acknowledgement
- Do not test further while report is open — duplicate reports waste triage time

---

## Legal Boundaries

**Safe harbour:** many bug bounty programmes include safe harbour language
protecting good-faith testing within scope. Read the policy before testing —
safe harbour does not apply outside defined scope.

**Extortion line:** demanding payment as a condition of not disclosing is
extortion in most jurisdictions, regardless of how it is framed. Bug bounty
payments are rewards for findings, not ransoms for silence.

**Tax:** bug bounty payments are income. Reporting obligations vary by
jurisdiction.

**CFAA / Computer Fraud and Abuse Act (US):** authorisation is the legal
defence. Unauthorised access, even benign, is a criminal risk.

**GDPR / data protection:** if personal data is found during testing, do not
retain, copy, or exfiltrate it. Document its existence in the report and
notify the vendor of the exposure immediately.

---

## CVE Assignment

A CVE (Common Vulnerabilities and Exposures) ID gives a finding a globally
unique, searchable identifier. Request one when:
- The vulnerability affects software used by others beyond the target
- The fix requires users to update (patch Tuesday, release note)
- The finding will be published publicly

**To request a CVE:**
- If the vendor is a CNA (CVE Numbering Authority): they assign it themselves
- If not: submit to MITRE via https://cve.mitre.org/cve/request_id.html
- Or via CERT/CC if the vendor is unresponsive

Include the CVE ID in the public write-up once assigned.

---

## Open-Sourcing Findings

Publishing a write-up after disclosure adds value to the community. Best
practice:

- Wait until the vendor has shipped a fix and the CVE is published
- Include: timeline, vulnerability class, impact, PoC (sanitised), remediation
- Do not include: data accessed during testing, credentials, PII
- Credit the vendor's response (or note lack thereof) — this builds
  accountability norms

Platforms: personal blog, HackerOne Hacktivity (if programme allows),
GitHub, Exploit-DB (for CVEs with public PoCs).

---

## Bug Bounty Platforms

| Platform | Notes |
|---|---|
| HackerOne | Largest; public Hacktivity feed; wide programme range |
| Bugcrowd | Strong enterprise programmes; good for API/web |
| Intigriti | European focus; growing programme list |
| YesWeHack | French/European origin; good for compliance-conscious targets |
| Synack | Invite-only; vetted researchers; higher-quality programmes |

Read each programme's policy in full. Scope, testing restrictions, payout
ranges, and disclosure rules differ substantially between programmes.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Publishing before vendor patches | Coordinate; default 90-day window |
| Demanding payment to not disclose | Extortion; never acceptable |
| Testing further while report is open | Stop testing; avoid duplicate reports |
| Disclosing full PoC with active exploit | Sanitise PoC; omit weaponised details |
| Retaining PII found during testing | Document existence only; do not copy |
| Skipping safe harbour check | Read programme policy before any testing |
| No follow-up after 7 days silence | Follow up; escalate to CERT if needed |
