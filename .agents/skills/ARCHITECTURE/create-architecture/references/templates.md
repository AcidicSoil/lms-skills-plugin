# Architecture Document Templates

## Overview

This file provides templates for different project types and complexity levels.

---

## Template 1: Frontend-Only Architecture

**Use for:** React, Vue, Angular, Svelte applications

```markdown
# [Project Name] Frontend Architecture

## 1. System Overview

**Purpose:** [1-2 sentences describing the application]

**Target Users:** [Primary user personas]

**Key Features:** [3-5 main features]

---

## 2. Component Architecture

**Organization Strategy:** [Atomic Design | Feature-based | Domain-driven]

**Directory Structure:**
```
src/
├── components/         # Reusable UI components
│   ├── atoms/         # Basic building blocks
│   ├── molecules/     # Simple component groups
│   └── organisms/     # Complex components
├── features/          # Feature-based modules
├── pages/             # Route-level components
├── hooks/             # Custom React hooks
└── utils/             # Utility functions
```

**Component Design Principles:**
- [Single Responsibility]
- [Composition over Inheritance]
- [Props drilling depth limit: 2 levels]

---

## 3. State Management

**Strategy:** [Redux | Zustand | Context API | Recoil | Jotai]

**State Organization:**
- **Global State:** [Authentication, user profile, theme]
- **Feature State:** [Domain-specific state]
- **Server State:** [API data cached via React Query/SWR]
- **URL State:** [Search params, filters]

**State Flow:**
```
User Action → Dispatch → Store Update → Component Re-render
```

---

## 4. Routing

**Router:** [React Router | Next.js | TanStack Router]

**Route Structure:**
```
/                    → Home
/dashboard           → Dashboard
/dashboard/settings  → Settings
```

**Route Protection:**
- Protected routes require authentication
- Role-based access control for admin routes
- Redirect to login if unauthorized

---

## 5. Styling Approach

**Strategy:** [Tailwind CSS | Styled Components | CSS Modules | Emotion]

**Theme System:**
- Colors: [Primary, secondary, accent palette]
- Typography: [Font families, sizes, weights]
- Spacing: [4px base unit system]

**Responsive Breakpoints:**
- Mobile: <768px
- Tablet: 768px - 1024px
- Desktop: >1024px

---

## 6. Data Fetching

**Library:** [React Query | SWR | Apollo Client]

**Pattern:**
```typescript
// Example with React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

**Caching Strategy:**
- API responses cached for 5 minutes
- Background refetch on focus
- Optimistic updates for mutations

---

## 7. Build & Deployment

**Build Tool:** [Vite | Webpack | esbuild | Turbopack]

**Deployment Platform:** [Vercel | Netlify | Cloudflare Pages]

**Environment:**
- Development: Hot module replacement, source maps
- Production: Minification, code splitting, tree shaking

**Performance Optimizations:**
- Code splitting by route
- Lazy loading for heavy components
- Image optimization (next/image or similar)
- Bundle size target: <200KB initial

---

## 8. Technology Stack Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | [React 18] | [Large ecosystem, team expertise] |
| State | [Zustand] | [Lightweight, simple API] |
| Styling | [Tailwind] | [Rapid development, consistency] |
| Data Fetching | [React Query] | [Built-in caching, refetching] |
| Routing | [React Router v6] | [Standard, well-supported] |
| Build | [Vite] | [Fast dev experience, modern] |

---

## 9. Architecture Decision Records

### ADR-001: Component Organization Strategy

**Context:** Need to organize 50+ components

**Decision:** Feature-based organization with atomic design for shared components

**Rationale:** Balances reusability with feature cohesion

### ADR-002: State Management Selection

**Context:** Need state solution that scales but isn't overkill

**Decision:** Zustand for app state, React Query for server state

**Alternatives:**
- Redux: Too much boilerplate for our needs
- Context API: Doesn't scale well, re-render issues

**Rationale:** Zustand provides Redux benefits with less boilerplate

### ADR-003: Styling Approach

**Context:** Need consistent, fast UI development

**Decision:** Tailwind CSS with custom theme

**Alternatives:**
- CSS-in-JS: Runtime cost, bundle size
- CSS Modules: Requires more setup, less utility

**Rationale:** Tailwind enables rapid development with design system constraints

---

## 10. Security Considerations

- XSS Prevention: Sanitize all user inputs, use DOMPurify
- CSRF Protection: CSRF tokens for all mutations
- Authentication: JWT stored in httpOnly cookies
- Authorization: Role-based access control

---

## 11. Performance Targets

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Largest Contentful Paint: <2.5s
- Lighthouse Score: >90
```

---

## Template 2: Backend-Only Architecture

**Use for:** REST APIs, GraphQL servers, microservices

```markdown
# [Project Name] Backend Architecture

## 1. System Overview

**Purpose:** [API description]

**Clients:** [Web app, Mobile app, Third-party integrations]

---

## 2. API Design

**Style:** [REST | GraphQL | tRPC | gRPC]

**Versioning:** API version in URL path (/api/v1/...)

**Endpoints:**
```
POST   /api/v1/auth/signup      → Create user account
POST   /api/v1/auth/login       → Authenticate user
GET    /api/v1/users/:id        → Get user profile
PUT    /api/v1/users/:id        → Update user profile
```

**Request/Response Format:** JSON

**Error Handling:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": { "field": "email" }
  }
}
```

---

## 3. Service Layer Architecture

**Pattern:** [Layered | Clean Architecture | Hexagonal]

**Layers:**
```
controllers/     → HTTP request handling
services/        → Business logic
repositories/    → Data access
models/          → Data models/entities
```

**Dependency Flow:** Controllers → Services → Repositories

---

## 4. Data Architecture

**Database:** [PostgreSQL | MongoDB | MySQL]

**ORM:** [Prisma | TypeORM | Sequelize]

**Schema Design:**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
}
```

