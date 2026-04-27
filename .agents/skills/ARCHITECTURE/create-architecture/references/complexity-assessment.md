# Complexity Assessment Guide

Systematic approach to calculating project complexity scores for architecture depth determination.

---

## Overview

Project complexity determines the appropriate level of architectural detail, pattern selection, and ADR count. This guide provides a weighted scoring system for objective complexity assessment.

---

## Complexity Scoring Formula

```
Complexity Score = (Scale × 0.25) + (Data × 0.20) + (Integrations × 0.20) +
                   (Performance × 0.15) + (Security × 0.10) + (Deployment × 0.10)

Range: 0-100
Categories:
  - Simple: 0-30
  - Medium: 31-60
  - Complex: 61-100
```

---

## Factor 1: User Scale (Weight: 25%)

**Scoring Criteria:**

| Users | Concurrent | Score |
|-------|------------|-------|
| < 1,000 | < 100 | 10 |
| 1K - 10K | 100 - 1K | 30 |
| 10K - 100K | 1K - 10K | 60 |
| > 100K | > 10K | 90 |

**How to assess:**

**From requirements:**
```
"Expect 500 users at launch" → <1K → Score: 10
"10,000 active users per month" → 1K-10K → Score: 30
"Target 50K users in year 1" → 10K-100K → Score: 60
"Multi-tenant SaaS with 500K users" → >100K → Score: 90
```

**If not specified:**
```
Internal tool → Assume <1K → Score: 10
B2B SaaS → Assume 1K-10K → Score: 30
Consumer app → Assume 10K-100K → Score: 60
Social platform → Assume >100K → Score: 90
```

**Weighted calculation:**
```
Raw score × 0.25 = Factor contribution
Example: 60 × 0.25 = 15 points
```

---

## Factor 2: Data Volume (Weight: 20%)

**Scoring Criteria:**

| Storage | Growth/Year | Score |
|---------|-------------|-------|
| < 10 GB | < 1 GB/month | 10 |
| 10 GB - 1 TB | 1-100 GB/month | 40 |
| 1 TB - 10 TB | 100 GB - 1 TB/month | 70 |
| > 10 TB | > 1 TB/month | 90 |

**How to assess:**

**Calculate from requirements:**
```
Users: 5,000
Data per user: 10 MB (profile, settings, content)
Total: 5,000 × 10 MB = 50 GB
Growth: 500 users/month × 10 MB = 5 GB/month
→ 10 GB - 1 TB range → Score: 40
```

**Content-heavy systems:**
```
E-commerce: Product images (large)
Media platform: Videos, audio (very large)
SaaS app: Text data (small)

Adjust score based on data type:
- Text only → Lower end of range
- Images → Mid range
- Video/audio → Upper end of range
```

**Weighted calculation:**
```
Raw score × 0.20 = Factor contribution
Example: 40 × 0.20 = 8 points
```

---

## Factor 3: Integration Points (Weight: 20%)

**Scoring Criteria:**

| Integrations | Types | Score |
|--------------|-------|-------|
| 0 - 2 | Simple APIs | 10 |
| 3 - 5 | Multiple APIs, webhooks | 40 |
| 6 - 10 | Many APIs, message queues | 70 |
| > 10 | Complex integration mesh | 90 |

**How to assess:**

**Count external systems:**
```
Example project integrations:
1. Stripe (payment)
2. SendGrid (email)
3. AWS S3 (file storage)
4. Auth0 (authentication)
5. Segment (analytics)
→ 5 integrations → Score: 40
```

**Integration complexity multiplier:**
```
Simple REST API: 1x
Webhook (bidirectional): 1.5x
Message queue (async): 2x
Complex protocol (SOAP, custom): 2.5x

Example:
- 2 REST APIs: 2 × 1x = 2
- 1 Webhook: 1 × 1.5x = 1.5
- 1 Message queue: 1 × 2x = 2
Total weighted: 5.5 → Round to 6 → Score: 70
```

**Weighted calculation:**
```
Raw score × 0.20 = Factor contribution
Example: 40 × 0.20 = 8 points
```

---

## Factor 4: Performance Requirements (Weight: 15%)

**Scoring Criteria:**

| Requirement | Latency | Throughput | Score |
|-------------|---------|------------|-------|
| None specified | No SLA | No SLA | 0 |
| Standard | < 2s | 100 req/s | 30 |
| Strict | < 500ms | 1K req/s | 60 |
| Extreme | < 100ms | 10K+ req/s | 90 |

**How to assess:**

**Response time:**
```
"Page should load fast" (vague) → Standard → 30
"p95 latency < 500ms" (specific) → Strict → 60
"p99 < 100ms required" (demanding) → Extreme → 90
```

**Throughput:**
```
"Handle 1000 concurrent users" → ~100 req/s → Standard → 30
"Support 10K requests/second" → Strict → 60
"High-frequency trading" → Extreme → 90
```

**Real-time requirements:**
```
No real-time: 0
Near real-time (<5s): 30
Real-time (<1s): 60
Hard real-time (<100ms): 90
```

