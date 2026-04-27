# Technology Decision Framework

Systematic framework for evaluating and selecting technologies for architecture components.

---

## Overview

Technology selection requires balancing multiple factors: requirements fit, team expertise, ecosystem maturity, cost, and long-term maintenance. This framework provides evaluation criteria and decision matrices for objective technology assessment.

---

## Evaluation Criteria

### Criterion 1: Requirements Fit (Weight: 30%)

**Question:** Does this technology meet our functional and non-functional requirements?

**Scoring:**
- **10:** Excellent fit, exceeds all requirements
- **7:** Good fit, meets all requirements
- **5:** Partial fit, meets most requirements with workarounds
- **3:** Poor fit, significant gaps
- **0:** Does not meet critical requirements

**Evaluation checklist:**
- ✅ Functional requirements satisfied?
- ✅ Performance requirements met?
- ✅ Scalability needs addressed?
- ✅ Security requirements covered?
- ✅ Integration capabilities sufficient?

**Example:**
```
Requirement: Real-time collaboration with 10K concurrent users

Option A: WebSockets (Socket.IO)
  - Bidirectional real-time: ✅
  - Scales to 10K: ✅ (with cluster mode)
  - Score: 10/10

Option B: HTTP polling
  - Real-time: ⚠️ (simulated with polling)
  - Scales to 10K: ❌ (inefficient)
  - Score: 3/10
```

---

### Criterion 2: Team Expertise (Weight: 25%)

**Question:** Can our team effectively use this technology?

**Scoring:**
- **10:** Team has extensive experience
- **7:** Team has some experience or can learn quickly
- **5:** Team has limited experience, moderate learning curve
- **3:** Team has no experience, steep learning curve
- **0:** Technology requires specialized skills team doesn't have

**Factors to consider:**
- Current team skill levels
- Learning curve (hours/weeks/months to proficiency)
- Availability of training resources
- Hiring market (can we hire experts?)
- Team enthusiasm/resistance

**Example:**
```
Team: 3 developers, strong React experience

Option A: React
  - Current expertise: High (3/3 developers)
  - Learning curve: None
  - Score: 10/10

Option B: Svelte
  - Current expertise: None
  - Learning curve: Moderate (similar to React)
  - Team enthusiasm: Medium
  - Score: 5/10
```

---

### Criterion 3: Community & Ecosystem (Weight: 15%)

**Question:** Is there a strong community and ecosystem?

**Scoring:**
- **10:** Very mature, large community, rich ecosystem
- **7:** Mature, active community, good ecosystem
- **5:** Growing community, moderate ecosystem
- **3:** Small community, limited ecosystem
- **0:** Abandoned or no community

**Indicators:**
- GitHub stars, contributors, activity
- NPM downloads / package manager activity
- Stack Overflow questions
- Available libraries and plugins
- Documentation quality
- Commercial support availability

**Example:**
```
Option A: PostgreSQL
  - Age: 30+ years
  - Community: Very large, active
  - Ecosystem: Extensive (ORMs, tools, hosting)
  - Documentation: Excellent
  - Commercial support: Available
  - Score: 10/10

Option B: SurrealDB
  - Age: <3 years
  - Community: Small but growing
  - Ecosystem: Limited
  - Documentation: Basic
  - Commercial support: None
  - Score: 3/10
```

---

### Criterion 4: Performance (Weight: 10%)

**Question:** Does it perform well under our expected load?

**Scoring:**
- **10:** Exceeds performance requirements significantly
- **7:** Meets performance requirements comfortably
- **5:** Meets requirements with optimization
- **3:** Struggles to meet requirements
- **0:** Cannot meet performance requirements

**Metrics:**
- Latency (p50, p95, p99)
- Throughput (requests/second, queries/second)
- Resource usage (CPU, memory, network)
- Benchmarks vs alternatives

**Example:**
```
Requirement: <100ms API response time at 1K req/sec

Option A: FastAPI (Python)
  - Latency: ~50ms p95 (async)
  - Throughput: 2K req/sec (benchmarked)
  - Score: 10/10

Option B: Flask (Python)
  - Latency: ~150ms p95 (WSGI)
  - Throughput: 500 req/sec
  - Score: 3/10
```

---

### Criterion 5: Scalability (Weight: 10%)

**Question:** Can it scale with our growth?

**Scoring:**
- **10:** Proven at massive scale (1M+ users, PB data)
- **7:** Proven at significant scale (100K+ users, TB data)
- **5:** Proven at moderate scale (10K users, GB data)
- **3:** Limited scalability
- **0:** Does not scale

**Factors:**
- Horizontal scaling capability
- Vertical scaling limits
- Known scaling challenges
- Case studies at target scale
- Cloud provider support

