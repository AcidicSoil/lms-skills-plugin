# Architecture Decision Record Examples

Complete ADR examples for common architectural decisions across Frontend, Backend, and Fullstack domains.

---

## ADR Template

```markdown
# ADR-XXX: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Deciders:** [Names or roles]
**Replaces:** [ADR number if superseding] (optional)
**Superseded by:** [ADR number] (optional)

## Context

[What is the issue we're facing? What constraints exist?]

## Decision

[What we decided to do]

## Alternatives Considered

### Option 1: [Name]
**Pros:**
- Pro 1
- Pro 2

**Cons:**
- Con 1
- Con 2

### Option 2: [Name]
**Pros:**
- Pro 1

**Cons:**
- Con 1

[Continue for each alternative...]

## Rationale

[Why we chose this option over the alternatives]

## Consequences

**Positive:**
- Positive consequence 1
- Positive consequence 2

**Negative:**
- Negative consequence 1
- Mitigation strategy for negative consequence

**Neutral:**
- Neutral consequence 1

## Related Decisions

- ADR-XXX: [Related decision]
- ADR-YYY: [Related decision]

## Notes

[Additional context, links to discussions, benchmarks, etc.]
```

---

## Frontend ADR Examples

### ADR-001: Frontend Framework Selection

**Date:** 2025-01-15
**Status:** Accepted
**Deciders:** Tech Lead, Frontend Team

## Context

We need to select a frontend framework for our SaaS dashboard application. Requirements include:
- Real-time data updates from WebSocket server
- Complex form handling (multi-step wizards)
- Rich data visualization (charts, tables)
- Team has React experience (2/3 developers)
- Need to ship MVP in 3 months

Constraints:
- Limited budget for training
- Tight timeline
- Team prefers TypeScript

## Decision

We will use **React 18 with TypeScript** for the frontend framework.

## Alternatives Considered

### Option 1: React 18
**Pros:**
- Team has existing expertise (2/3 developers)
- Largest ecosystem for dashboard components
- Excellent TypeScript support
- Concurrent features for real-time updates
- Strong hiring market

**Cons:**
- Virtual DOM overhead (though minimal)
- Requires additional libraries for state management
- More boilerplate than newer frameworks

### Option 2: Svelte
**Pros:**
- Best-in-class performance (compiled)
- Less boilerplate, easier to learn
- Built-in reactivity
- Growing ecosystem

**Cons:**
- No team experience (learning curve)
- Smaller ecosystem for enterprise components
- Less mature tooling
- Risk to 3-month timeline

### Option 3: Vue 3
**Pros:**
- Good performance
- Built-in reactivity
- Gentle learning curve
- Solid ecosystem

**Cons:**
- No team experience
- Smaller ecosystem than React
- Less common in hiring market
- Learning curve delay

## Rationale

React was chosen primarily due to **team expertise and timeline constraints**. With 2/3 developers already proficient, we minimize onboarding time and reduce delivery risk. The 3-month MVP deadline makes learning a new framework too risky.

React's ecosystem provides production-ready dashboard components (React-Admin, Ant Design, Material-UI), reducing custom development. TypeScript support is excellent, meeting our type-safety requirement.

While Svelte offers better performance, the performance difference is negligible for a dashboard application with <1K concurrent users. Team productivity outweighs marginal performance gains.

## Consequences

**Positive:**
- Fast development velocity (team already productive)
- Rich component library ecosystem
- Easy to hire additional React developers
- Strong community support and resources

**Negative:**
- More boilerplate than Svelte (accept as tradeoff for familiarity)
- Requires state management library (Zustand or Redux)

**Mitigation:**
- Use Zustand (lightweight) instead of Redux for state management
- Establish code conventions to reduce boilerplate

**Neutral:**
- Will need to evaluate performance if user base grows >10K concurrent

## Related Decisions

- ADR-002: State Management Library (Zustand)
- ADR-003: Component Library (Ant Design)

## Notes

- Benchmarked React vs Svelte for our use case: <10ms difference in render time
- Team vote: 3/3 preferred React (1 open to learning Svelte long-term)
- Future: Consider Svelte for performance-critical features if needed

---

### ADR-002: State Management Approach

**Date:** 2025-01-16
**Status:** Accepted
**Deciders:** Tech Lead, Frontend Team

## Context

React application needs state management for:
- User authentication state
- Global UI state (theme, sidebar, modals)
- Server data caching (API responses)
- Form state (complex multi-step forms)

Current pain points:
- Prop drilling across 3+ component levels
- Redundant API calls
- Complex form handling

## Decision

Use **Zustand** for global client state and **React Query** for server state management.

## Alternatives Considered

