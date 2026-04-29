# OWASP Top 10 (2021) Detection Patterns

Code patterns and detection heuristics for static analysis.

## Contents

1. [A01 Broken Access Control](#a01-broken-access-control)
2. [A02 Cryptographic Failures](#a02-cryptographic-failures)
3. [A03 Injection](#a03-injection)
4. [A04 Insecure Design](#a04-insecure-design)
5. [A05 Security Misconfiguration](#a05-security-misconfiguration)
6. [A06 Vulnerable Components](#a06-vulnerable-components)
7. [A07 Auth Failures](#a07-identification-and-authentication-failures)
8. [A08 Data Integrity](#a08-software-and-data-integrity-failures)
9. [A09 Logging Failures](#a09-security-logging-and-monitoring-failures)
10. [A10 SSRF](#a10-server-side-request-forgery)

---

## A01: Broken Access Control

**CWEs:** CWE-200, CWE-201, CWE-352, CWE-639, CWE-862, CWE-863

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Missing auth middleware | JS/TS | Route handler without `auth`, `protect`, `requireLogin` middleware |
| Direct object reference | Any | URL params used directly in DB queries: `params.id` in `findById` |
| CORS wildcard | JS/TS | `Access-Control-Allow-Origin: *` or `cors({ origin: '*' })` |
| Path traversal | Any | User input in file paths: `path.join(base, req.params.file)` without sanitization |
| Missing CSRF token | HTML | Forms with POST without `csrf`, `_token`, or `csrfmiddlewaretoken` |
| Privilege escalation | Any | Role checks using client-supplied values without server verification |

**Remediation:** Enforce server-side access control on every endpoint. Use allowlists, not denylists. Deny by default.

---

## A02: Cryptographic Failures

**CWEs:** CWE-259, CWE-327, CWE-331, CWE-328

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Weak hash | Any | `md5(`, `sha1(`, `hashlib.md5`, `crypto.createHash('md5')` |
| Hardcoded key | Any | `key = "..."`, `secret = "..."` near crypto operations |
| ECB mode | Any | `AES/ECB`, `mode=ECB`, `aes-128-ecb` |
| No salt | Any | Password hashing without salt parameter |
| Weak random | Any | `Math.random()`, `random.random()` for security-critical values |
| Plaintext storage | Any | Password/secret stored without hashing in DB schema |

**Remediation:** Use bcrypt/argon2 for passwords, AES-GCM for encryption, `crypto.randomBytes`/`secrets.token_bytes` for randomness.

---

## A03: Injection

**CWEs:** CWE-79, CWE-89, CWE-73, CWE-77, CWE-78

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| SQL injection | Any | String concatenation in SQL: `f"SELECT * FROM {table}"`, `"SELECT " + col` |
| Command injection | Any | `os.system(user_input)`, `exec(`, `subprocess.call(shell=True, cmd=user_input)` |
| XSS (reflected) | JS/TS | `innerHTML = req.query`, `dangerouslySetInnerHTML` with unescaped input |
| XSS (stored) | Any | User content rendered without escaping in templates |
| Path traversal | Any | `../` not filtered from file path inputs |
| Template injection | Python | `render_template_string(user_input)`, Jinja2 with `|safe` on user input |
| LDAP injection | Any | Unescaped user input in LDAP queries |
| NoSQL injection | JS/TS | `{ $where: user_input }`, unvalidated MongoDB query operators |

**Remediation:** Use parameterized queries, input validation, output encoding. Never construct queries with string concatenation.

---

## A04: Insecure Design

**CWEs:** CWE-209, CWE-256, CWE-501, CWE-522

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| No rate limiting | Any | Login/auth endpoints without rate limit middleware |
| Verbose errors | Any | Stack traces in production error responses |
| Missing input limits | Any | File upload without size limit, unbounded pagination |
| Credential in URL | Any | Password/token in query string parameters |

**Remediation:** Threat model during design. Implement rate limiting, input validation, and principle of least privilege.

---

## A05: Security Misconfiguration

**CWEs:** CWE-16, CWE-611, CWE-1004

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Debug mode | Python | `DEBUG = True` in production config |
| Default credentials | Any | `admin/admin`, `root/root`, `password`, `changeme` |
| Permissive headers | Any | Missing security headers: CSP, X-Frame-Options, HSTS |
| Directory listing | Any | `autoindex on`, `directory-listing: true` |
| XXE | Any | XML parser without disabling external entities |

**Remediation:** Harden default configs. Disable debug mode, directory listings, unnecessary features.

---

## A06: Vulnerable Components

**CWEs:** CWE-1035, CWE-1104

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Outdated dependency | Any | Lockfile versions significantly behind latest |
| Unmaintained package | Any | No updates in 2+ years (check via registry API) |
| Known CVE | Any | Package+version matching known CVE databases |
| Typosquatting risk | Any | Package names similar to popular packages but slightly different |

**Remediation:** Regular dependency updates. Use lockfiles. Monitor advisories. Pin exact versions.

---

## A07: Identification and Authentication Failures

**CWEs:** CWE-287, CWE-256, CWE-307, CWE-384

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Weak password policy | Any | No minimum length check, no complexity requirement |
| Missing brute force protection | Any | Login without lockout or rate limiting |
| Session fixation | Any | Session ID not regenerated after login |
| Plaintext password | Any | Password logged, stored, or transmitted without hashing |

**Remediation:** MFA, strong password policies, account lockout, session regeneration.

---

## A08: Software and Data Integrity Failures

**CWEs:** CWE-502, CWE-829

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Insecure deserialization | Python | `pickle.loads(user_input)`, `yaml.load()` without `Loader=SafeLoader` |
| Insecure deserialization | Java | `ObjectInputStream` on untrusted data |
| Missing integrity check | Any | CDN resources without `integrity` attribute |
| Auto-update without verification | Any | Code download and execution without signature verification |

**Remediation:** Validate integrity of all serialized data. Use `SafeLoader`, verify signatures.

---

## A09: Security Logging and Monitoring Failures

**CWEs:** CWE-117, CWE-223, CWE-532, CWE-778

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| Missing auth logging | Any | Login/logout/failed-auth not logged |
| Sensitive data in logs | Any | Password, token, SSN, credit card in log statements |
| No error monitoring | Any | Catch blocks that swallow errors silently |
| Missing audit trail | Any | Data modification without logging who/when |

**Remediation:** Log security events. Never log sensitive data. Monitor for anomalies.

---

## A10: Server-Side Request Forgery

**CWEs:** CWE-918

| Pattern | Language | Regex/Heuristic |
|---------|----------|-----------------|
| SSRF | Any | User-supplied URL passed to HTTP client: `requests.get(url)`, `fetch(url)` |
| Internal network access | Any | User input reaching internal IPs: `127.0.0.1`, `169.254.169.254`, `10.x`, `192.168.x` |
| DNS rebinding | Any | URL validation only at request time, not at DNS resolution |

**Remediation:** Validate and sanitize URLs. Use allowlists for domains/IPs. Block internal ranges.
