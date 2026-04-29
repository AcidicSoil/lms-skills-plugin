# Offensive Security — CVSS v3.1

> Sources:
> - FIRST CVSS v3.1 Specification: https://www.first.org/cvss/v3-1/specification-document
> - FIRST CVSS v3.1 User Guide: https://www.first.org/cvss/v3-1/user-guide
> - NVD CVSS Calculator: https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator

---

## Score Ranges

| Score | Severity |
|---|---|
| 0.0 | None |
| 0.1 – 3.9 | Low |
| 4.0 – 6.9 | Medium |
| 7.0 – 8.9 | High |
| 9.0 – 10.0 | Critical |

---

## Vector String Format

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
```

Prefix `CVSS:3.1` is mandatory. All 8 Base metrics are mandatory. Temporal
and Environmental metrics are optional. Metrics can appear in any order.
Never omit the version prefix — `CVSS:3.1` vs `CVSS:3.0` use different formulas.

Calculator: https://www.first.org/cvss/calculator/3.1

---

## Base Metrics — Exploitability

### Attack Vector (AV)
How the attacker reaches the vulnerable component.

| Value | Abbrev | Description |
|---|---|---|
| Network | `N` | Remotely exploitable over the internet |
| Adjacent | `A` | Requires access to same network segment (LAN, Bluetooth, Wi-Fi) |
| Local | `L` | Requires local access (shell, logged-in user) |
| Physical | `P` | Requires physical interaction with hardware |

### Attack Complexity (AC)
Conditions the attacker cannot control that must exist.

| Value | Abbrev | Description |
|---|---|---|
| Low | `L` | No special conditions; reliably repeatable |
| High | `H` | Depends on race conditions, specific config, or other systems |

### Privileges Required (PR)
Level of access the attacker must already have.

| Value | Abbrev | Description |
|---|---|---|
| None | `N` | No prior authentication or privileges |
| Low | `L` | Standard user privileges |
| High | `H` | Administrator or equivalent |

### User Interaction (UI)
Whether a human (other than the attacker) must take action.

| Value | Abbrev | Description |
|---|---|---|
| None | `N` | No user interaction required |
| Required | `R` | A user must open a file, visit a URL, etc. |

### Scope (S)
Whether exploitation affects resources beyond the vulnerable component.

| Value | Abbrev | Description |
|---|---|---|
| Unchanged | `U` | Impact confined to the vulnerable component |
| Changed | `C` | Impact extends to other components (e.g. container escape, XSS in admin context) |

---

## Base Metrics — Impact

Scored for the component that suffers the impact (not necessarily the vulnerable one).

### Confidentiality (C) / Integrity (I) / Availability (A)

| Value | Abbrev | Description |
|---|---|---|
| None | `N` | No impact |
| Low | `L` | Limited — partial data loss, reduced performance |
| High | `H` | Total loss — full data disclosure, complete unavailability |

---

## Common Vector Patterns

```
# Critical — unauthenticated RCE over network, full impact
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H  → 9.8

# High — auth bypass changing scope (e.g. stored XSS → admin takeover)
CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:N  → 8.7

# High — network IDOR exposing all user data
CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N  → 6.5 (Medium)

# Medium — reflected XSS, user interaction required, limited impact
CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N  → 6.1

# Low — local info disclosure, no write access
CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N  → 3.3
```

---

## Scoring Decisions — Common Ambiguities

**AV: Network vs Adjacent**
- Network = exploitable from anywhere on the internet
- Adjacent = requires being on the same local network, VLAN, or Bluetooth range

**AC: Low vs High**
- High only when success requires conditions outside attacker control (race conditions, specific non-default config)
- If the exploit is reliable and repeatable → Low

**S: Unchanged vs Changed**
- Changed when the vulnerable component's exploitation gives access to resources in a different security scope
- Classic examples: XSS that steals admin session (browser→server scope change), container escape

**PR when scope changes**
- PR:L + S:C scores higher than PR:N + S:U in some combinations — the formula weights privilege escalation across scope boundaries

**C/I/A: Low vs High**
- High = attacker gets all data / can modify all data / can make component completely unavailable
- Low = attacker gets some data / limited modification / degraded (not complete) availability loss

---

## Temporal Metrics (Optional)

Modify Base Score to reflect current exploit state. Scored by analysts, not always included in reports.

| Metric | Values | Effect |
|---|---|---|
| Exploit Code Maturity (E) | Unproven `U`, PoC `P`, Functional `F`, High `H` | Public working exploit raises score |
| Remediation Level (RL) | Official Fix `O`, Temporary Fix `T`, Workaround `W`, Unavailable `U` | No fix available raises score |
| Report Confidence (RC) | Unknown `U`, Reasonable `R`, Confirmed `C` | Confirmed raises score |

---

## Reporting Requirements

Per FIRST specification: always publish both the score **and** the vector string together. A bare number without a vector string is incomplete — it prevents independent verification and context.

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
Base Score: 9.8 (Critical)
```

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Reporting score without vector string | Always include vector; score alone is unverifiable |
| Using CVSS as the only prioritisation signal | CVSS measures severity, not risk; add exploitability context |
| Scope: Changed for every web finding | Changed only when impact crosses security boundary |
| AC: High to lower a score | AC:H requires specific conditions outside attacker control |
| Omitting `CVSS:3.1` prefix | Prefix is mandatory; distinguishes from v3.0 formula |
| Mixing v3.0 and v3.1 vectors in same report | Use one version consistently throughout |
