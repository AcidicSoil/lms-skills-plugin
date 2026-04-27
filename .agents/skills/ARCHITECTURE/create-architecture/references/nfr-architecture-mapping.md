# NFR Architecture Mapping

Mapping from Non-Functional Requirements to specific architecture decisions and patterns.

---

## Overview

This guide maps common NFRs to concrete architectural patterns, technologies, and design decisions. Use this to ensure your architecture addresses all stated NFRs.

---

## Performance NFRs

### NFR: Response Time (< 500ms p95)

**Architecture Impact:**

**Caching Strategy:**
- CDN for static assets (CloudFlare, Fastly)
- Application caching (Redis, Memcached)
- Database query caching
- HTTP caching headers

**Optimize Data Access:**
- Database indexing strategy
- Query optimization (N+1 prevention)
- Database read replicas
- Connection pooling

**Frontend Optimization:**
- Code splitting
- Lazy loading
- Image optimization (WebP, next/image)
- Minimize JavaScript bundle

**Example Architecture:**
```
CDN (static) → Load Balancer → App Servers (with Redis cache) → Read Replicas (DB)
```

---

### NFR: High Throughput (1000+ req/sec)

**Architecture Impact:**

**Horizontal Scaling:**
- Stateless application servers
- Load balancer (Application LB, NGINX)
- Auto-scaling groups
- Session storage (Redis, database)

**Async Processing:**
- Message queues (SQS, RabbitMQ, Kafka)
- Background workers
- Event-driven architecture

**Database Optimization:**
- Database connection pooling
- Read replicas for read-heavy loads
- Sharding for write-heavy loads

**Example Architecture:**
```
Users → Load Balancer → [App Servers (auto-scale)] → Message Queue → [Workers]
                              ↓
                         Primary DB ← Read Replicas
```

---

## Scalability NFRs

### NFR: User Growth (10K → 100K users in 12 months)

**Architecture Impact:**

**Design for Horizontal Scaling:**
- Stateless services (no in-memory sessions)
- Cloud-native architecture (containers)
- Database scaling strategy (sharding plan)

**Infrastructure as Code:**
- Terraform or CloudFormation
- Automated scaling policies
- Multi-AZ deployment

**Monitoring and Planning:**
- Capacity planning metrics
- Load testing at target scale
- Cost projection

**Example Pattern:**
```
Start: Monolith on single server (10K users)
→ Scale: Load-balanced app tier + DB replicas (50K users)
→ Scale: Microservices + sharding (100K+ users)
```

---

### NFR: Data Growth (1TB/year)

**Architecture Impact:**

**Data Lifecycle:**
- Data archiving strategy (cold storage)
- Data retention policies
- Data partitioning/sharding

**Storage Optimization:**
- Object storage for files (S3, GCS)
- Compression (gzip, Brotli)
- Efficient data types

**Example Architecture:**
```
Hot Data (last 30 days): Primary DB
Warm Data (30-90 days): Read-optimized store
Cold Data (90+ days): Archive (S3 Glacier)
```

---

## Security NFRs

### NFR: Authentication & Authorization (OAuth 2.0, RBAC)

**Architecture Impact:**

**Auth Infrastructure:**
- OAuth provider (Auth0, NextAuth, custom)
- Session management (JWT vs sessions)
- API authentication (Bearer tokens)

**Authorization Model:**
- Role-Based Access Control (RBAC)
- Permission system
- Resource-level permissions

**Example Architecture:**
```
Client → Auth Provider (OAuth) → Token Validation → RBAC Middleware → App Logic
```

**ADR Topics:**
- ADR-XXX: Authentication Method (OAuth vs SAML)
- ADR-XXX: Session Strategy (JWT vs server sessions)
- ADR-XXX: Authorization Model (RBAC vs ABAC)

---

### NFR: Data Encryption (At Rest, In Transit)

**Architecture Impact:**

