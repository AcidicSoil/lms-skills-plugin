# Offensive Security — Nmap

> Sources:
> - Nmap official documentation: https://nmap.org/book/man.html
> - NSE Documentation Portal: https://nmap.org/nsedoc/
> - HackerTarget Nmap cheat sheet: https://hackertarget.com/nmap-cheatsheet-a-quick-reference-guide/

---

## Scan Types

| Flag | Type | Requires root | Notes |
|---|---|---|---|
| `-sS` | TCP SYN (half-open) | Yes | Default; fast; less logged than full connect |
| `-sT` | TCP connect | No | Full 3-way handshake; more visible |
| `-sU` | UDP | Yes | Slow; combine with `-sS` for coverage |
| `-sA` | TCP ACK | Yes | Maps firewall rules; not a port scan |
| `-sN` / `-sF` / `-sX` | Null / FIN / Xmas | Yes | Evade some stateless firewalls; unreliable on Windows |
| `-sn` | Ping sweep (no port scan) | No | Host discovery only |
| `-Pn` | Skip host discovery | No | Treat all hosts as up; use when ICMP is blocked |

---

## Port Selection

```bash
-p 22,80,443           # specific ports
-p 1-1024              # range
-p-                    # all 65535 ports
--top-ports 100        # top 100 most common
--top-ports 1000       # broader initial sweep
```

---

## Service and OS Detection

```bash
-sV                    # service version detection
-sV --version-intensity 9   # max intensity; slower but more accurate
-O                     # OS detection (requires root)
-A                     # aggressive: -sV -O -sC --traceroute combined
```

`-A` is noisy — use only when stealth is not required.

---

## Timing Templates

| Template | Use case |
|---|---|
| `-T0` Paranoid | IDS evasion; very slow |
| `-T1` Sneaky | Stealth; slow |
| `-T2` Polite | Low bandwidth impact |
| `-T3` Normal | Default |
| `-T4` Aggressive | Fast; reliable on good networks |
| `-T5` Insane | Very fast; drops accuracy; may miss open ports |

Use `-T2` or `-T3` against production targets. `-T4` for CTF/lab.

---

## NSE — Nmap Scripting Engine

```bash
-sC                    # run default scripts (same as --script=default)
--script=<name>        # run specific script
--script=<category>    # run all scripts in category
--script-args key=val  # pass arguments to scripts
```

**NSE categories:**

| Category | Purpose |
|---|---|
| `default` | Safe, fast, informative — runs with `-sC` |
| `discovery` | Enumerate services, network info |
| `safe` | No destructive or intrusive actions |
| `vuln` | Check for known vulnerabilities |
| `auth` | Test authentication bypass and defaults |
| `brute` | Brute-force credentials — use with explicit RoE |
| `exploit` | Attempt exploitation — use only when authorised |
| `intrusive` | Likely to cause disruption; not safe for production |

**Never run `--script=all` or `--script=exploit` without explicit RoE authorisation.**

---

## Useful NSE Scripts

```bash
# HTTP enumeration — maps paths, identifies CMS, finds admin panels
nmap --script=http-enum -p 80,443,8080,8443 <target>

# SSL/TLS cipher and certificate info
nmap --script=ssl-enum-ciphers -p 443 <target>

# SMB OS and version info
nmap --script=smb-os-discovery -p 445 <target>

# Check for anonymous FTP
nmap --script=ftp-anon -p 21 <target>

# DNS zone transfer attempt
nmap --script=dns-zone-transfer --script-args dns-zone-transfer.domain=target.com -p 53 <target>

# Vulnerability scan on web ports (noisy — avoid on production)
nmap --script=vuln -p 80,443 <target>
```

---

## Output Formats

```bash
-oN scan.txt           # normal (human-readable)
-oX scan.xml           # XML (parseable, import into tools)
-oG scan.gnmap         # grepable
-oA scan               # all three simultaneously — preferred for engagements
```

Always save output. `-oA` at minimum on any engagement scan.

```bash
# Extract open ports from grepable output
grep '/open/' scan.gnmap | awk -F'/' '{print $1}' | grep -oP '\d+'
# Or as comma-separated for follow-up scan
grep -oP '\d+/open' scan.gnmap | cut -d/ -f1 | paste -sd,
```

---

## Standard Engagement Workflow

```bash
# 1. Host discovery
nmap -sn -T4 192.168.1.0/24 -oG alive.gnmap

# 2. Fast port sweep on live hosts
nmap -sS -T4 --top-ports 1000 -iL hosts.txt -oA sweep

# 3. Full port scan on high-value targets
nmap -sS -p- -T3 <target> -oA full

# 4. Service + default scripts on discovered ports
nmap -sV -sC -p 22,80,443,8443 <target> -oA detailed
```

---

## OPSEC

- `-T2` / `-T3` against monitored or production targets
- `--randomize-hosts` to avoid sequential scan signatures
- `--source-port 53` or `--source-port 80` to blend with expected traffic
- `-D RND:5` decoy scan — mixes real source with spoofed IPs
- `-f` fragment packets — evades some stateless packet inspection
- Avoid `-A` and `--script=default` when stealth matters — too noisy

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| `-T5` against production | Use `-T3`; `-T4` max |
| `--script=all` without review | Explicit script or category only |
| `--script=exploit` without RoE | Confirm authorisation; exploitation is a separate phase |
| No `-oA` on engagement scans | Always save output — findings need evidence |
| Single scan covering everything | Sweep first, detail second — two-pass workflow |
| Skipping UDP entirely | `-sU --top-ports 100` at minimum; DNS, SNMP, TFTP often missed |
