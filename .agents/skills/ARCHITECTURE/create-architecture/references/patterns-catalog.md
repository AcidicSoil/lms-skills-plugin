# Architectural Patterns Catalog

## Overview

Proven architectural patterns organized by domain (Frontend, Backend, Fullstack) and complexity level.

---

## Frontend Patterns

### Component Architecture Patterns

#### Pattern 1: Atomic Design
**When to use:** Large component libraries (50+ components)
**Complexity:** Medium-High

**Structure:**
- **Atoms:** Basic elements (Button, Input, Label)
- **Molecules:** Simple combinations (SearchBar = Input + Button)
- **Organisms:** Complex components (Header, ProductCard)
- **Templates:** Page layouts
- **Pages:** Actual pages

**Pros:** Systematic reusability, clear hierarchy
**Cons:** Can be over-engineered for small apps

---

#### Pattern 2: Feature-Based Organization
**When to use:** Domain-heavy applications
**Complexity:** Low-Medium

**Structure:**
```
features/
├── auth/
│   ├── components/
│   ├── hooks/
│   └── api/
├── dashboard/
└── settings/
```

**Pros:** Feature cohesion, easier navigation
**Cons:** Shared components can be unclear

---

### State Management Patterns

#### Pattern 1: Global + Server State Split
**When to use:** Most modern applications
**Complexity:** Low

**Implementation:**
- **Global State:** Zustand/Redux for app state (theme, auth)
- **Server State:** React Query/SWR for API data
- **Local State:** useState for component-only state
- **URL State:** Search params for shareable state

**Pros:** Clear separation of concerns
**Cons:** Multiple state sources to manage

---

#### Pattern 2: Redux Toolkit Pattern
**When to use:** Complex state with many interactions
**Complexity:** Medium

**Features:**
- Slices for feature-based state
- RTK Query for API calls
- DevTools for debugging

**Pros:** Powerful, mature ecosystem
**Cons:** More boilerplate than alternatives

---

### Routing Patterns

#### Pattern 1: File-Based Routing
**When to use:** Next.js, Remix, SvelteKit
**Complexity:** Low

**Structure:**
```
app/
├── page.tsx           → /
├── dashboard/
│   └── page.tsx       → /dashboard
└── settings/
    └── page.tsx       → /settings
```

**Pros:** Convention over configuration, automatic code splitting
**Cons:** Less flexibility than declarative

---

#### Pattern 2: Declarative Routing
**When to use:** React Router, TanStack Router
**Complexity:** Low-Medium

**Example:**
```typescript
const routes = [
  { path: '/', element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
];
```

**Pros:** Explicit, centralized
**Cons:** Manual code splitting

---

## Backend Patterns

### API Design Patterns

#### Pattern 1: RESTful API
**When to use:** Public APIs, simple CRUD
**Complexity:** Low

**Characteristics:**
- Resource-based URLs (/users, /posts)
- HTTP methods (GET, POST, PUT, DELETE)
- Stateless requests
- Standard status codes

**Pros:** Universal, cacheable, well-understood
**Cons:** Over-fetching, under-fetching, multiple requests

---

#### Pattern 2: GraphQL
**When to use:** Complex data requirements, mobile apps
**Complexity:** Medium

**Characteristics:**
- Single endpoint
- Client specifies exact data needed
- Strong typing
- Subscriptions for real-time

**Pros:** No over/under-fetching, strong typing
**Cons:** Complexity, caching challenges, N+1 problem

---

#### Pattern 3: tRPC
**When to use:** Fullstack TypeScript applications
**Complexity:** Low-Medium

**Characteristics:**
- End-to-end type safety
- RPC-style calls
- No code generation
- Works with React Query

**Pros:** Type safety, simple, fast DX
**Cons:** TypeScript only, not public API friendly

---

### Service Architecture Patterns

#### Pattern 1: Monolith
**When to use:** Small-medium teams, early stage
**Complexity:** Low

**Characteristics:**
- Single codebase
- Single deployment
- Shared database

**Pros:** Simple, fast development, easy debugging
**Cons:** Scaling limitations, deployment risk

---

#### Pattern 2: Modular Monolith
**When to use:** Medium teams, preparing for microservices
**Complexity:** Medium

**Characteristics:**
- Single deployment
- Clear module boundaries
- Shared database with schemas per module

**Pros:** Monolith simplicity + microservices structure
**Cons:** Requires discipline to maintain boundaries

---

#### Pattern 3: Microservices
**When to use:** Large teams, high scale
**Complexity:** High

**Characteristics:**
- Independent services
- Separate databases
- API-based communication
- Independent deployment

**Pros:** Independent scaling, technology flexibility
**Cons:** Complexity, distributed system challenges

---

### Data Architecture Patterns

#### Pattern 1: Repository Pattern
**When to use:** Most applications
**Complexity:** Low

**Structure:**
```typescript
class UserRepository {
  findById(id: string): Promise<User>;
  create(data: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
}
```

**Pros:** Testable, swappable data sources
**Cons:** Extra abstraction layer

---

#### Pattern 2: Active Record
**When to use:** Simple CRUD applications
**Complexity:** Low

**Example:** Model contains both data and behavior
```typescript
const user = new User({ email: 'test@example.com' });
await user.save();
```

