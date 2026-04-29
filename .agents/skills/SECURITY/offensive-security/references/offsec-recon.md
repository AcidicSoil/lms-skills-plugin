# Offensive Security — Recon

> Sources:
> - PTES Intelligence Gathering: http://www.pentest-standard.org/index.php/Intelligence_Gathering
> - OSINT Framework: https://osintframework.com/
> - Amass: https://github.com/owasp-amass/amass

---

## Recon Levels

| Level | Traffic to target | Detectable |
|---|---|---|
| **Passive (pure OSINT)** | None — archived/third-party only | No |
| **Semi-passive** | Indistinguishable from normal traffic | Unlikely |
| **Active** | Direct probing — scans, brute-force | Yes |

Start passive. Escalate to active only when RoE confirms authorisation.

---

## Passive — DNS and Infrastructure

```bash
whois target.com
dig target.com ANY
dig +short target.com MX
dig +short target.com TXT        # SPF, DMARC, verification tokens

# Certificate transparency — subdomains, no traffic to target
curl -s "https://crt.sh/?q=%.target.com&output=json" | jq '.[].name_value' | sort -u

# ASN and IP ranges
whois -h whois.radb.net -- '-i origin AS12345'
```

---

## Passive — Search Engines and Data Sources

**Google dorks:**
```
site:target.com filetype:pdf
site:target.com inurl:admin
site:target.com "index of"
"@target.com" site:linkedin.com
```

**Internet-wide scan databases (no traffic to target):**
```bash
shodan search hostname:target.com
shodan host <ip>
# Censys: https://search.censys.io — certs, ports, banners, cloud providers
```

**Email and people:**
```bash
theHarvester -d target.com -b linkedin,google,bing
# hunter.io — email format discovery
# haveibeenpwned.com — domain breach check
```

**Tech stack:**
```bash
whatweb https://target.com
# Wappalyzer (browser), BuiltWith, Netcraft — historical data
```

**Leaked secrets:**
```bash
# GitHub search: org:target-org password OR secret OR api_key
# truffleHog, gitleaks — scan public repos
```

---

## Active — Host and Port Discovery

Requires explicit RoE authorisation. Leaves traces.

```bash
# Host discovery
nmap -sn 203.0.113.0/24

# Port scan — fast initial
nmap -sS -T4 --top-ports 1000 <target>

# Full port scan
nmap -sS -p- -T4 <target>

# Service version + default scripts
nmap -sV -sC -p 22,80,443,8080 <target>

# DNS subdomain brute force
amass enum -active -d target.com
gobuster dns -d target.com -w /usr/share/wordlists/dns/subdomains-top1million-5000.txt
```

---

## Asset Map Output

Structured inventory produced by recon. Minimum fields:

| Asset | IP | Ports | Stack | Flags |
|---|---|---|---|---|
| target.com | 203.0.113.10 | 80, 443 | Nginx, React | — |
| api.target.com | 203.0.113.11 | 443 | Node.js | REST endpoints |
| staging.target.com | 203.0.113.20 | 80 | Apache, PHP 7.4 | No TLS, /admin exposed |

**Immediate flags:**
- No TLS or self-signed certs
- Outdated versions: PHP 7.x, Apache 2.2, OpenSSH < 8
- Exposed admin panels, dev/staging environments
- Public cloud storage: S3 buckets, Azure blobs
- Internet-facing services that should not be: databases, cache, monitoring

---

## Recon Checklist

```
□ WHOIS, DNS (A, MX, TXT, NS, CNAME)
□ Certificate transparency (crt.sh)
□ Shodan / Censys scan data
□ Google dorks (sensitive files, exposed panels)
□ GitHub (leaked secrets, naming conventions)
□ LinkedIn / theHarvester (emails, org structure)
□ Breach data (HaveIBeenPwned)
□ Tech fingerprinting (Wappalyzer, BuiltWith)
□ [Active] Host discovery across IP ranges
□ [Active] Full port scan on live hosts
□ [Active] Service version detection
□ [Active] DNS subdomain brute force
```

---

## OPSEC

- Dedicated VPN or infra for active recon — not personal IP
- Rotate user agents on HTTP requests
- Pace requests — aggressive rates trigger WAF/IDS
- Red team/stealth: slow distributed recon over days, not a noisy sweep

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Active recon before authorisation | Passive only until RoE confirmed |
| Aggressive scan rate against production | T2/T3 timing; respect rate limits |
| Skipping certificate transparency | crt.sh finds subdomains scanners miss |
| No OPSEC on active recon | Dedicated infra, not personal IP |
| Ignoring GitHub | Leaked keys and secrets are common |
| Static asset map | Update as new assets are discovered |
