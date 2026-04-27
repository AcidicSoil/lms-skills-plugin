# Success Metrics Framework

## Overview

Success metrics are measurable indicators that determine whether a product achieves its objectives. This framework provides a comprehensive catalog of metrics across user adoption, business impact, and technical performance categories.

---

## Metrics Categories

### Category 1: User Adoption Metrics

**Purpose:** Measure how users discover, adopt, and engage with the product.

#### Acquisition Metrics
- **Sign-ups:** Total new user registrations
- **Activation Rate:** % of sign-ups who complete key setup steps
- **Time to First Value:** Time from sign-up to first meaningful action
- **Conversion Rate:** % of visitors who sign up

**Example Targets:**
```
SaaS Project Management Tool:
- 500 sign-ups in month 1
- 70% activation rate (complete profile + create first project)
- <5 minutes time to first value
- 5% visitor-to-sign-up conversion
```

#### Engagement Metrics
- **DAU/WAU/MAU:** Daily/Weekly/Monthly Active Users
- **Session Duration:** Average time spent per session
- **Sessions per User:** How often users return
- **Feature Adoption:** % of users using specific features
- **Stickiness (DAU/MAU):** Daily users as % of monthly users

**Example Targets:**
```
- 1,000 MAU by month 3
- 300 WAU (30% weekly engagement)
- 15 min average session duration
- 3 sessions per week per active user
- 35% stickiness (105 DAU / 300 WAU)
```

#### Retention Metrics
- **D1/D7/D30 Retention:** % users who return after 1/7/30 days
- **Cohort Retention:** Track specific user cohorts over time
- **Churn Rate:** % of users who stop using product
- **Resurrection Rate:** % of churned users who return

**Example Targets:**
```
- 80% D1 retention (come back next day)
- 60% D7 retention (come back after week 1)
- 40% D30 retention (come back after month 1)
- <5% monthly churn rate
```

---

### Category 2: Business Impact Metrics

**Purpose:** Measure product's impact on business objectives and revenue.

#### Revenue Metrics (for monetized products)
- **MRR/ARR:** Monthly/Annual Recurring Revenue
- **ARPU:** Average Revenue Per User
- **LTV:** Lifetime Value per customer
- **CAC:** Customer Acquisition Cost
- **LTV:CAC Ratio:** Must be >3:1 for sustainable business
- **Payback Period:** Time to recover CAC
- **Expansion Revenue:** Upsells, cross-sells from existing customers

**Example Targets:**
```
SaaS Tool:
- $10K MRR by month 6 ($120K ARR)
- $30 ARPU (monthly)
- $360 LTV (assume 12-month retention)
- $100 CAC
- 3.6:1 LTV:CAC ratio
- 3-4 month payback period
- 20% expansion revenue
```

#### Conversion Metrics
- **Free → Paid Conversion:** % of free users who upgrade
- **Trial → Paid Conversion:** % of trial users who subscribe
- **Time to Conversion:** How long from sign-up to paid
- **Upgrade Rate:** % upgrading to higher tiers

**Example Targets:**
```
Freemium Model:
- 5% free-to-paid conversion
- 30-day median time to conversion
- 15% upgrade rate (Starter → Pro)
```

#### Customer Satisfaction Metrics
- **NPS (Net Promoter Score):** -100 to +100 scale, >40 is excellent
- **CSAT (Customer Satisfaction):** % satisfied customers
- **CES (Customer Effort Score):** How easy is product to use
- **Support Ticket Volume:** Proxy for product issues
- **Response/Resolution Time:** Support quality

**Example Targets:**
```
- NPS score: >40 (excellent)
- CSAT: >85% (satisfied or very satisfied)
- CES: <3 on 1-7 scale (low effort)
- <2 support tickets per 100 MAU
- <24 hour ticket response time
```

---

### Category 3: Technical Performance Metrics

**Purpose:** Ensure product meets technical quality standards.

#### Performance Metrics
- **Page Load Time:** Time to interactive
- **API Response Time:** P50, P95, P99
- **Time to First Byte (TTFB):** Server response time
- **Largest Contentful Paint (LCP):** Largest element load time
- **First Input Delay (FID):** Interaction responsiveness
- **Cumulative Layout Shift (CLS):** Visual stability

