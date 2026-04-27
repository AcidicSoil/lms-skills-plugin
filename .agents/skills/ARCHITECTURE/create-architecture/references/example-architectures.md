# Example Architectures

Complete architecture examples for Frontend, Backend, and Fullstack projects at different complexity levels.

---

## Example 1: Simple Frontend Dashboard (Score: 15)

**Project:** Internal analytics dashboard for sales team

**Requirements:**
- 50 sales reps viewing real-time metrics
- Connect to existing PostgreSQL database (read-only)
- Charts and data visualization
- Company SSO authentication
- Desktop-only (no mobile requirement)

**Complexity Score:** 15 (Simple)
- Users: 50 → 10 points × 0.25 = 2.5
- Data: Read-only, <10GB → 10 × 0.20 = 2.0
- Integrations: 1 (SSO) → 10 × 0.20 = 2.0
- Performance: Standard → 30 × 0.15 = 4.5
- Security: SSO → 40 × 0.10 = 4.0
- Deployment: Single region → 10 × 0.10 = 1.0

**Architecture:**

```
┌─────────────────────────────────────┐
│  Frontend (React SPA)               │
│  - Vite + TypeScript                │
│  - Recharts for visualization       │
│  - React Query for data fetching    │
│  - Zustand for state                │
└─────────────────────────────────────┘
           ↓ HTTPS + SSO
┌─────────────────────────────────────┐
│  Company SSO (SAML/OAuth)           │
└─────────────────────────────────────┘
           ↓ Authenticated
┌─────────────────────────────────────┐
│  Backend API (Express + TypeScript) │
│  - REST endpoints (read-only)       │
│  - SSO token validation             │
└─────────────────────────────────────┘
           ↓ SQL queries
┌─────────────────────────────────────┐
│  Existing PostgreSQL Database       │
│  (Read-only access)                 │
└─────────────────────────────────────┘
```

**Technology Stack:**
- **Frontend:** React 18, TypeScript, Vite, Recharts, React Query, Zustand
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (existing, read-only)
- **Auth:** Company SSO integration (SAML)
- **Hosting:** Frontend on Netlify, Backend on Railway
- **Monitoring:** Sentry for errors

**Key ADRs:**
1. **ADR-001:** Use React (team expertise, rich charting libraries)
2. **ADR-002:** Read-only PostgreSQL access (no write access needed)
3. **ADR-003:** Company SSO (security requirement)

**Cost:** ~$50/month (Netlify free tier + Railway $20 + Sentry free tier)

**Time to Build:** 2-3 weeks

---

## Example 2: Medium E-commerce Platform (Score: 55)

**Project:** Online marketplace for handmade goods

**Requirements:**
- 50K users at launch, 500K projected year 1
- Product catalog (10K products), orders, payments
- Stripe integration for payments
- Email notifications (order confirmations, shipping)
- Multi-region (US, EU)
- Responsive web app
- Admin panel for sellers

**Complexity Score:** 55 (Medium)
- Users: 10K-100K → 60 × 0.25 = 15.0
- Data: ~1TB (products, images, orders) → 70 × 0.20 = 14.0
- Integrations: 4 (Stripe, SendGrid, S3, Analytics) → 40 × 0.20 = 8.0
- Performance: <500ms p95 → 60 × 0.15 = 9.0
- Security: PCI via Stripe, standard auth → 40 × 0.10 = 4.0
- Deployment: Multi-region → 50 × 0.10 = 5.0

**Architecture:**

```
┌─────────────────────────────────────────────┐
│          CDN (CloudFront)                   │
│          Static Assets                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│   Load Balancer (Application LB)            │
└─────────────────────────────────────────────┘
         ↓                    ↓
    [US Region]          [EU Region]
┌─────────────────┐  ┌─────────────────┐
│  Next.js App    │  │  Next.js App    │
│  (Auto-scale)   │  │  (Auto-scale)   │
│  - SSR + API    │  │  - SSR + API    │
└─────────────────┘  └─────────────────┘
         ↓                    ↓
┌─────────────────────────────────────────────┐
│         Redis Cache (ElastiCache)           │
│         Session + Product Cache             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      PostgreSQL (RDS Multi-AZ)              │
│      Primary + Read Replicas                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      S3 (Product Images)                    │
└─────────────────────────────────────────────┘

External Integrations:
┌────────────┐  ┌────────────┐  ┌────────────┐
│   Stripe   │  │ SendGrid   │  │  Segment   │
│  Payments  │  │   Email    │  │ Analytics  │
└────────────┘  └────────────┘  └────────────┘
```

