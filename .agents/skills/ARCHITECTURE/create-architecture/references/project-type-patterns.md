# Project Type Patterns

Patterns and detection criteria for identifying Frontend, Backend, and Fullstack project types from requirements.

---

## Overview

Different project types require different architectural approaches. This guide provides systematic criteria for detecting project type from requirements and recommends appropriate architectural patterns for each type.

---

## Project Type Detection

### Frontend-Only Projects

**Primary Indicators:**
- UI/UX requirements dominate (70%+ of requirements are frontend-focused)
- No mention of backend/server requirements
- Consumes existing APIs (doesn't create them)
- Focus on user interface, interactions, and visual design
- Data comes from external sources (APIs, backends)

**Technology Indicators:**
- React, Vue, Angular, Svelte, Solid mentioned
- State management libs (Redux, Zustand, Recoil)
- UI frameworks (Material-UI, Chakra, Ant Design)
- Build tools (Vite, Webpack, esbuild)
- No backend frameworks mentioned

**Requirements Keywords:**
- "User interface", "dashboard", "web app", "SPA"
- "Component library", "design system"
- "Real-time updates", "responsive design"
- "Client-side routing", "state management"

**Common Examples:**
- Admin dashboards
- Data visualization tools
- Content management UIs
- E-commerce frontends (with existing backend)
- Marketing websites with CMS integration

**When to select:**
✅ Backend already exists
✅ APIs provided by external services
✅ No custom business logic on server
✅ Focus on user experience and interactivity

---

### Backend-Only Projects

**Primary Indicators:**
- API/service requirements dominate (70%+ backend-focused)
- No UI requirements mentioned
- Focus on business logic, data processing, integrations
- Serving data to external consumers (mobile apps, other services)
- Heavy emphasis on data models, databases, scalability

**Technology Indicators:**
- Node.js, Python (Flask/Django), Java (Spring), Go, Rust
- Databases (PostgreSQL, MySQL, MongoDB)
- API frameworks (Express, FastAPI, Axum)
- Message queues (RabbitMQ, Kafka, SQS)
- No frontend frameworks mentioned

**Requirements Keywords:**
- "API", "microservice", "REST", "GraphQL", "gRPC"
- "Database", "data pipeline", "ETL"
- "Integration", "webhook", "event-driven"
- "Batch processing", "background jobs"
- "Authentication service", "payment processing"

**Common Examples:**
- REST/GraphQL APIs
- Microservices
- Data processing pipelines
- Integration platforms
- Authentication services
- Payment gateways
- Background job processors

**When to select:**
✅ Frontend handled separately (mobile app, different team)
✅ Service-to-service communication
✅ API-first architecture
✅ No direct user interface needed

---

### Fullstack Projects

**Primary Indicators:**
- Both frontend and backend requirements present
- End-to-end user journeys described
- Needs coordinated frontend-backend development
- Single team responsible for full experience
- Requirements span UI, business logic, and data

**Technology Indicators:**
- Fullstack frameworks (Next.js, Remix, SvelteKit, Nuxt)
- Or separate frontend + backend stacks
- Database + UI frameworks both mentioned
- Monorepo tools (Turborepo, Nx, Lerna)
- API layer + UI layer technologies

**Requirements Keywords:**
- "Web application", "platform", "system"
- Both "user interface" AND "backend API"
- "End-to-end", "full-stack"
- "Database + frontend", "API + UI"
- "Authentication + dashboard"

**Common Examples:**
- SaaS applications
- E-commerce platforms (full build)
- Social networks
- Project management tools
- Internal business applications
- B2B platforms
- Content platforms (Medium, Substack style)

**When to select:**
✅ Building complete application from scratch
✅ Single team owns frontend and backend
✅ Tight integration between UI and API needed
✅ Requirements span full user experience
✅ No existing backend or frontend to integrate with

---

## Architecture Patterns by Type

### Frontend-Only Architecture Patterns

#### Pattern 1: Component-Based SPA

**Best for:** Interactive dashboards, admin panels, data visualization

**Architecture:**
```
┌─────────────────────────────────────┐
│       Client (Browser)              │
│  ┌───────────────────────────────┐  │
│  │   React/Vue/Angular/Svelte    │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  State Management       │  │  │
│  │  │  (Redux/Zustand/etc)    │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  Component Library      │  │  │
│  │  │  (MUI/Chakra/Custom)    │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  API Client             │  │  │
│  │  │  (Axios/Fetch/React Query)│  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
            ↓ HTTP/REST
┌─────────────────────────────────────┐
│       External API/Backend          │
└─────────────────────────────────────┘
```

**Key Decisions:**
- UI framework (React, Vue, Angular, Svelte)
- State management approach
- Component library or custom design system
- Build tool (Vite, Webpack, Turbopack)
- Routing strategy
- Data fetching pattern (React Query, SWR, Apollo)

---

#### Pattern 2: Static Site + CMS

**Best for:** Marketing sites, blogs, documentation, content-heavy sites

**Architecture:**
```
┌─────────────────────────────────────┐
│   Static Site Generator             │
│   (Next.js SSG, Astro, Gatsby)      │
│  ┌─────────────────────────────┐    │
│  │  Build Process              │    │
│  │  Fetch from CMS at build    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│        CDN (Vercel/Netlify)         │
│        Static HTML/JS/CSS           │
└─────────────────────────────────────┘
            ↑
┌─────────────────────────────────────┐
│   Headless CMS (Contentful/Sanity)  │
└─────────────────────────────────────┘
```

**Key Decisions:**
- Static generator (Next.js, Astro, Gatsby, Hugo)
- Headless CMS (Contentful, Sanity, Strapi)
- CDN/hosting (Vercel, Netlify, Cloudflare Pages)
- Build triggers (webhook on content change)

---

### Backend-Only Architecture Patterns

#### Pattern 1: REST API Service

**Best for:** Mobile apps, external integrations, frontend-backend separation

**Architecture:**
```
┌─────────────────────────────────────┐
│        API Gateway (optional)       │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│       REST API Server               │
│  ┌─────────────────────────────┐    │
│  │  Express/FastAPI/Spring     │    │
│  │  ┌────────────────────────┐ │    │
│  │  │ Controllers/Routes     │ │    │
│  │  └────────────────────────┘ │    │
│  │  ┌────────────────────────┐ │    │
│  │  │ Business Logic/Service │ │    │
│  │  └────────────────────────┘ │    │
│  │  ┌────────────────────────┐ │    │
│  │  │ Data Access Layer      │ │    │
│  │  └────────────────────────┘ │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│        Database                     │
│  (PostgreSQL/MySQL/MongoDB)         │
└─────────────────────────────────────┘
```

**Key Decisions:**
- API style (REST, OpenAPI spec)
- Framework (Express, FastAPI, Spring Boot, Gin)
- Database (PostgreSQL, MySQL, MongoDB)
- ORM/query builder (Prisma, TypeORM, SQLAlchemy)
- Authentication (JWT, OAuth, API keys)
- API documentation (OpenAPI/Swagger)

---

#### Pattern 2: Microservices

**Best for:** Large-scale systems, team independence, polyglot requirements

**Architecture:**
```
┌─────────────────────────────────────┐
│        API Gateway                  │
│    (Kong/Traefik/AWS API Gateway)   │
└─────────────────────────────────────┘
         ↓         ↓         ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Service A│ │ Service B│ │ Service C│
│ (Users)  │ │ (Orders) │ │ (Payment)│
│ Node.js  │ │ Python   │ │ Go       │
└──────────┘ └──────────┘ └──────────┘
     ↓            ↓            ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│ DB (Pg)  │ │ DB (Mongo)│ │ DB (Pg) │
└──────────┘ └──────────┘ └──────────┘
         ↓         ↓         ↓
┌─────────────────────────────────────┐
│    Message Bus (Kafka/RabbitMQ)     │
└─────────────────────────────────────┘
```

**Key Decisions:**
- Service boundaries (domain-driven design)
- API gateway (Kong, Traefik, custom)
- Service communication (REST, gRPC, message queue)
- Service discovery (Consul, etcd, K8s)
- Data consistency (eventual consistency, saga pattern)
- Deployment (Docker, Kubernetes)

---

#### Pattern 3: Event-Driven Architecture

**Best for:** Asynchronous processing, decoupled systems, high scalability

**Architecture:**
```
┌──────────┐         ┌──────────────┐
│ Producer │────────>│ Event Bus    │
│ Services │         │ (Kafka/SQS)  │
└──────────┘         └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
      ┌──────────┐    ┌──────────┐   ┌──────────┐
      │Consumer A│    │Consumer B│   │Consumer C│
      │(Process) │    │(Notify)  │   │(Archive) │
      └──────────┘    └──────────┘   └──────────┘
```

**Key Decisions:**
- Event bus (Kafka, RabbitMQ, AWS SQS/SNS, Redis Streams)
- Event schema (Avro, Protobuf, JSON)
- Retry strategies
- Dead letter queues
- Event sourcing vs. event notification

---

### Fullstack Architecture Patterns

#### Pattern 1: Monolithic Fullstack Framework

**Best for:** Startups, MVPs, small-medium teams, rapid development

**Architecture:**
```
┌─────────────────────────────────────┐
│     Next.js/Remix/SvelteKit         │
│  ┌─────────────────────────────┐    │
│  │  Frontend (React/Svelte)    │    │
│  │  ┌────────────────────┐     │    │
│  │  │ Pages/Routes       │     │    │
│  │  │ Components         │     │    │
│  │  └────────────────────┘     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  Backend (API Routes)       │    │
│  │  ┌────────────────────┐     │    │
│  │  │ API Handlers       │     │    │
│  │  │ Business Logic     │     │    │
│  │  └────────────────────┘     │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│        Database                     │
│  (PostgreSQL via Prisma/Drizzle)    │
└─────────────────────────────────────┘
```

**Key Decisions:**
- Framework (Next.js, Remix, SvelteKit, Nuxt)
- Database + ORM (PostgreSQL + Prisma)
- Authentication (NextAuth, Clerk, Auth0)
- API pattern (REST, tRPC, GraphQL)
- Deployment (Vercel, Netlify, self-hosted)
- Monorepo structure (single package or workspaces)

---

#### Pattern 2: Separated Frontend + Backend (Monorepo)

**Best for:** Medium-large teams, need for separation, polyglot requirements

**Architecture:**
```
┌─────────────────────────────────────┐
│         Monorepo                    │
│  ┌─────────────────────────────┐    │
│  │  Frontend Package           │    │
│  │  (React/Vue + Vite)         │    │
│  └─────────────────────────────┘    │
│            ↓ HTTP/REST              │
│  ┌─────────────────────────────┐    │
│  │  Backend Package            │    │
│  │  (Express/FastAPI)          │    │
│  │  ┌────────────────────┐     │    │
│  │  │ API Layer          │     │    │
│  │  │ Business Logic     │     │    │
│  │  │ Data Access        │     │    │
│  │  └────────────────────┘     │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │  Shared Package             │    │
│  │  (Types, Utils, Validation) │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│        Database                     │
└─────────────────────────────────────┘
```

**Key Decisions:**
- Monorepo tool (Turborepo, Nx, pnpm workspaces)
- Frontend framework (React, Vue, Svelte)
- Backend framework (Express, Fastify, Hono)
- Shared code (types, validation, utils)
- API communication (REST, tRPC, GraphQL)
- Separate deployments or unified

---

#### Pattern 3: BFF (Backend for Frontend)

**Best for:** Multiple client types, optimized per-client APIs

**Architecture:**
```
┌──────────┐    ┌──────────┐    ┌──────────┐
│Web Client│    │Mobile App│    │Admin UI  │
└──────────┘    └──────────┘    └──────────┘
     ↓               ↓               ↓
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Web BFF  │    │Mobile BFF│    │Admin BFF │
│(Next.js) │    │ (Go API) │    │(Next.js) │
└──────────┘    └──────────┘    └──────────┘
     ↓               ↓               ↓
┌─────────────────────────────────────────┐
│        Core Backend Services            │
│  (Microservices/Monolith)               │
└─────────────────────────────────────────┘
```

**Key Decisions:**
- BFF framework per client (Next.js, Express, Go)
- BFF responsibilities (aggregation, transformation, caching)
- Core backend architecture
- Authentication per BFF vs shared
- API contracts between BFFs and core services

---

## Decision Tree

### Detecting Project Type

```
Is there a UI requirement?
├─ NO → Backend-Only
│       └─ Is it an API?
│           ├─ YES, single service → REST API pattern
│           ├─ YES, multiple services → Microservices pattern
│           └─ Data processing → Event-driven pattern
│
└─ YES → Has UI
        └─ Is there backend/API requirement?
            ├─ NO (API exists) → Frontend-Only
            │   └─ Is it interactive?
            │       ├─ YES → Component-based SPA
            │       └─ NO (content) → Static site + CMS
            │
            └─ YES (need backend) → Fullstack
                └─ Team structure?
                    ├─ Single team → Monolithic fullstack
                    ├─ Separate teams → Separated (monorepo)
                    └─ Multiple clients → BFF pattern
```

---

## Examples by Type

### Frontend-Only Example

**Requirements:**
```
Build analytics dashboard showing real-time metrics from existing API.
Users can filter by date range, export to CSV.
Responsive design for desktop and tablet.
```

**Classification:** Frontend-Only
- UI dominant
- Consumes existing API (no backend creation)
- Focus on visualization and interactions

**Pattern:** Component-based SPA with React
- React + TypeScript
- Recharts for visualizations
- React Query for API fetching
- Zustand for client state
- Vite for build

---

### Backend-Only Example

**Requirements:**
```
Create REST API for mobile app. User authentication, profile management,
content feed. PostgreSQL database. JWT authentication. 10K users expected.
```

**Classification:** Backend-Only
- No UI mentioned (mobile app separate)
- API-focused
- Database and business logic

**Pattern:** REST API Service
- Node.js + Express
- PostgreSQL + Prisma
- JWT authentication
- OpenAPI documentation
- Docker deployment

---

### Fullstack Example

**Requirements:**
```
Build SaaS project management tool. Users can create projects, assign tasks,
collaborate in real-time. Email notifications. Payment integration (Stripe).
Responsive web app for desktop and mobile browsers.
```

**Classification:** Fullstack
- Both UI ("responsive web app") and backend ("payment", "email") needs
- End-to-end functionality
- Single cohesive system

**Pattern:** Monolithic Fullstack (Next.js)
- Next.js (React)
- PostgreSQL + Prisma
- NextAuth for authentication
- Stripe integration
- Resend for email
- Vercel deployment

---

## When to Deviate from Patterns

**Override Frontend-Only classification:**
- Requirements say "consume API" but API doesn't exist yet → Fullstack
- "Serverless functions needed" for auth → Fullstack (Next.js API routes)

**Override Backend-Only classification:**
- "Admin UI also needed" → Fullstack or separate frontend
- "Developer documentation site" → Add frontend for docs

**Override Fullstack classification:**
- "Mobile native app + web app" → Consider BFF pattern
- Team split by specialty → Consider separated monorepo

---

*Reference for create-architecture skill - Use these patterns to classify projects and select appropriate architecture*