**Pros:** Simple, intuitive
**Cons:** Tight coupling to database

---

## Fullstack Patterns

### Pattern 1: Meta-Framework (Next.js, Remix, SvelteKit)
**When to use:** Most fullstack applications
**Complexity:** Low-Medium

**Characteristics:**
- File-based routing
- Server-side rendering
- API routes
- Built-in optimizations

**Pros:** Integrated experience, performance
**Cons:** Framework lock-in

---

### Pattern 2: Separate Frontend + Backend
**When to use:** Mobile app + web, public APIs
**Complexity:** Medium

**Characteristics:**
- Independent frontend and backend
- REST or GraphQL API
- Separate deployment

**Pros:** Flexibility, reusable API
**Cons:** More complexity, CORS

---

### Pattern 3: Monorepo
**When to use:** Multiple related applications
**Complexity:** Medium

**Tools:** Turborepo, Nx, pnpm workspaces

**Structure:**
```
apps/
├── web/
├── mobile/
packages/
├── ui/
├── api/
└── db/
```

**Pros:** Code sharing, atomic commits
**Cons:** Build complexity, tooling setup

---

## Integration Patterns

### Pattern 1: Event-Driven
**When to use:** Asynchronous workflows
**Complexity:** Medium-High

**Components:**
- Message queue (RabbitMQ, Redis, SQS)
- Event publishers
- Event subscribers

**Pros:** Decoupling, scalability
**Cons:** Eventual consistency, debugging

---

### Pattern 2: Webhook Pattern
**When to use:** Third-party integrations
**Complexity:** Low-Medium

**Flow:**
1. Register webhook URL
2. Third-party sends HTTP POST on events
3. Process event asynchronously

**Pros:** Real-time updates, simple
**Cons:** Reliability (retries needed), security

---

## Caching Patterns

### Pattern 1: Application-Level Caching
**When to use:** Most applications
**Complexity:** Low

**Implementation:**
- Redis for session data
- Cache frequently accessed data (5-min TTL)
- Cache invalidation on updates

**Pros:** Performance, reduced DB load
**Cons:** Cache invalidation complexity

---

### Pattern 2: CDN Caching
**When to use:** Static assets, global users
**Complexity:** Low

**Cached:**
- Images, CSS, JavaScript
- Static HTML pages
- API responses (with headers)

**Pros:** Fast, global distribution
**Cons:** Cache invalidation, cost

---

## Security Patterns

### Pattern 1: JWT Authentication
**When to use:** Stateless APIs
**Complexity:** Low

**Flow:**
1. User logs in with credentials
2. Server issues JWT
3. Client includes JWT in requests
4. Server validates JWT

**Pros:** Stateless, scalable
**Cons:** Token revocation challenges

---

### Pattern 2: Session-Based Authentication
**When to use:** Server-rendered apps
**Complexity:** Low

**Flow:**
1. User logs in
2. Server creates session, stores in Redis
3. Client receives session cookie
4. Server validates session on requests

**Pros:** Easy revocation, secure
**Cons:** Requires session storage

---

## Deployment Patterns

### Pattern 1: Serverless
**When to use:** Variable traffic, low-ops
**Complexity:** Low-Medium

**Platforms:** Vercel, Netlify, AWS Lambda

**Pros:** Auto-scaling, pay-per-use
**Cons:** Cold starts, vendor lock-in

---

### Pattern 2: Container-Based (Docker + K8s)
**When to use:** Complex deployments, multi-cloud
**Complexity:** High

**Components:**
- Docker for containerization
- Kubernetes for orchestration

**Pros:** Portability, control
**Cons:** Operational complexity

---

## Pattern Selection Framework

**Questions to ask:**
1. What is the project complexity? (Simple/Medium/Complex)
2. What is the team size and expertise?
3. What are the scalability requirements?
4. What is the timeline/budget?
5. Is this greenfield or brownfield?

**Simple Project (Complexity 0-30):**
- Monolith architecture
- Standard patterns (REST API, file-based routing)
- Minimal infrastructure

**Medium Project (Complexity 31-60):**
- Modular monolith or microservices
- Modern patterns (GraphQL/tRPC, meta-frameworks)
- Moderate infrastructure (caching, CDN)

**Complex Project (Complexity 61-100):**
- Microservices or distributed
- Advanced patterns (event-driven, CQRS)
- Full infrastructure (K8s, observability)

---

## Anti-Patterns to Avoid

1. **Premature Microservices:** Don't start with microservices for small teams
2. **Over-Engineering:** Don't use complex patterns for simple problems
3. **Technology Chasing:** Don't choose tech because it's trendy
4. **Tight Coupling:** Don't tightly couple components
5. **Ignoring NFRs:** Don't defer performance/security decisions

---

## Quick Reference

**Frontend:**
- Component: Atomic Design (large) or Feature-Based (medium)
- State: Global + Server split (Zustand + React Query)
- Routing: File-based (Next.js) or Declarative (React Router)

**Backend:**
- API: REST (simple), GraphQL (complex data), tRPC (fullstack TS)
- Architecture: Monolith (start) → Modular Monolith → Microservices
- Data: Repository pattern

**Fullstack:**
- Framework: Next.js (React), Remix (React), SvelteKit (Svelte)
- Monorepo: Turborepo (simple) or Nx (complex)
