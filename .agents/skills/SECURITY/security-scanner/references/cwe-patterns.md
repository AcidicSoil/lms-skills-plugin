# CWE Common Weakness Patterns

Top 50 CWEs with detection patterns and remediation guidance for SAST scanning.

## Contents

1. [Injection CWEs](#injection-cwes)
2. [Authentication/Access CWEs](#authenticationaccess-cwes)
3. [Crypto CWEs](#crypto-cwes)
4. [Resource/Memory CWEs](#resourcememory-cwes)
5. [Input Validation CWEs](#input-validation-cwes)
6. [Information Exposure CWEs](#information-exposure-cwes)
7. [Severity Assignment](#severity-assignment)

---

## Injection CWEs

| CWE | Name | Detection Pattern | Remediation |
|-----|------|-------------------|-------------|
| CWE-78 | OS Command Injection | `os.system()`, `subprocess(shell=True)`, backtick exec with user input | Use subprocess with list args, no shell=True |
| CWE-79 | Cross-site Scripting | `innerHTML`, `dangerouslySetInnerHTML`, `document.write(user)` | Output encoding, CSP headers |
| CWE-89 | SQL Injection | String concat in SQL, f-strings in queries | Parameterized queries, ORM |
| CWE-94 | Code Injection | `eval()`, `exec()`, `Function()` with user input | Remove eval, use safe alternatives |
| CWE-917 | Expression Language Injection | Template rendering with user input | Sandbox templates, escape input |
| CWE-918 | SSRF | HTTP client with user-supplied URL | URL allowlist, block internal ranges |

## Authentication/Access CWEs

| CWE | Name | Detection Pattern | Remediation |
|-----|------|-------------------|-------------|
| CWE-200 | Exposure of Sensitive Info | Error messages with stack traces, debug info in prod | Custom error handlers, no debug in prod |
| CWE-250 | Unnecessary Privileges | Running as root, admin-level service accounts | Principle of least privilege |
| CWE-269 | Improper Privilege Mgmt | Role escalation without verification | Server-side role checks |
| CWE-287 | Improper Authentication | Missing auth on endpoints, auth bypass patterns | Auth middleware on all routes |
| CWE-306 | Missing Auth for Critical Function | Admin endpoints without auth check | Require authentication everywhere |
| CWE-307 | Improper Restriction of Auth Attempts | Login without rate limit or lockout | Rate limiting, account lockout |
| CWE-352 | CSRF | Forms without CSRF tokens, state-changing GET | CSRF tokens, SameSite cookies |
| CWE-384 | Session Fixation | Session not regenerated after auth | Regenerate session ID on login |
| CWE-522 | Insufficiently Protected Credentials | Plaintext password storage/transmission | bcrypt/argon2, TLS |
| CWE-639 | Insecure Direct Object Reference | User ID from request used directly in DB lookup | Authorization check per object |
| CWE-862 | Missing Authorization | No access control check before operation | Check permissions on every request |
| CWE-863 | Incorrect Authorization | Auth check present but bypassable | Test auth boundaries, use framework |

## Crypto CWEs

| CWE | Name | Detection Pattern | Remediation |
|-----|------|-------------------|-------------|
| CWE-259 | Hardcoded Password | `password = "..."`, `secret = "..."` literals | Environment variables, vault |
| CWE-321 | Hardcoded Crypto Key | Encryption key as string literal | Key management service |
| CWE-327 | Broken/Risky Crypto | MD5, SHA1, DES, RC4, ECB mode | AES-GCM, SHA-256+, bcrypt |
| CWE-328 | Reversible One-Way Hash | Base64 encoding as "encryption" | Use proper crypto primitives |
| CWE-331 | Insufficient Entropy | `Math.random()`, `random.random()` for secrets | `crypto.randomBytes`, `secrets` module |
| CWE-338 | Weak PRNG | Non-crypto random for tokens/keys | Cryptographic PRNG |

## Resource/Memory CWEs

| CWE | Name | Detection Pattern | Remediation |
|-----|------|-------------------|-------------|
| CWE-22 | Path Traversal | User input in file paths without sanitization | Validate, canonicalize, chroot |
| CWE-400 | Uncontrolled Resource Consumption | No limits on upload size, query results, loop iterations | Set limits, pagination |
| CWE-404 | Resource Not Released | Open files/connections without close/finally | Context managers, try-finally |
| CWE-502 | Deserialization of Untrusted Data | `pickle.loads`, `yaml.load()`, `JSON.parse` of arbitrary | SafeLoader, schema validation |
| CWE-611 | XXE | XML parsing without disabling external entities | Disable DTD, external entities |
| CWE-770 | Allocation Without Limits | Unbounded collections from user input | Max size limits |

## Input Validation CWEs

| CWE | Name | Detection Pattern | Remediation |
|-----|------|-------------------|-------------|
| CWE-20 | Improper Input Validation | Missing validation on user input fields | Validate all input at boundaries |
| CWE-116 | Improper Encoding/Escaping | User content rendered without HTML escaping | Context-appropriate encoding |
| CWE-129 | Improper Array Index Validation | Array access with unchecked user index | Bounds checking |
| CWE-601 | Open Redirect | Redirect URL from user input without validation | Allowlist redirect targets |
| CWE-829 | Inclusion of Untrusted Functionality | CDN without SRI, dynamic script inclusion | Subresource integrity, CSP |

## Information Exposure CWEs

| CWE | Name | Detection Pattern | Remediation |
|-----|------|-------------------|-------------|
| CWE-209 | Error Info Exposure | Stack traces in HTTP responses | Custom error pages |
| CWE-215 | Debug Info Exposure | Debug mode in production config | Disable debug in prod |
| CWE-312 | Cleartext Storage | Secrets in config files, unencrypted DB fields | Encrypt at rest, use vault |
| CWE-319 | Cleartext Transmission | HTTP endpoints for sensitive data | Enforce HTTPS/TLS |
| CWE-532 | Info Exposure Through Logs | Logging passwords, tokens, PII | Sanitize log output |
| CWE-548 | Directory Listing | Web server directory listing enabled | Disable directory listing |

---

## Severity Assignment

Map CWE to severity based on exploitability and impact:

| Severity | Criteria | Example CWEs |
|----------|----------|-------------|
| CRITICAL | Remote code execution, auth bypass, data breach | CWE-78, CWE-89, CWE-287, CWE-502 |
| HIGH | Significant data exposure, privilege escalation | CWE-79, CWE-259, CWE-522, CWE-918 |
| MEDIUM | Limited exposure, requires specific conditions | CWE-352, CWE-601, CWE-400, CWE-611 |
| LOW | Informational, hardening recommendation | CWE-209, CWE-215, CWE-548 |
| INFO | Best practice suggestion, no direct vulnerability | CWE-1004, CWE-16 |

Confidence adjustment:
- Pattern matches literal string → confidence +0.2
- Pattern matches variable/dynamic context → confidence +0.1
- Pattern in test/mock/example file → confidence -0.3
- Pattern in commented code → confidence -0.5