**In-Transit Encryption:**
- HTTPS/TLS for all endpoints
- Certificate management (Let's Encrypt, ACM)
- HSTS headers

**At-Rest Encryption:**
- Database encryption (AES-256)
- File storage encryption (S3 SSE)
- Application-level encryption (for sensitive fields)
- Key management (AWS KMS, HashiCorp Vault)

**Example Pattern:**
```
Client → HTTPS → Load Balancer (TLS termination) → App (encrypted env vars) → DB (encrypted at rest)
```

---

### NFR: Compliance (GDPR, HIPAA, SOC2)

**Architecture Impact:**

**GDPR:**
- Data export capability (user data portability)
- Data deletion (right to be forgotten)
- Consent management
- Data residency (EU data in EU)
- Audit logging

**HIPAA (Healthcare):**
- Encrypted PHI (Protected Health Information)
- Audit trails for data access
- Access controls and authentication
- Business Associate Agreements (BAA)
- Data backup and disaster recovery

**SOC2:**
- Security monitoring and logging
- Access controls
- Incident response procedures
- Change management process
- Vendor management

**Example Architecture (GDPR):**
```
Multi-region deployment:
- EU users → EU region (data residency)
- US users → US region
- Audit logs → Centralized logging (CloudWatch, Datadog)
- GDPR exports → Automated report generation
```

---

## Reliability NFRs

### NFR: Availability (99.9% uptime)

**Architecture Impact:**

**Redundancy:**
- Multi-AZ deployment
- Database replication
- Health checks and auto-recovery
- Failover strategies

**Monitoring & Alerting:**
- Uptime monitoring (UptimeRobot, Pingdom)
- Application monitoring (Datadog, New Relic)
- Error tracking (Sentry)
- On-call rotation

**Example Architecture:**
```
Load Balancer (multi-AZ)
    ↓
[App Servers in AZ-1, AZ-2, AZ-3]
    ↓
Primary DB (AZ-1) ← Standby DB (AZ-2)
```

**Uptime Calculation:**
```
99.9% = 43 minutes downtime/month
Strategies:
- Zero-downtime deployments (blue-green, rolling)
- Database failover <60 seconds
- CDN redundancy
```

---

### NFR: Disaster Recovery (RPO: 1 hour, RTO: 4 hours)

**Architecture Impact:**

**Backup Strategy:**
- Automated database backups (hourly for 1-hour RPO)
- Point-in-time recovery
- Multi-region backups

**Recovery Plan:**
- Infrastructure as Code (rebuild from code)
- Runbooks for recovery procedures
- Regular DR drills

**Example Pattern:**
```
Primary Region: US-East
  ↓ Continuous backups
Backup Region: US-West
  ↓ Can restore within 4 hours

Backup schedule:
- Database: Hourly snapshots (1-hour RPO)
- Object storage: Cross-region replication
- Config: Infrastructure as Code (instant rebuild)
```

---

## Maintainability NFRs

### NFR: Test Coverage (80% code coverage)

**Architecture Impact:**

**Testing Strategy:**
- Unit tests (Jest, Pytest, Go test)
- Integration tests (Supertest, TestContainers)
- End-to-end tests (Playwright, Cypress)
- CI/CD test automation

**Code Organization:**
- Testable architecture (dependency injection)
- Separation of concerns
- Pure functions (easy to test)

**Example CI Pipeline:**
```
git push → GitHub Actions:
  1. Lint (ESLint, Ruff)
  2. Unit tests (Jest)
  3. Integration tests (Supertest + TestContainers)
  4. Coverage check (fail if <80%)
  5. Deploy (only if tests pass)
```

---

### NFR: Documentation (API docs, architecture docs)

**Architecture Impact:**

**API Documentation:**
- OpenAPI/Swagger spec
- Auto-generated docs from code
- Interactive API explorer

**Architecture Documentation:**
- ADRs for decisions
- System diagrams (C4 model)
- Runbooks for operations

**Example Tools:**
```
API Docs: Swagger UI (OpenAPI spec)
Architecture: docs/architecture.md + ADRs
Code Docs: TSDoc, JSDoc (auto-generated)
Deployment Docs: Runbooks in docs/runbooks/
```

---

## Usability NFRs

### NFR: Mobile Responsiveness

**Architecture Impact:**

**Frontend Approach:**
- Mobile-first CSS
- Responsive frameworks (Tailwind, Bootstrap)
- Touch-optimized UI
- Adaptive images

**Backend Considerations:**
- Mobile-optimized payloads
- Image resizing API
- Bandwidth-aware responses

---

### NFR: Accessibility (WCAG 2.1 AA)

**Architecture Impact:**

**Frontend Architecture:**
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance

**Testing:**
- Automated accessibility tests (axe-core, pa11y)
- Manual testing with screen readers
- CI checks for accessibility

---

## Operational NFRs

### NFR: Monitoring & Observability

**Architecture Impact:**

**Observability Stack:**
- Metrics (Prometheus, Datadog)
- Logging (CloudWatch, Datadog, Loki)
- Tracing (Jaeger, Datadog APM)
- Alerting (PagerDuty, OpsGenie)

**Instrumentation:**
- Application metrics (custom + standard)
- Database query metrics
- Error tracking (Sentry)
- User analytics (Posthog, Mixpanel)

**Example Architecture:**
```
App Servers → Datadog Agent → Datadog Cloud
  - Metrics: Request rate, latency, errors
  - Logs: Structured JSON logs
  - Traces: Distributed tracing for requests
  - Alerts: Slack + PagerDuty
```

---

## Cost NFRs

### NFR: Infrastructure Budget ($2K/month)

**Architecture Impact:**

**Cost Optimization Strategies:**
- Serverless where applicable (pay-per-use)
- Right-sized instances (avoid over-provisioning)
- Reserved instances for steady load
- Auto-scaling (scale down when idle)
- CDN for bandwidth savings

**Example Budget Breakdown:**
```
$2K/month budget:
- Hosting: $800 (AWS ECS/Fargate)
- Database: $400 (RDS PostgreSQL)
- CDN: $200 (CloudFront)
- Monitoring: $200 (Datadog)
- Email/SMS: $100 (SendGrid/Twilio)
- Misc: $300 (domain, storage, etc.)
Total: $2,000/month
```

**Architecture Choice:**
```
Fits budget: Serverless (Vercel) + managed DB (Neon/PlanetScale)
Doesn't fit: Kubernetes cluster (too expensive)
```

---

## NFR Checklist

Use this checklist to ensure all NFRs are addressed in architecture:

### Performance
- [ ] Response time targets documented
- [ ] Caching strategy defined
- [ ] Database optimization plan
- [ ] Frontend performance addressed

### Scalability
- [ ] Horizontal scaling strategy
- [ ] Database scaling plan
- [ ] Auto-scaling configured
- [ ] Load testing plan

### Security
- [ ] Authentication method selected
- [ ] Authorization model designed
- [ ] Data encryption (rest + transit)
- [ ] Compliance requirements addressed

### Reliability
- [ ] Availability target defined
- [ ] Redundancy and failover
- [ ] Monitoring and alerting
- [ ] Disaster recovery plan

### Maintainability
- [ ] Testing strategy defined
- [ ] CI/CD pipeline designed
- [ ] Documentation plan
- [ ] Code organization principles

### Operational
- [ ] Monitoring stack selected
- [ ] Logging strategy
- [ ] Alerting configured
- [ ] On-call process defined

### Cost
- [ ] Budget constraints documented
- [ ] Cost optimization strategies
- [ ] Budget breakdown by service

---

*Reference for create-architecture skill - Use this mapping to ensure all NFRs are translated into concrete architecture decisions*
