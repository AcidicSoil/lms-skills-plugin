# Secrets Detection Guide

Patterns, false positive handling, and triage guidance for secrets scanning.

## Contents

1. [Secret Categories](#secret-categories)
2. [High-Confidence Patterns](#high-confidence-patterns)
3. [False Positive Indicators](#false-positive-indicators)
4. [Triage Protocol](#triage-protocol)
5. [Git History Scanning](#git-history-scanning)

---

## Secret Categories

| Category | Risk | Examples |
|----------|------|---------|
| Cloud provider keys | CRITICAL | AWS AKIA*, GCP service accounts, Azure connection strings |
| API tokens | CRITICAL | GitHub (ghp_), Stripe (sk_live_), OpenAI (sk-), Anthropic (sk-ant-) |
| Database credentials | CRITICAL | Connection strings with user:pass@host |
| Private keys | CRITICAL | SSH, PGP, TLS private keys |
| Service tokens | HIGH | Slack (xoxb-), SendGrid (SG.), Twilio (SK) |
| Generic secrets | HIGH | password/secret/token assignments with string values |
| Webhook URLs | MEDIUM | Slack webhooks, Discord webhooks |
| High-entropy strings | LOW | Long random strings near secret-like variable names |

---

## High-Confidence Patterns

Patterns with structural prefixes are highly reliable (confidence 0.9+):

| Pattern | Prefix | Confidence |
|---------|--------|------------|
| AWS Access Key | `AKIA` followed by 16 uppercase alphanumeric | 0.95 |
| GitHub Token | `ghp_` followed by 36 alphanumeric | 0.95 |
| Stripe Secret | `sk_live_` followed by 24+ alphanumeric | 0.95 |
| SSH Private Key | `-----BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY-----` | 0.99 |
| Database URL | Protocol prefix with `user:pass@host` structure | 0.90 |

Patterns requiring context analysis (confidence 0.5-0.8):

| Pattern | Context Needed | Confidence Range |
|---------|---------------|-----------------|
| Generic password assignment | Check if test/example file | 0.4-0.8 |
| High-entropy string | Check Shannon entropy > 3.5 | 0.3-0.7 |
| JWT token | Check if example/documentation | 0.5-0.8 |
| API key variable | Check if placeholder/template | 0.4-0.7 |

---

## False Positive Indicators

Reduce confidence when these indicators are present:

| Indicator | Confidence Modifier |
|-----------|-------------------|
| File path contains `test`, `mock`, `fixture`, `example`, `sample` | -0.3 |
| Line contains `example`, `placeholder`, `YOUR_`, `xxx`, `changeme` | -0.4 |
| Variable value is all same character or sequential | -0.5 |
| Value is a well-known test key (e.g., Stripe test keys `sk_test_`) | -0.5 |
| Line is in a comment | -0.3 |
| File is `.md`, `.txt`, `.rst` documentation | -0.2 |
| File is `.env.example` or `.env.template` | -0.4 |
| Value matches format but entropy < 3.0 | -0.3 |

---

## Triage Protocol

After detection, triage each finding:

1. **Is it tracked by git?**
   - Tracked + not in .gitignore → CRITICAL (exposed in repo history)
   - Untracked + in .gitignore → INFO (properly excluded)
   - In .env.example with placeholder → false positive, discard

2. **Is it a real value or placeholder?**
   - Contains `YOUR_`, `xxx`, `changeme`, `REPLACE_ME` → placeholder, discard
   - High entropy (Shannon > 4.0) + structural prefix → likely real
   - Low entropy or repeating pattern → likely placeholder

3. **Is it in git history?**
   - `git log --diff-filter=D -p -- <file>` to check deleted files
   - Even if .gitignored now, if previously committed → CRITICAL (requires key rotation)

4. **What is the blast radius?**
   - Production API key → CRITICAL (immediate rotation needed)
   - Development/test key → MEDIUM (rotate as precaution)
   - Internal-only token → LOW (monitor, rotate on schedule)

---

## Git History Scanning

Check for previously committed secrets:

```bash
# Find deleted files that may have contained secrets
git log --diff-filter=D --summary -- '*.env' '*.key' '*.pem'

# Search commit history for patterns
git log -p --all -S 'AKIA' -- . ':!*.md'
git log -p --all -S 'sk_live_' -- . ':!*.md'
git log -p --all -S 'BEGIN PRIVATE KEY' -- . ':!*.md'
```

If secrets found in history:
1. Rotate the compromised credential immediately
2. Consider using `git-filter-repo` or BFG Repo Cleaner to purge history
3. Force-push cleaned history (coordinate with team)
4. Verify no forks retain the secret