**Technology Stack:**
- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (AWS RDS Multi-AZ), Redis (ElastiCache)
- **Storage:** AWS S3 (CloudFront CDN)
- **Auth:** NextAuth.js (email/password + OAuth)
- **Payments:** Stripe
- **Email:** SendGrid
- **Hosting:** AWS (ECS Fargate or Vercel Enterprise)
- **Monitoring:** Datadog (APM + Logs + Metrics)

**Key ADRs:**
1. **ADR-001:** Next.js Fullstack (SSR + API + fast development)
2. **ADR-002:** PostgreSQL (relational data, ACID for orders)
3. **ADR-003:** Stripe (PCI compliance, robust payments)
4. **ADR-004:** Multi-region Deployment (US + EU for latency)
5. **ADR-005:** Redis Caching (product catalog, sessions)
6. **ADR-006:** S3 + CloudFront (image hosting + global CDN)

**Scaling Strategy:**
- **10K users:** Single region, 2 app servers, 1 DB instance
- **50K users:** Multi-region, auto-scale (4-8 servers), read replicas
- **500K users:** Add Redis, CDN optimization, database sharding preparation

**Cost:** ~$800/month
- Hosting: $400 (ECS/Fargate)
- Database: $200 (RDS)
- CDN: $50 (CloudFront)
- Monitoring: $100 (Datadog)
- Email: $30 (SendGrid)
- Misc: $20 (S3, etc.)

**Time to Build:** 3-4 months (MVP in 6-8 weeks)

---

## Example 3: Complex Real-Time Collaboration Tool (Score: 75)

**Project:** Real-time project management platform (like Notion)