**Weighted calculation:**
```
Raw score × 0.15 = Factor contribution
Example: 60 × 0.15 = 9 points
```

---

## Factor 5: Security Requirements (Weight: 10%)

**Scoring Criteria:**

| Level | Requirements | Score |
|-------|--------------|-------|
| Basic | Password auth, HTTPS | 10 |
| Standard | OAuth, RBAC, encryption | 40 |
| Advanced | MFA, audit logs, compliance | 70 |
| Critical | FIPS, HSM, zero-trust | 90 |

**How to assess:**

**Authentication:**
```
Email/password only → Basic → 10
OAuth/SSO → Standard → 40
MFA required → Advanced → 70
Hardware tokens, biometric → Critical → 90
```

**Data protection:**
```
HTTPS only → Basic → 10
Encryption at rest → Standard → 40
Field-level encryption → Advanced → 70
HSM, key rotation → Critical → 90
```

**Compliance:**
```
No requirements → Basic → 10
GDPR → Standard → 40
HIPAA, PCI-DSS → Advanced → 70
SOC2 Type II, FedRAMP → Critical → 90
```

**Take highest score from categories.**

**Weighted calculation:**
```
Raw score × 0.10 = Factor contribution
Example: 40 × 0.10 = 4 points
```

---

## Factor 6: Deployment Complexity (Weight: 10%)

**Scoring Criteria:**

| Deployment | Infrastructure | Score |
|------------|----------------|-------|
| Single region | Simple (Vercel, Heroku) | 10 |
| Multi-region | Moderate (AWS, GCP) | 50 |
| Global | Complex (CDN, edge, multi-cloud) | 80 |

**How to assess:**

**Geographic distribution:**
```
Single region (US only) → 10
2-3 regions (US, EU) → 50
Global (6+ regions) → 80
```

**Infrastructure complexity:**
```
Serverless (Vercel, Netlify) → 10
Managed services (AWS Fargate, Cloud Run) → 30
Self-managed VMs/containers → 50
Kubernetes → 70
Multi-cloud → 90
```

**CI/CD requirements:**
```
Manual deployment → 10
Basic CI/CD (GitHub Actions) → 30
Advanced (blue-green, canary) → 60
Complex (feature flags, gradual rollout) → 80
```

**Take highest score from categories.**

**Weighted calculation:**
```
Raw score × 0.10 = Factor contribution
Example: 50 × 0.10 = 5 points
```

---

## Complete Calculation Examples

### Example 1: Simple Internal Dashboard

**Requirements:**
- 50 internal users
- Read-only dashboard
- PostgreSQL database (existing)
- Standard auth (company SSO)
- Single deployment (company AWS)

**Scoring:**
```
User Scale: <1K → 10 × 0.25 = 2.5
Data Volume: <10GB (read-only) → 10 × 0.20 = 2.0
Integrations: 1 (SSO) → 10 × 0.20 = 2.0
Performance: Standard → 30 × 0.15 = 4.5
Security: Standard (SSO) → 40 × 0.10 = 4.0
Deployment: Single region, simple → 10 × 0.10 = 1.0

Total: 2.5 + 2.0 + 2.0 + 4.5 + 4.0 + 1.0 = 16.0

Category: Simple (0-30)
```

**Architecture Implications:**
- Minimal documentation (10-15 pages)
- 3-5 ADRs
- Standard patterns (SPA + REST API)
- Simple deployment (Docker on AWS ECS)

---

### Example 2: E-commerce Platform

**Requirements:**
- 50K users at launch, 500K in 3 years
- Product catalog, orders, payments
- Integrations: Stripe, SendGrid, S3, Analytics
- Response time <500ms p95
- PCI compliance via Stripe
- Multi-region (US, EU)

**Scoring:**
```
User Scale: 10K-100K → 60 × 0.25 = 15.0
Data Volume: 1TB (products, orders, images) → 70 × 0.20 = 14.0
Integrations: 4 integrations → 40 × 0.20 = 8.0
Performance: <500ms p95 → 60 × 0.15 = 9.0
Security: PCI via Stripe → 40 × 0.10 = 4.0
Deployment: Multi-region → 50 × 0.10 = 5.0

Total: 15.0 + 14.0 + 8.0 + 9.0 + 4.0 + 5.0 = 55.0

Category: Medium (31-60)
```

**Architecture Implications:**
- Moderate documentation (15-25 pages)
- 5-10 ADRs
- Multi-tier architecture
- Caching strategy (Redis)
- CDN for assets
- Kubernetes or managed containers

---

### Example 3: High-Frequency Trading Platform

**Requirements:**
- 100K+ active traders
- Real-time market data (1M events/sec)
- 10+ exchange integrations
- <10ms latency required
- Regulatory compliance (SEC, FINRA)
- Global deployment (Americas, EU, Asia)