**Example Targets (Web Vitals):**
```
- Page load time: <2s (P95)
- API response time: <200ms (P95)
- TTFB: <600ms
- LCP: <2.5s (good)
- FID: <100ms (good)
- CLS: <0.1 (good)
```

#### Reliability Metrics
- **Uptime/Availability:** % of time system is accessible
- **Error Rate:** % of requests that fail
- **Mean Time Between Failures (MTBF):** Average time between incidents
- **Mean Time To Recovery (MTTR):** Time to fix incidents
- **Apdex Score:** Application performance index (0-1)

**Example Targets:**
```
- 99.9% uptime (SLA) = 43 min downtime/month
- <0.1% error rate
- MTBF: >720 hours (1 month)
- MTTR: <1 hour
- Apdex: >0.9 (excellent)
```

#### Scalability Metrics
- **Concurrent Users:** How many simultaneous users
- **Requests Per Second (RPS):** System throughput
- **Database Query Time:** Query performance at scale
- **Resource Utilization:** CPU, memory, disk usage

**Example Targets:**
```
- Support 1,000 concurrent users
- Handle 500 RPS (P95)
- <50ms database query time (P95)
- <70% CPU/memory usage under load
```

---

## SMART Metrics Framework

Every metric should be **SMART**: Specific, Measurable, Achievable, Relevant, Time-Bound.

**Bad (Vague):** "Increase user engagement"
**Good (SMART):** "Increase DAU from 50 to 200 (+300%) by end of Q2 2025"

**Template:**
```
[Action Verb] [Metric Name] from [Baseline] to [Target] ([% Change]) by [Date]
```

**Examples:**
```
✅ "Increase D7 retention from 45% to 60% (+33%) by March 31"
✅ "Reduce page load time from 3.2s to <2s (-37%) by April 15"
✅ "Grow MRR from $5K to $15K (+200%) by end of Q2"
✅ "Improve NPS score from +25 to +40 (+60%) by June 30"
```

---

## Metrics by Product Stage

### Pre-Launch (MVP)
**Focus:** Technical validation, initial usability

**Key Metrics:**
- Error rate <0.5%
- Page load time <2s
- System uptime >99%
- Initial user feedback (qualitative)

---

### Launch (0-3 months)
**Focus:** Acquisition and activation

**Key Metrics:**
- Sign-ups per week
- Activation rate (% completing setup)
- Time to first value
- D1/D7 retention

**Example Targets:**
```
Month 1: 100 sign-ups, 70% activation, 60% D7 retention
Month 2: 300 sign-ups, 75% activation, 65% D7 retention
Month 3: 500 sign-ups, 80% activation, 70% D7 retention
```

---

### Growth (3-12 months)
**Focus:** Retention and monetization

**Key Metrics:**
- MAU growth rate
- D30 retention
- Churn rate
- Free → Paid conversion
- MRR growth

**Example Targets:**
```
Month 6: 2,000 MAU, 50% D30 retention, 3% free-to-paid, $10K MRR
Month 12: 5,000 MAU, 60% D30 retention, 5% free-to-paid, $30K MRR
```

---

### Maturity (12+ months)
**Focus:** Efficiency and expansion

**Key Metrics:**
- LTV:CAC ratio
- Expansion revenue
- NPS score
- Market share
- Profitability

**Example Targets:**
```
Year 2: 4:1 LTV:CAC, 25% expansion revenue, +50 NPS, 5% market share
```

---

## North Star Metric

**Definition:** Single most important metric that represents core product value.

**Characteristics:**
- Reflects delivered value to users
- Correlates with business success
- Actionable by team
- Easy to understand

**Examples by Product Type:**

**Social Network:** Daily Active Users (DAU)
**E-commerce:** Orders per Month
**SaaS Tool:** Weekly Active Teams
**Content Platform:** Time Spent per Week
**Marketplace:** Gross Merchandise Volume (GMV)

**Why North Star Matters:**
- Aligns team on what success means
- Prevents vanity metrics (e.g., sign-ups without engagement)
- Focuses efforts on what drives real value