**Example:**
```
Growth projection: 10K → 100K users over 2 years

Option A: PostgreSQL
  - Proven: 100K+ concurrent (Uber, Instagram)
  - Horizontal: Yes (read replicas, sharding)
  - Vertical: Excellent
  - Score: 10/10

Option B: SQLite
  - Proven: Single-node only
  - Horizontal: No
  - Vertical: Limited
  - Score: 3/10 (not suitable for growth)
```

---

### Criterion 6: Cost (Weight: 5%)

**Question:** What are the total costs (licensing, infrastructure, maintenance)?

**Scoring:**
- **10:** Free and low infrastructure cost
- **7:** Free or affordable with moderate infra cost
- **5:** Moderate licensing and infra cost
- **3:** High licensing or infra cost
- **0:** Prohibitively expensive

**Cost components:**
- Licensing fees (open-source vs proprietary)
- Infrastructure costs (compute, storage, bandwidth)
- Operational costs (monitoring, backup, support)
- Support contracts
- Training costs

**Example:**
```
Budget: $2K/month infrastructure

Option A: PostgreSQL (self-hosted)
  - License: Free (open-source)
  - Infra: $500/month (AWS RDS)
  - Support: Optional ($100/month)
  - Score: 10/10

Option B: Oracle Database
  - License: $50K/year
  - Infra: $1K/month
  - Support: Included
  - Score: 0/10 (exceeds budget)
```

---

### Criterion 7: Maintenance Burden (Weight: 5%)

**Question:** How much ongoing maintenance is required?

**Scoring:**
- **10:** Fully managed, minimal maintenance
- **7:** Low maintenance (updates, monitoring)
- **5:** Moderate maintenance
- **3:** High maintenance (frequent issues)
- **0:** Unsustainable maintenance burden

**Factors:**
- Managed vs self-hosted
- Update frequency and stability
- Breaking changes frequency
- Debugging difficulty
- Operational complexity

**Example:**
```
Option A: Vercel (managed Next.js hosting)
  - Hosting: Fully managed
  - Deployments: Automated
  - Scaling: Automatic
  - Maintenance: Minimal
  - Score: 10/10

Option B: Self-hosted Kubernetes cluster
  - Hosting: Self-managed
  - Deployments: Manual setup
  - Scaling: Manual configuration
  - Maintenance: High (cluster upgrades, security patches)
  - Score: 3/10
```

---

## Decision Matrix Template

```
Technology Component: [e.g., Database]
Alternatives: [Option A, Option B, Option C]

| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| Requirements Fit | 30% | 10 | 7 | 5 |
| Team Expertise | 25% | 7 | 9 | 4 |
| Community & Ecosystem | 15% | 10 | 8 | 3 |
| Performance | 10% | 8 | 10 | 6 |
| Scalability | 10% | 9 | 7 | 8 |
| Cost | 5% | 10 | 8 | 9 |
| Maintenance | 5% | 7 | 6 | 8 |
|-----------|--------|----------|----------|----------|
| Weighted Score | 100% | [Calculate] | [Calculate] | [Calculate] |

Calculation:
Option A: (10×0.30) + (7×0.25) + (10×0.15) + (8×0.10) + (9×0.10) + (10×0.05) + (7×0.05)
       = 3.0 + 1.75 + 1.5 + 0.8 + 0.9 + 0.5 + 0.35 = 8.8/10

Recommendation: [Highest score with justification]
```

---

## Complete Examples

### Example 1: Database Selection for SaaS App

**Context:**
- SaaS project management tool
- Complex relational data (projects, tasks, users, teams)
- 10K users at launch, 100K in 2 years
- ACID transactions required
- Team knows SQL, no NoSQL experience

**Alternatives:**

**Option A: PostgreSQL**
```
Requirements Fit: 10 (ACID, relations, scalability)
Team Expertise: 9 (strong SQL knowledge)
Community & Ecosystem: 10 (mature, extensive)
Performance: 8 (excellent for relational)
Scalability: 9 (proven at scale)
Cost: 10 (open-source, affordable RDS)
Maintenance: 7 (moderate)

Weighted: (10×0.30) + (9×0.25) + (10×0.15) + (8×0.10) + (9×0.10) + (10×0.05) + (7×0.05)
        = 3.0 + 2.25 + 1.5 + 0.8 + 0.9 + 0.5 + 0.35 = 9.3/10
```

**Option B: MongoDB**
```
Requirements Fit: 5 (flexible, but complex relations awkward)
Team Expertise: 3 (no NoSQL experience)
Community & Ecosystem: 9 (large community)
Performance: 7 (fast for simple queries)
Scalability: 9 (horizontal scaling)
Cost: 9 (open-source, Atlas managed)
Maintenance: 8 (low with Atlas)

Weighted: (5×0.30) + (3×0.25) + (9×0.15) + (7×0.10) + (9×0.10) + (9×0.05) + (8×0.05)
        = 1.5 + 0.75 + 1.35 + 0.7 + 0.9 + 0.45 + 0.4 = 6.05/10
```

