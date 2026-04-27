---
name: offensive-security
description: >
  Offensive security domain. Load and use proactively when working on bug
  bounty hunting, penetration testing, red teaming, vulnerability research,
  or security report writing. Covers the full engagement lifecycle from
  analysis through disclosure.
---

## Workflow

Offensive security work follows a disciplined progression. Each stage informs
the next. Never skip analyze. Never disclose without a report.

```
analyze → recon → exploit → disclose
```

Each stage has a dedicated methodology reference. Tool references are loaded
on demand when a specific tool or output format is needed.

## Routing Table

### Methodology

| Stage | Context | Reference |
|---|---|---|
| **Hacker mindset** | Ethics, culture, curiosity-driven approach, OSS values, responsible practice | `references/offsec-hacker-mindset.md` |
| **Analyze** | Scope review, rules of engagement, attack surface definition, threat modeling | `references/offsec-analyze.md` |
| **Recon** | OSINT, passive enumeration, active discovery, asset mapping | `references/offsec-recon.md` |
| **Exploit** | Exploitation concepts, techniques, responsible approach, proof of concept | `references/offsec-exploit.md` |
| **Disclose** | CVD process, responsible disclosure ethics, legal considerations, vendor coordination, open-sourcing findings | `references/offsec-disclose.md` |

### Tools

| Tool / Craft | Context | Reference |
|---|---|---|
| nmap | Network scanning, port discovery, service fingerprinting | `references/offsec-nmap.md` |
| CVSS v3.1 | Severity scoring, vector anatomy, NVD conventions | `references/offsec-cvss-v3.1.md` |
| Report writing | Finding anatomy, writing craft, severity narrative, HackerOne format | `references/offsec-report-writing.md` |