### Option 1: Zustand + React Query
**Pros:**
- Lightweight (Zustand ~1KB)
- Simple API, easy to learn
- React Query handles server state excellently
- Separation of concerns (client vs server state)

**Cons:**
- Two libraries instead of one
- Zustand less known than Redux

### Option 2: Redux Toolkit
**Pros:**
- Industry standard
- DevTools for debugging
- Comprehensive ecosystem
- Team familiar with Redux

**Cons:**
- Heavy (45KB minified)
- More boilerplate
- Overkill for our app size
- Slower development

### Option 3: React Context + useState
**Pros:**
- No external dependencies
- Built into React
- Simple for small apps

**Cons:**
- Performance issues with frequent updates
- Prop drilling still needed
- No server state caching
- Not suitable for complex state

## Rationale

**Zustand** is chosen for client state (auth, UI) because it's lightweight, simple, and sufficient for our needs. We don't need Redux's complexity for an app with <10 global state slices.

**React Query** is chosen for server state because it handles caching, refetching, and synchronization excellently. Separating server state from client state reduces complexity.

This combination is lighter (React Query 12KB + Zustand 1KB = 13KB) than Redux Toolkit alone (45KB) and more maintainable.

## Consequences

**Positive:**
- Faster development (less boilerplate)
- Better performance (smaller bundle size)
- Excellent DX (React Query DevTools)
- Automatic cache invalidation and refetching

**Negative:**
- Two libraries to learn (accept tradeoff for simplicity)
- React Query has learning curve for advanced features

**Mitigation:**
- Document Zustand patterns in team guide
- Create React Query custom hooks for common patterns

**Neutral:**
- May switch to Redux later if state complexity grows significantly

## Related Decisions

- ADR-001: Frontend Framework (React)
- ADR-005: API Client Strategy

---

## Backend ADR Examples

### ADR-010: Database Selection

**Date:** 2025-01-20
**Status:** Accepted
**Deciders:** Tech Lead, Backend Team

## Context

Need to select database for SaaS project management application. Requirements:
- Store projects, tasks, users, teams, comments (relational data)
- ACID transactions required (billing, team management)
- Full-text search for tasks and comments
- Expected scale: 10K users at launch, 100K in 2 years
- Team has strong SQL experience, no NoSQL experience

Data model:
- Users belong to Teams
- Teams have Projects
- Projects have Tasks
- Tasks have Comments
- Complex joins and aggregations needed

## Decision

Use **PostgreSQL 15** as primary database.

## Alternatives Considered

### Option 1: PostgreSQL
**Pros:**
- Excellent relational model support
- ACID transactions
- Full-text search built-in
- JSON support for flexibility
- Proven at scale (Instagram, Notion)
- Team SQL expertise
- Rich extension ecosystem (PostGIS, pg_trgm)
- Free and open-source

**Cons:**
- Vertical scaling limits (can be mitigated with read replicas)
- More complex than NoSQL for simple documents

### Option 2: MongoDB
**Pros:**
- Flexible schema
- Horizontal scaling built-in
- Fast for simple queries
- Popular, large community

**Cons:**
- Weak support for complex relations (our primary use case)
- No team experience
- ACID only within single document (insufficient)
- Join performance poor for complex queries
- More expensive at scale

### Option 3: MySQL
**Pros:**
- Relational model
- ACID transactions
- Team SQL knowledge
- Widely used

**Cons:**
- Less feature-rich than PostgreSQL
- Weaker JSON support
- No built-in full-text search (requires setup)
- Less extensible

## Rationale

PostgreSQL is the clear winner for our relational data model and ACID requirements. The complex relationships (users → teams → projects → tasks → comments) are naturally expressed in SQL with joins.

Team SQL expertise makes PostgreSQL immediately productive. No learning curve compared to MongoDB.

PostgreSQL's full-text search eliminates need for separate search service (Elasticsearch) at current scale. JSON support provides flexibility for future schema changes without migrations.

Scale projection (100K users) is well within PostgreSQL's proven capabilities. Instagram uses PostgreSQL at 1B+ users.

## Consequences

**Positive:**
- Strong data consistency guarantees (ACID)
- Excellent support for complex queries
- Team productive immediately
- Full-text search without additional service
- Lower cost (no NoSQL Atlas)

**Negative:**
- Eventual vertical scaling limits (mitigated by read replicas)
- Migrations required for schema changes (acceptable tradeoff)

**Mitigation:**
- Use Prisma ORM for migration management
- Plan read replica strategy for scaling
- Monitor query performance early

**Neutral:**
- May need caching layer (Redis) at higher scale

## Related Decisions

- ADR-011: ORM Selection (Prisma)
- ADR-012: Caching Strategy (Redis)