---

## Metrics Hierarchy (Pirate Metrics: AARRR)

**Framework:** Acquisition → Activation → Retention → Revenue → Referral

### 1. Acquisition
**Question:** How do users find us?
**Metrics:** Sign-ups, visitor traffic, conversion rate

### 2. Activation
**Question:** Do users have a great first experience?
**Metrics:** % completing setup, time to first value, feature adoption

### 3. Retention
**Question:** Do users come back?
**Metrics:** D7/D30 retention, churn rate, DAU/MAU

### 4. Revenue
**Question:** Do users pay?
**Metrics:** MRR, ARPU, LTV, conversion rate

### 5. Referral
**Question:** Do users tell others?
**Metrics:** Referral rate, viral coefficient, NPS

---

## Common Metrics Mistakes

### Mistake 1: Vanity Metrics

**Bad:** "10,000 sign-ups!" (but 90% never activate)
**Good:** "1,000 active users (70% activation rate)"

**Vanity Metrics to Avoid:**
- Total sign-ups (without activation/retention)
- Page views (without engagement)
- Social media followers (without engagement)
- App downloads (without usage)

---

### Mistake 2: Too Many Metrics

**Bad:** Tracking 50 metrics, no clear focus
**Good:** Track 5-10 key metrics, 1 North Star

**Principle:** "If everything is important, nothing is important"

---

### Mistake 3: Lagging Indicators Only

**Bad:** Only tracking revenue (result)
**Good:** Track leading indicators (drivers)

**Example:**
```
Lagging: MRR (result)
Leading: Activation rate, feature adoption, engagement
→ If leading indicators drop, MRR will drop later
```

---

### Mistake 4: Not Segmenting

**Bad:** "Overall D7 retention is 50%"
**Good:** "Power users: 80% D7, casual users: 30% D7"

**Segmentation Dimensions:**
- User type (free vs paid)
- Acquisition channel (organic vs paid)
- Company size (SMB vs Enterprise)
- Geography (US vs International)
- Cohort (by sign-up month)

---

## Metrics Checklist

Before finalizing metrics:

- [ ] Metrics are SMART (Specific, Measurable, Achievable, Relevant, Time-Bound)
- [ ] North Star metric identified
- [ ] Metrics cover all AARRR stages
- [ ] Mix of leading and lagging indicators
- [ ] Targets based on data or research (not guesses)
- [ ] Metrics actionable (team can influence them)
- [ ] Baseline and target values specified
- [ ] Timeframes clearly defined
- [ ] Plan for measurement (analytics setup)
- [ ] Avoid vanity metrics
- [ ] 5-10 key metrics (not 50)
- [ ] Metrics reviewed regularly (weekly/monthly)

---

## Example: Complete Metrics for SaaS Tool

```markdown
## Success Metrics

### North Star Metric
**Weekly Active Teams** - Number of teams with ≥1 member active in past 7 days
- Current: 0 (pre-launch)
- Target (Month 3): 100 teams
- Target (Month 6): 300 teams
- Target (Month 12): 1,000 teams

### Acquisition (How do users find us?)
- **Sign-ups:** 500/month by Month 3
- **Activation Rate:** 75% (complete setup + create first project)
- **Time to First Value:** <5 minutes

### Retention (Do users come back?)
- **D7 Retention:** 65% by Month 3
- **D30 Retention:** 50% by Month 6
- **Monthly Churn:** <5%

### Revenue (Do users pay?)
- **Free → Paid Conversion:** 5% by Month 6
- **MRR:** $10K by Month 6, $30K by Month 12
- **ARPU:** $30/month
- **LTV:CAC:** 3:1 or better

### Technical Performance
- **Page Load Time:** <2s (P95)
- **API Response Time:** <200ms (P95)
- **Uptime:** 99.9% (SLA)
- **Error Rate:** <0.1%

### Customer Satisfaction
- **NPS Score:** >40 by Month 6
- **Support Tickets:** <2 per 100 MAU
- **Response Time:** <24 hours
```

---

**Success Metrics Framework - Part of create-prd skill**
**Use this framework to define measurable success criteria**
