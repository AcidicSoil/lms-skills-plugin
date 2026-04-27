# Requirements Analysis Guide

Guide for extracting architectural requirements from PRDs, epics, user stories, and requirements documents.

---

## Overview

Effective architecture begins with thorough requirements analysis. This guide provides systematic techniques for extracting functional requirements, non-functional requirements, constraints, and assumptions needed for architecture design.

---

## Extraction Techniques

### Technique 1: Functional Requirements Extraction

**Purpose:** Identify core features and capabilities the system must provide

**What to look for:**
- User-facing features ("Users can...", "System shall...")
- Business processes to support
- Data to manage (CRUD operations)
- Integrations with external systems
- Reporting and analytics needs
- Administrative functions

**Example extraction:**
```markdown
Requirement: "Users can register, log in, and manage their profile"

Extracted FR:
- User registration with email/password
- Email verification flow
- User authentication (login/logout)
- Profile management (view, edit, delete account)
- Password reset functionality
```

**Questions to ask:**
- What actions can users perform?
- What business processes are automated?
- What data does the system manage?
- What integrations are required?
- What reporting is needed?

---

### Technique 2: Non-Functional Requirements Extraction

**Purpose:** Identify quality attributes, performance, security, and operational needs

**Categories to extract:**

**Performance:**
```markdown
Look for:
- Response time expectations ("page loads in < 2s")
- Throughput requirements ("handle 1000 req/sec")
- Concurrent user targets ("support 10K simultaneous users")

Example:
"The system must handle 5,000 concurrent users with p95 response time < 500ms"
→ NFR: Performance - 5K concurrent, 500ms p95 latency
```

**Scalability:**
```markdown
Look for:
- User growth projections ("expect 100K users in year 1")
- Data growth estimates ("generate 1GB/day")
- Geographic expansion plans

Example:
"We anticipate growing from 1,000 to 50,000 users over 12 months"
→ NFR: Scalability - 50x growth in 12 months
```

**Security:**
```markdown
Look for:
- Authentication requirements ("OAuth 2.0")
- Authorization models ("role-based access")
- Data protection ("encrypt sensitive data")
- Compliance ("GDPR compliant")

Example:
"All user data must be encrypted at rest and in transit, GDPR compliant"
→ NFR: Security - encryption, GDPR compliance
```

**Reliability:**
```markdown
Look for:
- Availability targets ("99.9% uptime")
- Fault tolerance needs ("survive single server failure")
- Disaster recovery ("4-hour RTO, 1-hour RPO")

Example:
"System must achieve 99.95% uptime with automated failover"
→ NFR: Reliability - 99.95% availability, failover
```

**Maintainability:**
```markdown
Look for:
- Code quality standards ("80% test coverage")
- Documentation requirements ("API docs with OpenAPI")
- Deployment frequency ("deploy daily")

Example:
"Support continuous deployment with automated testing"
→ NFR: Maintainability - CD pipeline, automated tests
```

---

### Technique 3: Constraints Extraction

**Purpose:** Identify limitations and restrictions affecting architecture

**Types of constraints:**

**Technical Constraints:**
```markdown
- Required technologies ("must use PostgreSQL")
- Platform requirements ("deploy on AWS")
- Integration requirements ("integrate with Salesforce")
- Browser support ("support Chrome, Firefox, Safari")

Example:
"Must deploy on AWS using existing EC2 infrastructure"
→ Constraint: AWS EC2 deployment (no serverless)
```

**Business Constraints:**
```markdown
- Budget limitations ("$5K/month infrastructure budget")
- Timeline ("launch in 3 months")
- Team size/skills ("2 developers, React experience")
- Regulatory ("HIPAA compliant")

Example:
"Must launch MVP in 8 weeks with 2-person team"
→ Constraint: 8-week timeline, 2 developers
```

**Operational Constraints:**
```markdown
- Support hours ("24/7 monitoring")
- Maintenance windows ("deploy Sundays only")
- Data residency ("EU data stays in EU")

Example:
"Customer data must remain in customer's geographic region"
→ Constraint: Multi-region data residency
```

---

### Technique 4: Scale Estimation

**Purpose:** Estimate user scale, data volume, and growth for capacity planning

**User Scale Estimation:**
```markdown
Ask:
- How many users at launch?
- How many users in 1 year? 3 years?
- How many concurrent users expected?
- What's the traffic pattern (steady, spiky, seasonal)?

Example:
"10 enterprise customers with 500 users each = 5,000 total users
Expect 20% concurrent during business hours = 1,000 concurrent
Grow to 100 customers in 2 years = 50,000 users"

→ Scale: 5K users (launch), 50K (year 2), 1K concurrent
```

