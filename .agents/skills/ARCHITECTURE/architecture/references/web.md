# Profile: Web (React / Node)

## Why This Structure Matters

**Problem:** Without tier separation, business logic bleeds into React components. Components make API calls directly, contain validation rules, and format data for display — all in one file. This makes them untestable, unreusable, and impossible to refactor without breaking the UI.

**Benefit:** Thin components that only handle presentation. Testable services that contain business rules. A data layer that can be swapped (REST to GraphQL, Prisma to Drizzle) without touching the UI.

**Cost of ignoring:** Migrating your data source means rewriting every component that fetches data. Testing business logic requires rendering React components. Duplicate validation appears in 3 places because there's no single service to own it.

---

## Detection

- `package.json` exists
- `.tsx`, `.jsx`, `.css`, or `.html` files present
- Dependencies include React, Express, Next.js, Apollo, Prisma, or similar
- May also have `tsconfig.json`, `vite.config.ts`, `next.config.js`

**Disambiguation:** If the project has `package.json` but is primarily a CLI tool (no UI files), apply general principles instead. If it has both frontend and backend, this profile covers both — the 3-tier model applies to each.

---

## Expected Structure

```
project-root/
  source/                              # All source code lives here
    01-presentation/                   # UI layer — what the user sees and interacts with
      components/                      #   Reusable UI components
        ComponentName/                 #     Co-located: component + test + styles + types
          ComponentName.tsx            #       Component implementation
          ComponentName.test.tsx       #       Unit tests
          ComponentName.css            #       Component-scoped styles
          ComponentName.types.ts       #       Props and local types (if complex)
          index.ts                     #       Clean public export
      pages/                           #   Route-level views (compose components)
      layouts/                         #   Shared page layouts (header, sidebar, footer)
      hooks/                           #   UI-specific hooks (useForm, useModal, useToast)
      styles/                          #   Global styles, design tokens, CSS variables
      assets/                          #   Static assets used by UI
        icons/                         #     SVG icons
        images/                        #     UI images (logos, illustrations)
        fonts/                         #     Custom fonts
    02-logic/                          #  Business logic layer — rules and orchestration
      services/                        #   Business operations (AuthService, OrderService)
      use-cases/                       #   Application workflows (CreateOrder, ResetPassword)
      domain/                          #   Domain models, types, enums
      api/                             #   API client adapters (REST, GraphQL)
      state/                           #   State management (stores, contexts, reducers)
      validators/                      #   Input validation rules
    03-data/                           # Data layer — persistence and external data
      repositories/                    #   Data access patterns (UserRepository, OrderRepository)
      models/                          #   Database schemas (Prisma models, TypeORM entities)
      migrations/                      #   Schema migrations
      seeds/                           #   Seed data for development
    config/                            # Cross-cutting configuration
      env.ts                           #   Environment variable parsing and validation
      constants.ts                     #   Application-wide constants
      routes.ts                        #   Route definitions
  tests/                               # Integration and E2E tests
    integration/                       #   Cross-module integration tests
    e2e/                               #   End-to-end tests (Playwright, Cypress)
    fixtures/                          #   Shared test data
    helpers/                           #   Shared test utilities
  public/                              # Static files served directly (favicon, manifest)
  Documentation/                       # Project docs (see Project Infrastructure below)
    project-roadmap.md                 #   Milestones, releases, progress tracking
    changelog.md                       #   Version history (Keep a Changelog format)
    decisions/                         #   Architecture Decision Records
    features/                          #   Feature specifications by program/module
      {program}/
        {module}/
          _{module}.md                 #     Module explainer (underscore sorts first)
          {feature-name}.md            #     Feature specification
```

**Key principles:**
- **All source code lives inside `source/`.** Config files at root, code behind one door. Tiers and cross-cutting config go in `source/`; tests, public, and docs stay at root.
- **01 → 02 → 03 dependency flow only.** Presentation depends on Logic, Logic depends on Data. Never reverse.
- **Components are thin.** They render UI and delegate to hooks/services. If a component has business logic, it belongs in `source/02-logic/`.
- **Co-location for components.** Each component's test, styles, and types live in its folder — not in a separate `__tests__/` tree.
- **Integration tests get their own folder.** Unit tests co-locate with source; integration and E2E tests live in `tests/`.
- **Config is cross-cutting.** Environment parsing, constants, and route definitions live in `source/config/`, not in any tier.

