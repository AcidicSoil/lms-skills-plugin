# Compliance Checklists

Lightweight heuristic checklists for SOC2, GDPR, and HIPAA. These are code-level indicators only — not certification guidance.

## Contents

1. [SOC2 Controls](#soc2-controls)
2. [GDPR Controls](#gdpr-controls)
3. [HIPAA Controls](#hipaa-controls)
4. [Scoring Methodology](#scoring-methodology)
5. [Disclaimers](#disclaimers)

---

## SOC2 Controls

SOC2 Trust Services Criteria mapped to code-level indicators:

| ID | Control | Pass Criteria | Evidence Patterns |
|----|---------|---------------|-------------------|
| SOC2-AC-1 | Access Control | Authentication mechanism present | auth middleware, login handlers, JWT/OAuth |
| SOC2-AC-2 | RBAC | Role-based access control | role checks, permission guards, RBAC middleware |
| SOC2-LOG-1 | Audit Logging | Security events logged | audit log calls, activity logging |
| SOC2-LOG-2 | Error Logging | Error monitoring configured | error handler, Sentry/Bugsnag/Rollbar integration |
| SOC2-ENC-1 | Encryption at Rest | Data encryption present | encrypt/cipher calls, KMS, bcrypt/argon2 |
| SOC2-ENC-2 | TLS/HTTPS | Transport encryption enforced | HTTPS config, TLS certs, HSTS headers |
| SOC2-CHG-1 | Version Control | Git in use | .git directory, changelog |
| SOC2-CHG-2 | CI/CD | Automated pipeline | GitHub Actions, CircleCI, Jenkins config |
| SOC2-MON-1 | Health Checks | Service monitoring | /health, /status endpoints, liveness probes |
| SOC2-SEC-1 | Input Validation | Input sanitization | validation libraries, sanitize calls |

---

## GDPR Controls

GDPR articles mapped to code-level indicators:

| ID | Control | Pass Criteria | Evidence Patterns |
|----|---------|---------------|-------------------|
| GDPR-CON-1 | Consent (Art. 6-7) | Consent collection mechanism | consent forms, opt-in flows, cookie consent |
| GDPR-DEL-1 | Right to Erasure (Art. 17) | User data deletion | delete user endpoints, anonymize functions |
| GDPR-PORT-1 | Data Portability (Art. 20) | Data export capability | export endpoints, CSV/JSON download |
| GDPR-MIN-1 | Data Minimization (Art. 5) | Minimal data collection | required vs optional fields, data retention |
| GDPR-ENC-1 | Data Protection (Art. 32) | Personal data encrypted | encryption of PII fields, at-rest encryption |
| GDPR-LOG-1 | Processing Records (Art. 30) | Data access audit trail | processing logs, access records |
| GDPR-BREACH-1 | Breach Notification (Art. 33-34) | Incident response procedure | breach handling code, security alerts |

---

## HIPAA Controls

HIPAA Security Rule mapped to code-level indicators:

| ID | Control | Pass Criteria | Evidence Patterns |
|----|---------|---------------|-------------------|
| HIPAA-AC-1 | Unique User ID (164.312(a)(2)(i)) | User identification | unique IDs, authentication |
| HIPAA-AC-2 | Emergency Access (164.312(a)(2)(ii)) | Break-glass procedure | emergency access, admin override |
| HIPAA-AUD-1 | Audit Controls (164.312(b)) | PHI access audit trail | audit logs, access monitoring |
| HIPAA-INT-1 | Integrity (164.312(c)(1)) | Data integrity controls | checksums, hash verification |
| HIPAA-TRANS-1 | Transmission Security (164.312(e)(1)) | PHI encrypted in transit | TLS, HTTPS enforcement |
| HIPAA-ENC-1 | Encryption (164.312(a)(2)(iv)) | PHI encrypted at rest | AES encryption, KMS |

---

## Scoring Methodology

| Status | Score Weight | Criteria |
|--------|------------|----------|
| PASS | 1.0 | 2+ evidence patterns found across files |
| PARTIAL | 0.5 | 1 evidence pattern found |
| FAIL | 0.0 | No evidence patterns found |

**Overall score:** `(sum of weights / total controls) * 100`

Score interpretation:
- 80-100%: Strong compliance posture at code level
- 60-79%: Moderate — address FAIL controls
- 40-59%: Weak — significant gaps
- Below 40%: Critical — major compliance risk

---

## Disclaimers

State these explicitly in every compliance report:

1. This is a **heuristic code-level scan**, not a compliance audit
2. Code indicators are **necessary but not sufficient** for compliance
3. Compliance requires organizational policies, procedures, and documentation beyond code
4. This scan **cannot replace** a certified auditor or compliance assessment
5. Results should inform a compliance roadmap, not serve as certification evidence
