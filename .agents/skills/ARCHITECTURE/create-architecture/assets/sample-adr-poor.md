# ADR-XXX: Use MongoDB

**Date:** TBD
**Status:** Draft

## Context

We need a database.

## Decision

Use MongoDB because it's web scale and everyone is using NoSQL these days.

## Alternatives

We could use SQL but that's old technology.

## Rationale

MongoDB is the best because:
- It's fast
- It's scalable
- It's modern
- My friend recommended it
- I want to learn it for my resume

## Consequences

We'll have a great database.

---

# ISSUES WITH THIS ADR:

## Issue 1: Missing Required Metadata
- ❌ No deciders listed (who made this decision?)
- ❌ Date is "TBD" (when was this decided?)
- ❌ Status is "Draft" (ADRs should be Proposed → Accepted/Rejected)
- ❌ No ADR number (ADR-XXX is placeholder)
- ❌ No tags for categorization

## Issue 2: Insufficient Context
- ❌ "We need a database" - too vague
- ❌ No requirements specified (data model, scale, performance)
- ❌ No constraints mentioned (budget, team skills, timeline)
- ❌ No problem statement (what are we solving?)
- ❌ No technical context (what system is this for?)

**What's missing:**
- What kind of data are we storing?
- What scale are we targeting?
- What are the performance requirements?
- What's the budget?
- What's the team's expertise?

## Issue 3: Poor Alternative Analysis
- ❌ "We could use SQL" - not specific (which SQL database?)
- ❌ No pros/cons analysis
- ❌ No scoring or comparison
- ❌ Dismisses SQL as "old technology" without justification
- ❌ Only 1 alternative considered (should have 3-5)

**What's missing:**
- Specific alternatives (PostgreSQL, MySQL, etc.)
- Detailed pros and cons for each
- Objective evaluation criteria
- Scoring matrix
- Multiple options to compare

## Issue 4: Weak Rationale
- ❌ "It's fast" - vague, no benchmarks
- ❌ "It's scalable" - all databases scale differently, no specifics
- ❌ "It's modern" - appeal to novelty, not technical merit
- ❌ "My friend recommended it" - anecdotal, not data-driven
- ❌ "I want to learn it" - resume-driven development (anti-pattern)

**What's missing:**
- Specific performance numbers
- Scalability strategy for our use case
- How MongoDB's features fit our requirements
- Tradeoff analysis
- Risk assessment
- Cost analysis

## Issue 5: No Concrete Consequences
- ❌ "We'll have a great database" - meaningless platitude
- ❌ No positive consequences detailed
- ❌ No negative consequences acknowledged
- ❌ No mitigation strategies
- ❌ No implementation notes

**What's missing:**
- Specific positive outcomes
- Specific negative tradeoffs
- How to mitigate downsides
- Implementation plan
- Monitoring strategy
- Migration path if wrong

## Issue 6: No Supporting Information
- ❌ No related decisions referenced
- ❌ No benchmarks or data
- ❌ No links to documentation
- ❌ No proof of concept results
- ❌ No team discussion notes

## Issue 7: Bias and Anti-Patterns

**Resume-Driven Development:**
> "I want to learn it for my resume"

This is an anti-pattern. Technology choices should be based on requirements, not personal learning goals.

**Hype-Driven Development:**
> "everyone is using NoSQL these days"

Decisions should be based on fit for purpose, not trends.

**Argument from Authority:**
> "My friend recommended it"

Anecdotal evidence is not sufficient for architectural decisions.

**Appeal to Novelty:**
> "that's old technology"

Age doesn't determine quality. SQL databases are mature and proven.

---

# HOW TO FIX THIS ADR:

## 1. Complete the Header
```markdown
# ADR-001: Database Selection for E-Commerce Platform

**Date:** 2025-01-15
**Status:** Proposed
**Deciders:** Tech Lead (Alice), Backend Lead (Bob), CTO (Charlie)
**Tags:** database, backend, infrastructure, critical
```