**Migrations:** Database migrations via ORM

**Connection Pool:** Max 20 connections

---

## 5. Authentication & Authorization

**Authentication:** JWT with refresh tokens

**Authorization:** Role-based access control (RBAC)

**Security:**
- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire in 15 minutes
- Refresh tokens expire in 7 days

---

## 6. Integration Architecture

**External Services:**
- Email: SendGrid API
- Payment: Stripe API
- Storage: AWS S3

**Integration Pattern:** Service adapters with retry logic

---

## 7. Caching Strategy

**Cache:** Redis

**Cached Data:**
- User sessions (TTL: 15 min)
- Frequently accessed data (TTL: 5 min)

---

## 8. Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Runtime | Node.js 20 | [Team expertise, ecosystem] |
| Framework | Express.js | [Mature, flexible] |
| Database | PostgreSQL | [ACID, relational data] |
| ORM | Prisma | [Type-safe, migrations] |
| Cache | Redis | [Fast, simple] |
| Auth | JWT | [Stateless, scalable] |

---

## 9. Architecture Decision Records

[Include 3-5 backend-specific ADRs]

---

## 10. Deployment

**Platform:** [AWS | GCP | Azure | Heroku]

**Infrastructure:**
- Application servers: 2x t3.medium (load balanced)
- Database: RDS PostgreSQL (Multi-AZ)
- Cache: ElastiCache Redis

**Monitoring:** CloudWatch logs and metrics
```

---

## Template 3: Fullstack Architecture

**Use for:** Next.js, Remix, SvelteKit, Nuxt applications

```markdown
# [Project Name] Fullstack Architecture

## 1. System Overview

[Combines frontend and backend sections]

---

## 2. Framework Architecture

**Framework:** [Next.js | Remix | SvelteKit | Nuxt]

**Rendering Strategy:**
- SSR: User-specific pages
- SSG: Marketing/static content
- ISR: Semi-dynamic content (revalidate every 60s)

---

## 3. API Architecture

**API Layer:** [Next.js API Routes | tRPC | GraphQL]

**Type Safety:** End-to-end type safety from DB to UI

**Example (tRPC):**
```typescript
// End-to-end type-safe API calls
const user = await trpc.user.getById.query({ id: '123' });
```

---

## 4. Authentication Flow

**Library:** [NextAuth.js | Clerk | Auth0]

**Providers:** Email/password, Google OAuth, GitHub OAuth

**Session Management:** Server-side sessions with httpOnly cookies

---

## 5. Database & ORM

[Similar to backend template]

---

## 6. Deployment

**Platform:** [Vercel | Netlify | AWS Amplify]

**Edge Functions:** [For auth, API routes]

**Static Assets:** Served via CDN

---

## 7. Monorepo Structure (if applicable)

**Tool:** [Turborepo | Nx]

```
apps/
├── web/          → Next.js app
├── mobile/       → React Native app (future)
packages/
├── ui/           → Shared UI components
├── db/           → Prisma schema
├── api/          → tRPC routers
└── config/       → Shared configs
```

---

## 8. Technology Stack

| Component | Technology | Justification |
|-----------|------------|---------------|
| Framework | Next.js 14 | [SSR, file-based routing, DX] |
| API | tRPC | [End-to-end type safety] |
| Database | PostgreSQL + Prisma | [Type-safe, migrations] |
| Auth | NextAuth.js | [Built-in providers, session] |
| Deployment | Vercel | [Optimized for Next.js] |
| Monorepo | Turborepo | [Fast, simple] |

---

## 9. Architecture Decision Records

[Include fullstack-specific ADRs: why Next.js, why tRPC, why monorepo, etc.]

---

## 10. End-to-End Type Safety

**Flow:**
```
Database Schema (Prisma)
  ↓
tRPC Routers (TypeScript)
  ↓
React Components (TypeScript)
```

**Benefit:** Compile-time errors for API changes

---

## 11. Performance Strategy

- Route-based code splitting
- Image optimization (next/image)
- Edge caching for static content
- Incremental Static Regeneration

---

## 12. Scalability Plan

- Horizontal scaling of serverless functions
- Database read replicas for read-heavy operations
- CDN for static assets globally
```

---

## Template 4: Simple Architecture (Complexity 0-30)

**Use for:** MVPs, prototypes, small applications

**Focus:**
- Sections 1, 3-7, 12 only
- Minimal ADRs (3-5)
- 10-15 pages total
- Standard patterns, no over-engineering

---

## Template 5: Complex Architecture (Complexity 61-100)

**Use for:** Enterprise systems, distributed systems, microservices

**Additional Sections:**
- Microservices boundaries and communication
- Event-driven architecture patterns
- CQRS and Event Sourcing (if applicable)
- Service mesh (Istio, Linkerd)
- Observability (distributed tracing, metrics, logs)
- Disaster recovery and business continuity
- Multi-region deployment
- Comprehensive ADRs (10-15)
- 25-40 pages total

---

## Quick Reference

**Minimum sections (all types):**
1. System Overview
2. Architecture (domain-specific)
3. Technology Stack
4. Security
5. ADRs (minimum 3)

**Add for medium complexity:**
6. Scalability Plan
7. Deployment Architecture
8. Performance Strategy

**Add for high complexity:**
9. Microservices/Distributed Design
10. Observability
11. Disaster Recovery
12. Migration Strategy (brownfield)
13. Comprehensive ADRs (10+)
