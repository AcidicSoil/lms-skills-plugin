# Offensive Security — Analyze

> Sources:
> - PTES (Penetration Testing Execution Standard): http://www.pentest-standard.org/
> - NIST SP 800-115 — Technical Guide to Information Security Testing: https://csrc.nist.gov/publications/detail/sp/800-115/final
> - ioSENTRIX — Rules of Engagement: https://iosentrix.com/blog/rules-of-engagement-in-penetration-testing

---

## Why Analyze First

Every tool run without analysis is noise. Every finding without context is
worthless. The analyze phase is what separates a security researcher from a
scanner operator.

The goal of analysis is to answer three questions before touching anything:
1. **What is in scope?** — what am I authorised to test?
2. **What is the attack surface?** — what can I see and reach?
3. **Where is the value?** — what would a real attacker target first?

---

## Authorisation — Non-Negotiable First Step

No engagement begins without documented authorisation. This is both legal
protection and professional practice.

**For a pentest engagement:**
- Written authorisation signed by a decision-maker (not just an IT contact)
- Scope defined in writing — IP ranges, domains, applications, environments
- Start and end dates explicitly stated
- Emergency contact on both sides
- Data handling agreement — what happens to found credentials, PII

**For bug bounty:**
- Read the programme's policy in full before touching anything
- Verify the asset is listed as in-scope — subdomains, third-party services,
  and cloud infrastructure are frequently out-of-scope even when owned by
  the target
- Check the testing restrictions — automated scanning, rate limits, and
  account creation rules vary per programme
- Note the disclosure policy — coordinated vs. public, timeline, platform rules

**Rule:** If you are uncertain whether something is in scope, it is out of scope
until confirmed in writing.

---

## Rules of Engagement (RoE)

The RoE defines what is permitted beyond the scope list. Key dimensions:

| Dimension | Questions to answer |
|---|---|
| **Test type** | Black-box (no prior knowledge), grey-box (partial), white-box (full access)? |
| **Timing** | Business hours only? Maintenance windows? 24/7? |
| **Destructive testing** | Is DoS testing allowed? Data modification? |
| **Social engineering** | Phishing, vishing — permitted or excluded? |
| **Physical access** | In-scope or out-of-scope? |
| **Persistence** | Can you maintain access or must you exit after each session? |
| **Lateral movement** | How far can you move once inside? |
| **Third parties** | Cloud providers, CDNs, shared hosting — require separate authorisation |
| **Notification** | Does the SOC know? Blind test or coordinated? |

Document the RoE answers before starting. Ambiguity discovered mid-engagement
requires a stop and clarification, not an assumption.

---

## Attack Surface Definition

The attack surface is everything that can be reached from the attacker's
starting position. Map it before prioritising.

**External attack surface (unauthenticated, internet-facing):**
- IP ranges and ASN — what addresses does the target own?
- Domains and subdomains — what DNS resolves to live hosts?
- Web applications and APIs — what HTTP services are running?
- Email infrastructure — MX records, SPF/DKIM/DMARC posture
- Cloud services — S3 buckets, exposed storage, serverless functions
- VPN and remote access endpoints

**Internal attack surface (post-initial-access):**
- Network segments and VLANs
- Active Directory / identity infrastructure
- Internal services and databases
- Legacy systems — often unpatched, high value

**Application attack surface:**
- Entry points: forms, file uploads, API endpoints, query parameters
- Authentication mechanisms: login, password reset, MFA, session management
- Authorisation boundaries: what can each role access?
- Third-party integrations: payment providers, SSO, webhooks

---

## Threat Modelling

With scope and surface defined, model the realistic threat before executing.
Threat modelling focuses effort on what matters.

**PTES threat modelling steps:**
1. **Asset identification** — what does the target value most? Data, revenue
   systems, intellectual property, availability?
2. **Threat actor profiling** — who would realistically attack this? Script
   kiddie, competitor, nation-state, insider threat?
3. **Attack path hypothesis** — given the surface, what are the 2-3 most
   likely paths to the highest-value assets?
4. **Prioritisation** — which paths offer the best ratio of likelihood to
   impact?

This produces a **test focus list** — not a list of every possible vector, but
the ones worth verifying first.

---

## Engagement Types

| Type | Knowledge | Use case |
|---|---|---|
| **Black-box** | None — simulate external attacker | Realistic adversary simulation |
| **Grey-box** | Partial — credentials or architecture docs | Most common pentest |
| **White-box** | Full — source code, infra diagrams | Deep code/config review |
| **Red team** | Variable — outcome-bounded, no scope cap | SOC/detection validation |
| **Bug bounty** | Black-box by default | Continuous, crowd-sourced |

---

## Documentation Discipline

Everything in the analyze phase gets documented:

- Authorisation letter / programme policy — stored, timestamped
- Scope list with explicit in/out-of-scope boundaries
- RoE answers — signed or confirmed in writing
- Attack surface map — initial, updated as recon progresses
- Threat model — assumptions, actor, target assets, prioritised paths
- Test start timestamp — exact time testing begins

This documentation is the difference between security research and
unauthorised access. Protect it.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Starting recon before authorisation | Authorisation first, always |
| Assuming subdomains are in scope | Verify each asset explicitly |
| Skipping RoE for "quick" engagements | RoE is more important in short engagements |
| Testing cloud infrastructure without cloud provider approval | AWS, GCP, Azure all require separate notification |
| Threat modelling after exploitation | Model first — it determines where to look |
| Undocumented start time | Timestamp the exact start of testing activities |