## 2. Provide Detailed Context
```markdown
## Context

We are building an e-commerce platform with the following requirements:

**Data Model:**
- Products with categories, variants, inventory
- Users with orders, addresses, payment methods
- Complex relational data with many joins

**Scale:**
- 10,000 products at launch
- 50,000 users expected in year 1
- 100 orders/day initially, growing to 1,000 orders/day

**Performance:**
- Product search <200ms p95
- Checkout process <500ms p95
- Inventory updates must be ACID-compliant

**Constraints:**
- Budget: $200/month for database
- Team: 3 developers, all know SQL, none know NoSQL
- Timeline: 3-month MVP deadline
- Compliance: GDPR-ready (data export, deletion)
```

## 3. Analyze Multiple Alternatives
```markdown
## Alternatives Considered

### Option 1: PostgreSQL
**Pros:**
- Strong relational model (perfect for our e-commerce data)
- ACID transactions (required for orders, inventory)
- Full-text search built-in
- Team expertise (all 3 devs know SQL)
- Cost: $150/month (AWS RDS)

**Cons:**
- Schema changes require migrations
- Vertical scaling limits (can add read replicas)

**Score:** 9.2/10

### Option 2: MongoDB
[Detailed analysis...]

### Option 3: MySQL
[Detailed analysis...]
```

## 4. Provide Data-Driven Rationale
```markdown
## Rationale

PostgreSQL chosen based on requirements fit and team expertise:

**Requirements Fit (scored 10/10):**
- Relational data model natural for e-commerce (products, orders, users)
- ACID transactions required for inventory and order consistency
- Built-in full-text search for product search
- Benchmarked: Product queries 45ms vs MongoDB 120ms

**Team Expertise (scored 9/10):**
- All 3 developers proficient in SQL
- Zero learning curve vs 2-4 weeks for MongoDB
- Immediate productivity (critical for 3-month MVP)

**Cost (scored 10/10):**
- $150/month (AWS RDS) vs $300/month (MongoDB Atlas)
- 50% cost savings

MongoDB scores 6.5/10 due to poor fit for relational data and team learning curve.
```

## 5. Detail Consequences
```markdown
## Consequences

**Positive:**
- Data consistency guaranteed (ACID prevents inventory over-selling)
- Fast complex queries (joins 3x faster than MongoDB in benchmarks)
- Team productive immediately (no learning curve)
- Lower cost ($150 vs $300/month)

**Negative:**
- Schema migrations required for changes (mitigated by Prisma Migrate)
- Vertical scaling limits at extreme scale (won't hit for 2+ years)

**Mitigation:**
- Use Prisma ORM for migration management
- Plan read replica strategy for scaling beyond 100K users
```

## 6. Add Implementation Notes
```markdown
## Implementation Notes

**Setup:**
- AWS RDS PostgreSQL 14, Multi-AZ
- Instance: db.t3.small (sufficient for launch)
- Backups: Daily, 7-day retention

**Scaling Plan:**
- 10K users: Single instance
- 50K users: Add read replica
- 100K users: Upgrade to db.r5.large

**Monitoring:**
- CloudWatch metrics
- Slow query log (>500ms)
- Weekly performance review
```

---

# SUMMARY OF ISSUES:

This poor ADR demonstrates **7 critical failures**:

1. ❌ Incomplete metadata (no deciders, vague date, draft status)
2. ❌ Insufficient context (no requirements, constraints, or problem statement)
3. ❌ Weak alternative analysis (only 1 vague alternative, no comparison)
4. ❌ Poor rationale (appeal to trends, personal learning, anecdotes)
5. ❌ No concrete consequences (platitudes instead of specifics)
6. ❌ Missing supporting information (no data, benchmarks, or references)
7. ❌ Multiple anti-patterns (resume-driven, hype-driven, appeal to novelty)

**Key takeaway:** ADRs must be data-driven, comprehensive, and objective. Personal preferences, trends, and anecdotes are insufficient for architectural decisions.