**Option C: MySQL**
```
Requirements Fit: 9 (ACID, relations, good fit)
Team Expertise: 9 (SQL knowledge transfers)
Community & Ecosystem: 10 (very mature)
Performance: 7 (good, slightly less than PG)
Scalability: 8 (scales well)
Cost: 10 (open-source, affordable)
Maintenance: 7 (moderate)

Weighted: (9×0.30) + (9×0.25) + (10×0.15) + (7×0.10) + (8×0.10) + (10×0.05) + (7×0.05)
        = 2.7 + 2.25 + 1.5 + 0.7 + 0.8 + 0.5 + 0.35 = 8.8/10
```

**Decision: PostgreSQL (Score: 9.3/10)**

**Rationale:**
- Best requirements fit (ACID, complex relations)
- Team already proficient in SQL
- Superior feature set (JSON, full-text search, extensions)
- Proven scalability
- Lower long-term risk

**Document as ADR:** ADR-001: Database Selection

---

### Example 2: Frontend Framework Selection

**Context:**
- Dashboard application with real-time updates
- Team: 3 developers, 2 with React, 1 with Vue
- Need to ship MVP in 3 months
- Performance critical (low-latency updates)

**Alternatives:**

**Option A: React**
```
Requirements Fit: 9 (excellent for dashboards)
Team Expertise: 9 (2/3 developers experienced)
Community & Ecosystem: 10 (largest ecosystem)
Performance: 7 (good, virtual DOM)
Scalability: 9 (proven at scale)
Cost: 10 (free, open-source)
Maintenance: 8 (stable, frequent updates)

Weighted: 8.95/10
```

**Option B: Svelte**
```
Requirements Fit: 10 (reactive, fast)
Team Expertise: 3 (no experience, learning curve)
Community & Ecosystem: 6 (growing, smaller)
Performance: 10 (compiled, fastest)
Scalability: 8 (proven in production)
Cost: 10 (free, open-source)
Maintenance: 7 (stable, less frequent updates)

Weighted: 7.45/10
```

**Option C: Vue**
```
Requirements Fit: 9 (good for dashboards)
Team Expertise: 6 (1/3 experienced, similar to React)
Community & Ecosystem: 8 (mature, good ecosystem)
Performance: 8 (fast, virtual DOM)
Scalability: 9 (proven)
Cost: 10 (free, open-source)
Maintenance: 8 (stable)

Weighted: 8.35/10
```

**Decision: React (Score: 8.95/10)**

**Rationale:**
- Team expertise (2/3 developers already proficient)
- Fastest path to MVP (3-month deadline)
- Largest ecosystem (most libraries available)
- Risk mitigation (mature, well-understood)

**Note:** Svelte scores highest on performance but team expertise penalty outweighs benefits for tight timeline.

---

### Example 3: API Design Approach

**Context:**
- Mobile app + web app consuming same backend
- Complex data requirements (nested resources)
- Real-time updates needed
- Team: Full-stack, TypeScript preference

**Alternatives:**

**Option A: REST**
```
Requirements Fit: 7 (works, over-fetching issues)
Team Expertise: 10 (everyone knows REST)
Community & Ecosystem: 10 (universal)
Performance: 6 (over-fetching, under-fetching)
Scalability: 9 (proven)
Cost: 10 (no additional cost)
Maintenance: 9 (simple, standardized)

Weighted: 8.65/10
```

**Option B: GraphQL**
```
Requirements Fit: 10 (perfect for complex data)
Team Expertise: 5 (learning curve)
Community & Ecosystem: 8 (mature, Apollo etc)
Performance: 9 (efficient queries)
Scalability: 8 (proven at scale)
Cost: 10 (open-source)
Maintenance: 6 (schema management complexity)

Weighted: 8.10/10
```

**Option C: tRPC**
```
Requirements Fit: 9 (type-safe, efficient)
Team Expertise: 8 (TypeScript team, easy)
Community & Ecosystem: 6 (newer, growing)
Performance: 9 (efficient, type-safe)
Scalability: 8 (proven in production)
Cost: 10 (open-source)
Maintenance: 8 (simple with TypeScript)

Weighted: 8.50/10
```

**Decision: REST for MVP, plan migration to tRPC**

**Rationale:**
- REST wins on team expertise (10 vs 5/8)
- Fastest time to market (tight deadline)
- Plan: Start with REST, migrate to tRPC as team learns
- tRPC fits better long-term (TypeScript, type safety)