**Scoring:**
```
User Scale: >100K → 90 × 0.25 = 22.5
Data Volume: >10TB (market data) → 90 × 0.20 = 18.0
Integrations: >10 exchanges → 90 × 0.20 = 18.0
Performance: <10ms latency → 90 × 0.15 = 13.5
Security: Regulatory compliance → 90 × 0.10 = 9.0
Deployment: Global, complex → 90 × 0.10 = 9.0

Total: 22.5 + 18.0 + 18.0 + 13.5 + 9.0 + 9.0 = 90.0

Category: Complex (61-100)
```

**Architecture Implications:**
- Comprehensive documentation (25-40 pages)
- 10-15+ ADRs
- Distributed systems patterns
- Event-driven architecture
- Advanced caching and optimization
- Multi-region active-active
- Requires expert architecture review

---

## Complexity Category Guidelines

### Simple (0-30)

**Characteristics:**
- Small user base (<1K)
- Limited data (<10GB)
- Few integrations (0-2)
- Standard performance acceptable
- Basic security sufficient
- Single region deployment

**Architecture Depth:**
- 10-15 page architecture doc
- 3-5 ADRs
- Standard patterns (CRUD, REST, SPA)
- Simple tech stack
- Minimal infrastructure

**Time to Architect:**
- 1-2 days

**Example Projects:**
- Internal dashboards
- Small SaaS MVPs
- Company websites
- Admin panels

---

### Medium (31-60)

**Characteristics:**
- Moderate user base (1K-100K)
- Significant data (10GB-10TB)
- Multiple integrations (3-10)
- Performance requirements specified
- Standard security + compliance
- Multi-region or complex deployment

**Architecture Depth:**
- 15-25 page architecture doc
- 5-10 ADRs
- Multi-tier patterns
- Considered tech stack with tradeoffs
- Moderate infrastructure (Kubernetes, CDN)

**Time to Architect:**
- 3-5 days

**Example Projects:**
- SaaS applications
- E-commerce platforms
- Content platforms
- B2B tools

---

### Complex (61-100)

**Characteristics:**
- Large user base (>100K)
- Massive data (>10TB)
- Many integrations (>10)
- Strict performance requirements (<100ms)
- Advanced security and compliance
- Global deployment, multi-cloud

**Architecture Depth:**
- 25-40 page architecture doc
- 10-15+ ADRs
- Distributed systems patterns
- Highly optimized tech stack
- Complex infrastructure (K8s, service mesh, etc.)

**Time to Architect:**
- 1-2 weeks
- May require expert review

**Example Projects:**
- High-scale SaaS (Slack, Notion scale)
- Financial trading platforms
- Global marketplaces
- Real-time collaboration tools

---

## Special Considerations

### Brownfield Projects (Add +10-20 points)

Migrating or extending existing systems adds complexity:
```
Greenfield e-commerce: Score 55
Brownfield e-commerce migration: Score 55 + 15 = 70

Rationale:
- Legacy code constraints
- Data migration complexity
- Incremental migration strategy
- Backward compatibility
```

---

### Distributed Teams (Add +5-10 points)

Multiple teams or locations:
```
Single co-located team: No adjustment
2-3 teams or remote: +5 points
Many teams, global: +10 points

Rationale:
- Coordination overhead
- API contract complexity
- Deployment coordination
```

---

### Regulatory Requirements (Add +10-20 points)

Strict compliance:
```
GDPR only: +5 points
HIPAA or PCI-DSS: +10 points
SOC2 Type II, FedRAMP: +15 points
Multiple critical compliance: +20 points

Rationale:
- Audit logging complexity
- Data residency constraints
- Security controls
- Documentation requirements
```

---

## Decision Matrix

| Score | Category | Architecture Effort | Documentation | ADRs | Patterns |
|-------|----------|---------------------|---------------|------|----------|
| 0-30 | Simple | Low (1-2 days) | 10-15 pages | 3-5 | Standard |
| 31-60 | Medium | Moderate (3-5 days) | 15-25 pages | 5-10 | Multi-tier |
| 61-100 | Complex | High (1-2 weeks) | 25-40 pages | 10-15+ | Distributed |

---

## Quick Assessment Worksheet

```
Project: _______________________

Factor 1: User Scale
  Users: _______ → Score: _____ × 0.25 = _____

Factor 2: Data Volume
  Storage: _______ → Score: _____ × 0.20 = _____

Factor 3: Integrations
  Count: _______ → Score: _____ × 0.20 = _____

Factor 4: Performance
  Requirement: _______ → Score: _____ × 0.15 = _____

Factor 5: Security
  Level: _______ → Score: _____ × 0.10 = _____

Factor 6: Deployment
  Complexity: _______ → Score: _____ × 0.10 = _____

                        TOTAL SCORE: _____

Special Considerations:
  Brownfield: +___
  Distributed teams: +___
  Regulatory: +___

                ADJUSTED SCORE: _____

Category: Simple / Medium / Complex
```

---

*Reference for create-architecture skill - Use this scoring system to objectively assess project complexity and determine appropriate architecture depth*