## Notes

- Benchmarked PostgreSQL vs MongoDB for our query patterns: PostgreSQL 3x faster for joins
- Cost analysis: PostgreSQL RDS $200/month vs MongoDB Atlas $400/month (comparable scale)

---

### ADR-011: API Design Pattern

**Date:** 2025-01-22
**Status:** Accepted
**Deciders:** Tech Lead, Full-Stack Team

## Context

Need to define API pattern for communication between frontend and backend. Requirements:
- Mobile app + web app consuming same API
- TypeScript on both frontend and backend
- Complex nested data requirements (projects with tasks, users, comments)
- Real-time updates needed
- Team has REST experience

Complexity considerations:
- Over-fetching problem: Getting entire project when only need task count
- Under-fetching problem: Need multiple requests for nested data
- Type safety: Want compile-time safety for API contracts

## Decision

Use **tRPC** for type-safe API with **REST fallback for mobile app**.

## Alternatives Considered

### Option 1: REST
**Pros:**
- Universal standard
- Team has experience
- Works everywhere (web, mobile, third-party)
- Simple to understand
- Easy to cache (HTTP)

**Cons:**
- Over-fetching and under-fetching
- No type safety between client and server
- Manual API client coding
- Versioning complexity

### Option 2: GraphQL
**Pros:**
- Solves over/under-fetching
- Single endpoint
- Strong typing (schema)
- Great for complex data requirements

**Cons:**
- Learning curve for team
- Caching complexity
- N+1 query problem
- Heavy tooling (Apollo, etc.)
- Overkill for simple app

### Option 3: tRPC
**Pros:**
- Full TypeScript type safety (compile-time)
- Zero code generation
- Simple API (like RPC)
- Efficient (no over-fetching)
- Great DX (autocomplete)