### Default Stack → Tier Placement

Typical stack choices and where their files land. Use this as a lookup when deciding tier placement.

| Technology | Tier | What goes where |
|-----------|------|----------------|
| **React** | `source/01-presentation/` | Components, pages, layouts, UI hooks (`useForm`, `useModal`) |
| **Vite** | Cross-cutting | `vite.config.ts` stays at project root |
| **Plain CSS** | `source/01-presentation/styles/` | Design tokens in `global.css`, component styles co-located |
| **GraphQL (Apollo Client)** | `source/02-logic/api/` | Queries, mutations, fragments, client config |
| **GraphQL (Apollo Server)** | `source/02-logic/` | Resolvers in `services/`, schema in `domain/` |
| **Express.js** | `source/02-logic/` | Route handlers, middleware, server setup |
| **React Context / state** | `source/02-logic/state/` | Contexts, reducers, stores — not in components |
| **Validation (Zod, Yup)** | `source/02-logic/validators/` | Input schemas, form validation rules |
| **Prisma** | `source/03-data/` | Schema in `models/`, migrations in `migrations/`, client in `repositories/` |
| **Postgres** | `source/03-data/` | All SQL access through Prisma repositories |
| **Redis** | `source/03-data/` | Cache adapters, session stores |
| **S3 (file storage)** | `source/03-data/` | Upload/download adapters |
| **Cognito / Auth** | `source/02-logic/services/` | Auth service wrapping the provider SDK |
| **Stripe** | `source/02-logic/services/` | Payment service; webhooks in `source/02-logic/api/` |
| **SES (email)** | `source/02-logic/services/` | Notification service wrapping the provider SDK |
| **Terraform / CDK** | Outside app | Separate `infrastructure/` directory, not in any tier |
| **GitHub Actions** | Outside app | `.github/workflows/` at project root |