**Data Volume Estimation:**
```markdown
Ask:
- What data is stored per user/transaction?
- How much data created per day/month/year?
- What's the retention policy?
- How fast does data grow?

Example:
"Each user creates 10 records/day, avg 5KB each
5,000 users × 10 records/day × 5KB = 250MB/day
365 days = ~90GB/year
Growth to 50K users = 900GB/year"

→ Data: 90GB/year (launch), 900GB/year (year 2)
```

**Traffic Pattern Estimation:**
```markdown
Ask:
- Is traffic steady or spiky?
- What are peak hours?
- Any seasonal patterns?
- Expected requests per user?

Example:
"B2B SaaS, weekday 9am-5pm peak, weekends low
Peak traffic: 80% of daily volume in 8 hours
Each user: 50 requests/day average"

→ Traffic: 80% concentration in 8-hour window, weekday heavy
```

---

### Technique 5: Integration Requirements

**Purpose:** Identify external systems, APIs, and data sources

**What to extract:**
```markdown
For each integration:
- System name and purpose
- Integration type (API, webhook, file transfer, database)
- Data flow direction (inbound, outbound, bidirectional)
- Frequency (real-time, batch, on-demand)
- Volume (requests/day, data size)
- SLA requirements
- Authentication method

Example:
"Integrate with Stripe for payment processing"

Extracted:
- System: Stripe Payment API
- Type: REST API (HTTPS)
- Direction: Bidirectional (create charges, receive webhooks)
- Frequency: Real-time (per transaction) + webhooks
- Volume: ~100 transactions/day
- SLA: 99.99% uptime required
- Auth: API key (secret)
```

---

### Technique 6: Missing Information Identification

**Purpose:** Identify gaps in requirements that need clarification

**Common missing information:**
```markdown
1. User scale not specified
   → Ask: "How many users at launch? In 1 year?"

2. Performance targets vague
   → Ask: "What's acceptable response time? Throughput?"

3. Security requirements unclear
   → Ask: "What data is sensitive? Compliance needs?"

4. No disaster recovery plan
   → Ask: "What's acceptable downtime? Data loss?"

5. Integration details incomplete
   → Ask: "Which systems? APIs available? SLAs?"

6. Technology preferences unknown
   → Ask: "Preferred stack? Existing infrastructure?"

7. Budget not mentioned
   → Ask: "Infrastructure budget? Cost constraints?"
```

**When information is missing:**
- Document assumptions explicitly
- Flag as "needs clarification" in architecture
- Provide multiple architecture options if critical
- Escalate to stakeholders for decisions

---

## Extraction Checklist

Use this checklist when analyzing requirements:

**Functional Requirements:**
- [ ] Core features identified
- [ ] User workflows documented
- [ ] Data entities listed
- [ ] Integration points identified
- [ ] Admin functions specified

**Non-Functional Requirements:**
- [ ] Performance targets defined
- [ ] Scalability projections estimated
- [ ] Security requirements specified
- [ ] Reliability targets set
- [ ] Maintainability expectations documented

**Constraints:**
- [ ] Technology constraints identified
- [ ] Business constraints documented
- [ ] Timeline and budget known
- [ ] Team skills assessed
- [ ] Regulatory requirements identified

**Scale Estimates:**
- [ ] User count estimated (launch and growth)
- [ ] Concurrent users projected
- [ ] Data volume calculated
- [ ] Traffic patterns understood

**Integrations:**
- [ ] External systems listed
- [ ] Integration types specified
- [ ] Data flows documented
- [ ] SLA requirements noted

**Missing Information:**
- [ ] Gaps identified
- [ ] Assumptions documented
- [ ] Clarification questions prepared

---

## Examples

### Example 1: E-commerce Platform Requirements

**Source Requirements:**
```
Build an e-commerce platform where users can browse products,
add to cart, and checkout with Stripe. Admin panel for
product management. Expect 1,000 users at launch, growing to
50,000 in year 1. Must handle Black Friday traffic spikes
(10x normal). 99.9% uptime required.
```

**Extracted:**

**Functional Requirements:**
- Product catalog (browse, search, filter)
- Shopping cart (add, remove, update quantity)
- Checkout with Stripe integration
- User authentication (register, login)
- Admin panel (CRUD products, view orders)
- Order management