**Cons:**
- TypeScript only (doesn't work for native mobile yet)
- Less universal than REST
- Smaller community
- Newer technology (risk)

## Rationale

**Hybrid approach**: tRPC for web app, REST for mobile app.

tRPC is ideal for TypeScript web app: Full type safety from client to server with zero boilerplate. Changing API shape immediately causes compile errors in frontend. This drastically reduces bugs.

REST fallback for mobile app: Native mobile (Swift/Kotlin) can't use tRPC. Provide REST endpoints for mobile. Since both web and mobile need same data, tRPC and REST share business logic.

This hybrid approach maximizes type safety for web (80% of users) while supporting mobile (20% of users).

## Consequences

**Positive:**
- Compile-time API contract enforcement (web)
- Excellent DX (autocomplete, refactoring)
- Reduced bugs (type safety)
- No code generation needed
- Fast development

**Negative:**
- Maintain two API patterns (tRPC + REST)
- Mobile app doesn't get type safety
- tRPC is newer (less proven)

**Mitigation:**
- Share business logic between tRPC and REST routes
- Generate OpenAPI spec from tRPC for REST endpoints
- Document both APIs

**Neutral:**
- Monitor tRPC ecosystem growth
- May consolidate to single pattern if tRPC supports mobile SDK

## Related Decisions

- ADR-001: Frontend Framework (React)
- ADR-010: Database (PostgreSQL)
- ADR-013: Mobile Strategy

---

## Fullstack ADR Examples

### ADR-020: Fullstack Framework Selection

**Date:** 2025-01-25
**Status:** Accepted
**Deciders:** Tech Lead, Full Team

## Context

Building SaaS application from scratch. Need to select fullstack framework. Requirements:
- Server-side rendering for SEO
- API routes for backend logic
- Authentication system
- Database integration (PostgreSQL)
- Fast development (3-month MVP)
- Team: 3 fullstack developers, React experience

Technology preferences:
- TypeScript
- Modern stack
- Good deployment options

## Decision

Use **Next.js 14 (App Router)** as fullstack framework.

## Alternatives Considered

### Option 1: Next.js 14
**Pros:**
- React Server Components (performance)
- Built-in API routes
- Excellent TypeScript support
- Server-side rendering + static generation
- File-based routing
- Vercel deployment (one-click)
- Large ecosystem
- Team knows React

**Cons:**
- App Router is newer (less mature)
- Learning curve for RSC
- Vercel lock-in risk

### Option 2: Remix
**Pros:**
- Excellent data loading patterns
- Built-in forms
- Progressive enhancement
- Good performance
- Growing community

**Cons:**
- Smaller ecosystem than Next.js
- Less tooling
- Team doesn't know Remix
- Deployment more complex

### Option 3: SvelteKit
**Pros:**
- Excellent performance
- Simple mental model
- Less boilerplate
- Good SSR support

**Cons:**
- Team doesn't know Svelte
- Smaller ecosystem
- Less mature
- Learning curve delay

## Rationale

Next.js chosen for **team React expertise** and **comprehensive feature set**. With 3-month MVP timeline, leveraging existing React knowledge is critical.

Next.js App Router provides SSR, API routes, and database integration in single framework. No need to configure separate frontend and backend.

Vercel deployment is trivial (git push to deploy). Focus on features, not DevOps.

React Server Components provide performance without complexity. Mix server and client components as needed.

## Consequences

**Positive:**
- Fast development (leverage React knowledge)
- Zero DevOps setup (Vercel)
- Built-in API routes (no separate backend)
- Excellent performance (RSC)
- SEO support out of the box

**Negative:**
- App Router learning curve (2-3 days)
- Vercel lock-in (can self-host but more complex)
- Bleeding edge (RSC relatively new)

**Mitigation:**
- Budget 3 days for App Router learning
- Use Next.js standalone mode for self-host option
- Join Next.js Discord for community support

**Neutral:**
- May evaluate Remix if Next.js becomes limiting

## Related Decisions

- ADR-021: Authentication (NextAuth.js)
- ADR-022: Database ORM (Prisma)
- ADR-023: Deployment Platform (Vercel)

---

### ADR-021: Authentication Strategy

**Date:** 2025-01-26
**Status:** Accepted
**Deciders:** Tech Lead

## Context

Need authentication for Next.js application. Requirements:
- Email/password authentication
- OAuth (Google, GitHub)
- Session management
- Protect API routes
- Protect pages (redirects)
- Team wants simple setup

Options:
- Build custom auth (full control)
- Use auth library (NextAuth, Clerk, Auth0)
- Hybrid (library + custom)

## Decision

Use **NextAuth.js v5** with **Prisma adapter** for authentication.

## Alternatives Considered

### Option 1: NextAuth.js v5
**Pros:**
- Free and open-source
- Excellent Next.js integration
- Supports OAuth + credentials
- Prisma adapter for database
- Flexible, customizable
- Active development

**Cons:**
- Requires setup
- Documentation can be confusing
- Session management complexity

### Option 2: Clerk
**Pros:**
- Hosted solution (less work)
- Beautiful pre-built UI
- Email verification built-in
- Great DX
- Webhooks for user events

**Cons:**
- Costs $25/month for 1000 MAU
- Vendor lock-in
- Less customizable
- External dependency

### Option 3: Auth0
**Pros:**
- Enterprise-grade
- Extensive features
- Good documentation
- Compliance-ready

**Cons:**
- Expensive ($150/month)
- Overkill for MVP
- Complex setup
- External dependency

### Option 4: Custom Auth
**Pros:**
- Full control
- No dependencies
- No cost

**Cons:**
- Security risk (easy to mess up)
- Time-consuming
- Maintenance burden
- Reinventing wheel

## Rationale

NextAuth.js chosen as **best balance of cost, control, and simplicity**. It's free, well-integrated with Next.js, and handles OAuth + credentials out of the box.

Clerk is tempting for DX but $300/year for 1K users is unnecessary for MVP. Save money, invest time.

Custom auth is too risky. Authentication is security-critical. Use battle-tested library.

## Consequences

**Positive:**
- Zero authentication cost
- OAuth providers work out of box
- Prisma adapter stores sessions in our database
- Flexible for future requirements

**Negative:**
- More complex setup than Clerk
- Must handle email verification ourselves
- Session management requires understanding

**Mitigation:**
- Follow NextAuth.js App Router guide
- Use Resend for email verification
- Budget 2 days for auth setup

**Neutral:**
- May migrate to Clerk later if need managed solution

## Related Decisions

- ADR-020: Fullstack Framework (Next.js)
- ADR-022: Database ORM (Prisma)
- ADR-024: Email Service (Resend)

---

## Additional ADR Examples

### ADR-030: Deployment Platform

**Date:** 2025-01-28
**Status:** Accepted

## Decision

Use **Vercel** for deployment (web app) and **Railway** for PostgreSQL.

## Rationale

Vercel provides zero-config Next.js deployment with git integration. Railway offers managed PostgreSQL cheaper than AWS RDS.

Combined cost: $20/month (Railway DB) vs $200/month (AWS RDS + EC2).

---

### ADR-031: Caching Strategy

**Date:** 2025-02-01
**Status:** Accepted

## Decision

Use **Upstash Redis** for caching and **Next.js built-in cache** for static content.

## Rationale

Upstash Redis is serverless (pay-per-request), perfect for variable traffic. Next.js cache handles static pages automatically.

---

*Reference for create-architecture skill - Use these examples as templates for documenting architectural decisions*