**ADRs:**
- ADR-002: API Design - REST for MVP
- ADR-003: Future API Migration - REST to tRPC

---

## Decision Framework Workflow

### Step 1: Identify Decision

```
What are we deciding?
- Component: [Database, Frontend Framework, API Style, etc.]
- Context: [Project requirements, constraints]
- Timeline: [When decision needed]
```

### Step 2: Generate Alternatives

```
Brainstorm 3-5 alternatives:
1. Industry standard option
2. Modern/trending option
3. Team-preferred option
4. Conservative option
5. (Optional) Wild card option

Minimum: 3 alternatives
Maximum: 5 alternatives (diminishing returns beyond 5)
```

### Step 3: Apply Evaluation Criteria

```
For each alternative, score on 0-10 scale:
1. Requirements Fit (30%)
2. Team Expertise (25%)
3. Community & Ecosystem (15%)
4. Performance (10%)
5. Scalability (10%)
6. Cost (5%)
7. Maintenance (5%)

Calculate weighted score = Σ (score × weight)
```

### Step 4: Adjust Weights (Optional)

```
Standard weights work for most decisions.
Adjust if:
- Performance critical → Increase performance weight to 20%, reduce others
- Budget constrained → Increase cost weight to 15%
- Large team with skills gaps → Increase team expertise to 35%

Always ensure weights sum to 100%.
```

### Step 5: Compare Scores

```
Rank alternatives by weighted score.

If top 2 scores are close (<0.5 difference):
- Consider non-quantifiable factors
- Prototype both options
- Get team input
- Document reasoning for tie-break
```

### Step 6: Validate Decision

```
Sanity checks:
- Does top choice actually make sense?
- Any show-stopper concerns not captured in criteria?
- Team buy-in?
- Reversibility if wrong?

If validation fails, revisit scoring or weights.
```

### Step 7: Document as ADR

```
Create Architecture Decision Record:
- Context (why this decision)
- Alternatives considered (with scores)
- Decision (chosen option)
- Rationale (why this option)
- Consequences (positive and negative)
```

---

## Common Patterns

### High Performance Systems

Adjust weights for performance-critical systems:
```
Performance: 25% (↑15%)
Scalability: 15% (↑5%)
Requirements Fit: 25% (↓5%)
Team Expertise: 20% (↓5%)
Community: 10% (↓5%)
Cost: 3% (↓2%)
Maintenance: 2% (↓3%)
```

### Startup/MVP Context

Adjust weights for speed to market:
```
Team Expertise: 40% (↑15%)
Requirements Fit: 25% (↓5%)
Community: 15% (same)
Maintenance: 10% (↑5%)
Performance: 5% (↓5%)
Scalability: 3% (↓7%)
Cost: 2% (↓3%)

Rationale: Team velocity and simplicity trump optimization
```

### Enterprise/Regulated Systems

Adjust weights for stability and compliance:
```
Requirements Fit: 35% (↑5%)
Community: 20% (↑5%)
Maintenance: 15% (↑10%)
Scalability: 12% (↑2%)
Security: 10% (new criterion, reduce others)
Team Expertise: 20% (↓5%)
Performance: 5% (↓5%)
Cost: 3% (↓2%)
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Resume-Driven Development

```
❌ "Let's use Rust because I want to learn it"
✅ Evaluate Rust objectively against requirements

Symptoms:
- Choosing trendy tech without justification
- Ignoring team expertise
- Prioritizing learning over delivery

Fix: Apply framework objectively, score "team expertise" honestly
```

### Anti-Pattern 2: Premature Optimization

```
❌ "We might need to scale to 1M users, let's use Kubernetes"
✅ Evaluate based on actual near-term requirements

Symptoms:
- Over-weighting scalability for MVP
- Choosing complex solutions for simple problems
- "Future-proofing" at expense of delivery

Fix: Score scalability based on 12-18 month projection, not 5-year fantasy
```

### Anti-Pattern 3: Hype-Driven Selection

```
❌ "Everyone is using GraphQL, we should too"
✅ Evaluate if GraphQL solves our specific problems

Symptoms:
- Following trends blindly
- Ignoring team context
- Solving problems you don't have

Fix: Focus on "Requirements Fit" first, don't let community/trend bias score
```

### Anti-Pattern 4: Analysis Paralysis

```
❌ Evaluate 10 options with 20 criteria
✅ Evaluate 3-5 options with 7 standard criteria

Symptoms:
- Too many alternatives
- Too many criteria
- Weeks of research, no decision

Fix: Limit to 5 alternatives max, use standard 7 criteria, timebox decision (1-3 days)
```

---

*Reference for create-architecture skill - Use this framework to make objective, defensible technology decisions*