**Non-Functional Requirements:**
- Performance: Handle 10x traffic spikes (Black Friday)
- Scalability: 1K → 50K users in 12 months
- Reliability: 99.9% uptime
- Security: PCI-DSS compliance (Stripe handles most)

**Constraints:**
- Must use Stripe for payments
- Unspecified technology stack (flexible)

**Scale Estimates:**
- Users: 1K launch, 50K year 1, 10K concurrent (Black Friday)
- Data: ~1GB products, 100GB orders (year 1)
- Traffic: Normal 500 req/min, spike 5K req/min

**Integrations:**
- Stripe Payment API (real-time, bidirectional)

**Missing Information:**
- Geographic regions (single or multi-region?)
- Mobile app needed? (assume web-first)
- Inventory management integration? (assume built-in)
- Budget constraints? (flag for clarification)

---

### Example 2: Internal Dashboard Requirements

**Source Requirements:**
```
Create internal analytics dashboard for sales team to
view real-time metrics. Connect to existing PostgreSQL
database. 50 sales reps, accessed during business hours.
Charts and graphs required.
```

**Extracted:**

**Functional Requirements:**
- Authentication (SSO with company directory)
- Real-time metrics dashboard
- Data visualization (charts, graphs)
- PostgreSQL database queries
- Multi-user access (50 users)

**Non-Functional Requirements:**
- Performance: Real-time or near real-time (<5s refresh)
- Scalability: 50 users, low concurrent (10-20)
- Security: Internal tool, company SSO
- Reliability: Business hours only (no 24/7 requirement)

**Constraints:**
- Must connect to existing PostgreSQL
- Internal tool (no public access)
- Limited to 50 users

**Scale Estimates:**
- Users: 50 total, 10-20 concurrent
- Data: Read-only from existing DB (no new storage)
- Traffic: Low volume, business hours (9am-6pm)

**Integrations:**
- Company SSO (SAML/LDAP)
- Existing PostgreSQL database (read-only)

**Missing Information:**
- PostgreSQL access credentials? (flag for infra team)
- Specific metrics to display? (needs list)
- Mobile access needed? (assume desktop-first)
- Alerting/notifications? (not mentioned, skip for MVP)

---

## Best Practices

1. **Read multiple times** - First pass for overview, second for details, third for gaps
2. **Extract, don't interpret** - Capture what's stated, note assumptions separately
3. **Quantify vague terms** - "Fast" → ask for specific time, "Many users" → ask for number
4. **Document assumptions** - When unclear, state your assumption and flag for review
5. **Identify conflicts** - Note contradictory requirements (e.g., "cheap and scalable")
6. **Ask clarifying questions** - Better to ask early than build wrong architecture
7. **Create traceability** - Link architecture decisions back to requirements
8. **Prioritize NFRs** - Security, performance, and reliability often overlooked but critical

---

## Common Pitfalls

**Pitfall 1: Assuming requirements**
```
❌ "This will obviously need caching"
✅ Extract performance requirements, then decide if caching needed
```

**Pitfall 2: Over-specifying from vague requirements**
```
❌ Requirement says "fast" → assume <100ms
✅ Flag "fast" as vague, ask for specific target
```

**Pitfall 3: Ignoring constraints**
```
❌ Design perfect architecture ignoring $500/month budget
✅ Factor budget constraint into technology choices
```

**Pitfall 4: Missing scale context**
```
❌ "Support 10K users" without knowing concurrent, growth, or usage patterns
✅ Extract total, concurrent, growth projection, and usage patterns
```

**Pitfall 5: Overlooking integrations**
```
❌ Treat integrations as afterthought
✅ Identify integrations early, they significantly impact architecture
```

---

## Tools and Techniques

### Mind Mapping
```
Create mind map with center node "System" and branches:
- Features
- Users
- Data
- Integrations
- Performance
- Security
```

### Requirements Matrix
```
| Requirement | Type | Priority | Extracted Details |
|-------------|------|----------|-------------------|
| User login  | FR   | P0       | OAuth, email/pw   |
| 99.9% SLA   | NFR  | P0       | Reliability, monitoring |
```

### Story Mapping
```
Extract from user stories:
- As a [user], I can [action], so that [benefit]
→ Identifies features, workflows, user types
```

### Assumption Log
```
| Assumption | Confidence | Impact if Wrong | Clarification Needed |
|------------|------------|-----------------|----------------------|
| <10K concurrent | Medium | High | Yes - ask stakeholders |
```

---

*Reference for create-architecture skill - Use these techniques to extract comprehensive requirements from any source document*