**The key rule:** SDKs and provider clients go in `source/03-data/` (they're external data sources). Services that *use* those clients go in `source/02-logic/` (they contain business rules about *when* and *how* to call them). Components that *trigger* those services go in `source/01-presentation/` (they handle user interaction).

### Dependency Flow

```
01-presentation → 02-logic → 03-data    (valid)
03-data → 02-logic                       (blocked — data doesn't know about business rules)
02-logic → 01-presentation               (blocked — logic doesn't know about UI)
01-presentation → 03-data                (blocked — UI never touches persistence directly)
```

### Project Infrastructure

Cross-cutting folders that live alongside the tiers. These are not part of the dependency flow — any tier can reference them.

```
project-root/
  source/                          # 01-presentation/, 02-logic/, 03-data/, config/
  Documentation/                     # Project planning and feature specs
    project-roadmap.md               #   Living roadmap: milestones, releases, progress
    changelog.md                     #   Keep a Changelog format (Added, Changed, Fixed, Removed)
    decisions/                       #   Architecture Decision Records (ADR-NNN.md)
    features/                        #   Feature specs organized by program/module
      {program}/
        {module}/
          _{module}.md               #     Module explainer (what it does, why it matters)
          {feature-name}.md          #     Individual feature specification
  .claude/                           # AI tooling and automation
    commands/                        #   Slash commands for workflows
    validators/                      #   Automated standards enforcement
```

**Why Documentation lives at the root:** It is cross-cutting — it describes the project, not any single tier. Placing it inside a tier would imply ownership by that layer.

### Recommended Validators

Automated enforcement prevents drift. These validators run in pre-commit hooks or CI:

| Validator | What It Checks | Blocks On |
|-----------|---------------|-----------|
| `validate:arch` | Import direction follows 01 -> 02 -> 03 | Reverse or layer-skipping imports |
| `validate:tokens` | CSS values reference variables, not hardcoded | Hardcoded colors, spacing, typography |
| `validate:naming` | Files follow type-specific naming conventions | Mixed casing, non-semantic names |

Run all validators before feature completion: `npm run validate`

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `UserProfile.tsx`, `OrderSummary.tsx` |
| Component folders | PascalCase (match component) | `UserProfile/`, `OrderSummary/` |
| Services | PascalCase + "Service" | `AuthService.ts`, `OrderService.ts` |
| Repositories | PascalCase + "Repository" | `UserRepository.ts`, `OrderRepository.ts` |
| Hooks | camelCase + `use` prefix | `useAuth.ts`, `useForm.ts`, `useDebounce.ts` |
| Utils / helpers | camelCase, function-focused | `formatDate.ts`, `parseQueryString.ts` |
| Types / interfaces | PascalCase + context suffix | `UserProfile.types.ts`, `OrderStatus.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Styles | kebab-case | `user-profile.css`, `global-reset.css` |
| Tests (unit) | Source + `.test` | `AuthService.test.ts`, `UserProfile.test.tsx` |
| Tests (E2E) | Feature + `.spec` | `login.spec.ts`, `checkout.spec.ts` |
| Config files | kebab-case | `vite.config.ts`, `eslint.config.js` |
| Environment files | dotfile convention | `.env.example`, `.env.local`, `.env.test` |

---

## Red Flags

| Red Flag | Root Cause | Fix |
|----------|-----------|-----|
| API calls inside React components | Tier violation — UI doing data work | Extract to services in `source/02-logic/api/` or custom hooks |
| Business logic in components (validation, calculations, formatting) | No logic layer separation | Move to `source/02-logic/services/` or `source/02-logic/validators/` |
| Direct database access outside `source/03-data/` | Data layer bypass | All DB queries go through repositories in `source/03-data/` |
| `utils/helpers.ts` with 500+ lines of unrelated functions | Dumping ground — no domain ownership | Split by function: `formatDate.ts`, `parseUrl.ts`, `calculateTax.ts` |
| Components without co-located tests | Testing discipline gap | Add `ComponentName.test.tsx` in the same folder |
| Tests in a separate `__tests__/` tree mirroring source | Fragile — files get out of sync | Co-locate unit tests with source; keep only integration/E2E in `tests/` |
| Circular dependencies between services | Service boundaries unclear | Map dependency graph, extract shared logic to a new service |
| Global styles and component styles both defining the same thing | No single source for design tokens | Centralize tokens in `source/01-presentation/styles/`, reference from components |
| 50+ files in `components/` flat | No sub-grouping | Group by feature or domain: `components/auth/`, `components/orders/` |
| State management scattered (some in components, some in stores) | No clear state strategy | Centralize in `source/02-logic/state/`, components only read/dispatch |
| Inline styles or style objects in JSX | CSS/structure separation violated | Move to `.css` files or CSS modules |
| `.env` file committed to repo | Secrets exposed | Add `.env` to `.gitignore`, provide `.env.example` with placeholder values |

---

## When to Reconsider

| Symptom | Likely Problem | Action |
|---------|---------------|--------|
| Every feature change touches 5+ files across tiers | Over-layered for project size | Consider co-locating by feature instead of strict tier separation |
| `source/02-logic/services/` has 50+ services | Flat organization doesn't scale | Group by domain: `services/auth/`, `services/orders/`, `services/payments/` |
| Components exceed 300 lines | Logic leaked into presentation | Extract business logic to hooks or services in `source/02-logic/` |
| Adding a new page requires creating 8+ files | Boilerplate overhead | Review if all tiers are needed for simple pages; not every page needs a service |
| `source/01-presentation/hooks/` has 30+ hooks | Hooks doing too much | Move business-logic hooks to `source/02-logic/`, keep only UI hooks in presentation |
| Imports look like `../../../02-logic/services/` | Deep relative paths | Configure path aliases (`@logic/`, `@data/`, `@presentation/`) in tsconfig |
| State is passed through 5+ component levels | Prop drilling | Use context or state management in `source/02-logic/state/` |