**Requirements:**
- 100K users, real-time collaboration
- Rich text editor with multiplayer editing
- Real-time presence (who's online, typing)
- Document versioning and history
- File attachments (images, PDFs)
- Mobile app (React Native)
- API for third-party integrations
- Global deployment (6 regions)

**Complexity Score:** 75 (Complex)
- Users: >100K → 90 × 0.25 = 22.5
- Data: >1TB (documents, versions, files) → 70 × 0.20 = 14.0
- Integrations: 8 (Slack, Google Drive, etc.) → 70 × 0.20 = 14.0
- Performance: <200ms p95 → 60 × 0.15 = 9.0
- Security: Enterprise (SSO, audit logs) → 70 × 0.10 = 7.0
- Deployment: Global (6 regions) → 80 × 0.10 = 8.0

**Architecture:**

```
┌──────────────────────────────────────────────────────┐
│                 Global CDN (CloudFlare)              │
│                 Edge Workers (lightweight logic)     │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│            Global Load Balancer (Route53)            │
│            Route to nearest region                   │
└──────────────────────────────────────────────────────┘
         ↓           ↓           ↓           ↓
   [US-West]    [US-East]    [EU-West]   [AP-SE]
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Next.js  │  │ Next.js  │  │ Next.js  │  │ Next.js  │
│ Frontend │  │ Frontend │  │ Frontend │  │ Frontend │
│ + BFF    │  │ + BFF    │  │ + BFF    │  │ + BFF    │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
      ↓             ↓             ↓             ↓
┌──────────────────────────────────────────────────────┐
│      WebSocket Servers (Socket.IO Cluster)           │
│      Real-time Presence + Multiplayer Editing        │
│      Redis Adapter for cross-server sync             │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│               API Gateway (Kong/Traefik)             │
│               Rate Limiting + Auth                   │
└──────────────────────────────────────────────────────┘
         ↓           ↓           ↓           ↓
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Document │  │   User   │  │   File   │  │  Webhook │
│ Service  │  │ Service  │  │ Service  │  │ Service  │
│ (Node.js)│  │(Node.js) │  │ (Go)     │  │(Node.js) │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
      ↓             ↓             ↓             ↓
┌──────────────────────────────────────────────────────┐
│            PostgreSQL (Multi-Region Replicas)        │
│            Primary: US-East, Read Replicas: 5        │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│          Redis Cluster (Presence, Cache, Pub/Sub)    │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│             S3 (File Storage) + CloudFront           │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│       Event Bus (Kafka for async processing)         │
│       - Document version snapshots                   │
│       - Audit logs                                   │
│       - Third-party webhook triggers                 │
└──────────────────────────────────────────────────────┘
```

**Technology Stack:**
- **Frontend:** Next.js 14, React, TypeScript, Tiptap (rich text editor)
- **Mobile:** React Native (shared code with web)
- **Backend:** Microservices (Node.js, Go)
- **Real-time:** Socket.IO cluster with Redis adapter
- **Database:** PostgreSQL (multi-region replication), Redis Cluster
- **Storage:** S3 + CloudFront
- **Event Bus:** Apache Kafka
- **API Gateway:** Kong
- **Auth:** Auth0 (SSO, SAML for enterprise)
- **Monitoring:** Datadog (full observability stack)
- **Infrastructure:** Kubernetes (EKS) multi-region

**Key ADRs:**
1. **ADR-001:** Microservices Architecture (scale independently)
2. **ADR-002:** Socket.IO for Real-Time (WebSocket with fallbacks)
3. **ADR-003:** Postgres Multi-Region Replicas (global read performance)
4. **ADR-004:** Redis for Presence + Pub/Sub (real-time sync across servers)
5. **ADR-005:** Kafka for Event Sourcing (audit logs, versioning)
6. **ADR-006:** BFF Pattern (optimized APIs per client type)
7. **ADR-007:** Kubernetes for Orchestration (auto-scaling, multi-region)
8. **ADR-008:** Tiptap/ProseMirror for Editor (extensible, collaborative editing)

**Scaling Strategy:**
- **Horizontal:** Auto-scale app servers (2-50 per region)
- **Database:** Read replicas per region, eventual multi-primary
- **Real-time:** Socket.IO cluster scales with Redis pub/sub
- **Caching:** Multi-tier (CDN, Redis, in-memory)

**Cost:** ~$5K/month
- Kubernetes: $2K (EKS + nodes)
- Database: $1.5K (RDS Multi-AZ + replicas)
- Redis: $500 (ElastiCache cluster)
- CDN: $300 (CloudFront + CloudFlare)
- Monitoring: $400 (Datadog)
- Kafka: $200 (AWS MSK)
- Misc: $100 (S3, Auth0, etc.)

**Time to Build:** 6-12 months (MVP in 3 months, scale over time)

---

## Example 4: Backend-Only API Service (Score: 40)

**Project:** Payment processing API for mobile apps

**Requirements:**
- REST API for mobile apps (iOS, Android)
- Process payments via Stripe
- User accounts and transaction history
- Webhook integrations for apps
- 10K API requests/day
- JWT authentication
- 99.9% uptime SLA

**Complexity Score:** 40 (Medium)
- Users: 10K (API clients, not end users) → 30 × 0.25 = 7.5
- Data: ~100GB (transactions) → 40 × 0.20 = 8.0
- Integrations: 3 (Stripe, mobile apps, webhooks) → 40 × 0.20 = 8.0
- Performance: <500ms → 60 × 0.15 = 9.0
- Security: Financial data, PCI via Stripe → 70 × 0.10 = 7.0
- Deployment: Multi-AZ → 30 × 0.10 = 3.0

**Architecture:**

```
┌────────────┐    ┌────────────┐
│  iOS App   │    │Android App │
└────────────┘    └────────────┘
        ↓               ↓
┌──────────────────────────────────┐
│   API Gateway (AWS API Gateway)  │
│   - Rate limiting                │
│   - API key management           │
│   - Request/response logging     │
└──────────────────────────────────┘
                ↓
┌──────────────────────────────────┐
│   Load Balancer (ALB)            │
└──────────────────────────────────┘
        ↓               ↓
┌────────────┐    ┌────────────┐
│ API Server │    │ API Server │
│ (FastAPI)  │    │ (FastAPI)  │
│ Python 3.11│    │ Python 3.11│
└────────────┘    └────────────┘
        ↓               ↓
┌──────────────────────────────────┐
│   PostgreSQL (RDS Multi-AZ)      │
│   - Users, Transactions          │
└──────────────────────────────────┘
        ↓               ↓
┌────────────┐    ┌────────────┐
│   Stripe   │    │  Webhook   │
│  Payments  │    │  Workers   │
└────────────┘    └────────────┘
```

**Technology Stack:**
- **API:** FastAPI (Python), Pydantic for validation
- **Database:** PostgreSQL (AWS RDS Multi-AZ), SQLAlchemy ORM
- **Auth:** JWT (PyJWT)
- **Payments:** Stripe SDK
- **Queue:** AWS SQS (for async webhook delivery)
- **Hosting:** AWS ECS Fargate
- **Monitoring:** CloudWatch + Sentry
- **Documentation:** OpenAPI (auto-generated by FastAPI)

**Key ADRs:**
1. **ADR-001:** FastAPI (Python performance, OpenAPI generation)
2. **ADR-002:** JWT Authentication (stateless, scalable)
3. **ADR-003:** PostgreSQL (ACID for financial transactions)
4. **ADR-004:** SQS for Webhooks (reliable async delivery)

**Cost:** ~$300/month
- Hosting: $150 (ECS Fargate)
- Database: $100 (RDS)
- Misc: $50 (SQS, CloudWatch, etc.)

**Time to Build:** 4-6 weeks

---

*Reference for create-architecture skill - Use these complete examples as templates for architecture documentation*
