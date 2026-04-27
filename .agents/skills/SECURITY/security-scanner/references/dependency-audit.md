# Dependency Audit Protocol

Lockfile analysis workflow and CVE lookup guidance.

## Contents

1. [Supported Lockfiles](#supported-lockfiles)
2. [Audit Workflow](#audit-workflow)
3. [Risk Indicators](#risk-indicators)
4. [CVE Lookup Workflow](#cve-lookup-workflow)
5. [Slopsquatting Detection](#slopsquatting-detection)

---

## Supported Lockfiles

| Lockfile | Ecosystem | Parser |
|----------|-----------|--------|
| package-lock.json | npm | JSON structure → packages/dependencies |
| yarn.lock | npm | Custom format → name@version blocks |
| pnpm-lock.yaml | npm | YAML → dependencies section |
| requirements.txt | PyPI | Line-based → name==version |
| uv.lock | PyPI | TOML-like → [[package]] blocks |
| Cargo.lock | crates.io | TOML → [[package]] blocks |
| go.sum | Go modules | Line-based → module version hash |
| Gemfile.lock | RubyGems | Indented specs → name (version) |
| composer.lock | Packagist | JSON → packages array |

---

## Audit Workflow

1. **Detect lockfiles** — scan project root and subdirectories
2. **Parse dependencies** — run `dependency-checker.py` to extract name+version+ecosystem
3. **Flag risk indicators** — see Risk Indicators table below
4. **Lookup known vulnerabilities** — see CVE Lookup Workflow
5. **Report** — group by risk level, include actionable remediation

---

## Risk Indicators

| Indicator | Risk Level | Detection Method |
|-----------|------------|------------------|
| Unpinned version (>=, ~>, *) | MEDIUM | Regex: version constraint without exact pin |
| Major version behind latest | LOW | Compare against registry (manual or API) |
| Package with known CVE | CRITICAL/HIGH | CVE database lookup |
| Unmaintained (2+ years no update) | MEDIUM | Registry metadata check |
| Low download count | LOW | Registry metadata — potential typosquat |
| Name similar to popular package | HIGH | Levenshtein distance < 2 from top-1000 |
| Dev dependency in production | LOW | Check dependency type classification |
| Duplicate package different versions | MEDIUM | Multiple versions of same package in lockfile |
| Git dependency (non-registry) | MEDIUM | URL-based dependency instead of registry |

---

## CVE Lookup Workflow

For each suspicious dependency, validate with external sources:

1. **Registry advisory databases** (preferred):
   - npm: `https://registry.npmjs.org/-/npm/v1/security/advisories`
   - PyPI: check via `pip-audit` or `safety` database
   - Go: `https://vuln.go.dev/`
   - RubyGems: `https://rubysec.com/advisories`
   - Rust: `https://rustsec.org/advisories/`

2. **GitHub Security Advisories**:
   - `gh api /advisories --jq '.[] | select(.package.name == "PACKAGE")'`
   - Check GHSA database for package+version match

3. **NVD/CVE databases**:
   - Search by package name + version
   - Map to CVSS score for severity

4. **Confidence scoring**:
   - Advisory confirms exact version affected → confidence 0.95
   - Advisory range includes version → confidence 0.85
   - Package flagged but version unclear → confidence 0.5

---

## Slopsquatting Detection

AI-generated code may reference non-existent packages (hallucinated names). Flag:

| Signal | Detection |
|--------|-----------|
| Package not found in registry | Query registry API, 404 response |
| Name suspiciously similar to real package | Levenshtein distance 1-2 from popular package |
| Very recent publication date | Package created within last 30 days |
| No or minimal source code | Registry page with no repository link |
| Name combines two unrelated concepts | Heuristic: compound name not matching any known package pattern |

Slopsquatting is security-critical — a malicious actor can register the hallucinated name. Flag as HIGH severity.
