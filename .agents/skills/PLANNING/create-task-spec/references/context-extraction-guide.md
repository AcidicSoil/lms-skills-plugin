# Context Extraction Guide

## Purpose

Load architecture documentation, extract technical context, and embed it in task specifications with source references.

---

## Step 2: Load Architecture Context

### Files to Load

**1. Always-Required Files (Coding Standards)**

Execute:
```bash
python .claude/skills/bmad-commands/scripts/read_file.py \
  --path {always_load_file} \
  --output json
```

**Extract from coding standards:**
- Language and framework versions
- File naming conventions
- Code formatting rules
- Import/export patterns
- Error handling patterns
- Logging standards

**Example:**
```
[Source: docs/coding-standards.md#naming]
- Files: camelCase for services (auth.service.ts)
- Classes: PascalCase (UserController)
- Functions: camelCase (validateEmail)
- Constants: UPPER_SNAKE_CASE (MAX_LOGIN_ATTEMPTS)
```

---

**2. Architecture Documentation**

Execute:
```bash
python .claude/skills/bmad-commands/scripts/read_file.py \
  --path {architecture_doc} \
  --output json
```

**Extract architecture details:**
- System design patterns
- Module structure
- Data flow
- Integration points
- Technology choices
- Design decisions

**Example:**
```
[Source: docs/architecture/system-design.md#auth-flow]
Authentication Flow:
1. User submits credentials → Auth Controller
2. Controller validates → Auth Service
3. Service checks DB → User Repository
4. Hash comparison → bcrypt (cost 12)
5. JWT generation → Token Service (expires 24h)
6. Return token → Client
```

---

**3. Standards Documentation**

Execute:
```bash
python .claude/skills/bmad-commands/scripts/read_file.py \
  --path {standards_doc} \
  --output json
```

**Extract standards:**
- Security requirements
- Performance targets
- Testing requirements
- Accessibility standards
- Compliance requirements

**Example:**
```
[Source: docs/standards.md#security]
Security Requirements:
- Passwords: bcrypt, cost 12, min 8 chars
- Input validation: All user inputs via Zod schemas
- SQL injection: Use parameterized queries only
- XSS prevention: Sanitize all HTML output
- Rate limiting: 5 requests/minute per IP for auth endpoints
```

---

**4. Previous Task Insights**

Execute:
```bash
python .claude/skills/bmad-commands/scripts/read_file.py \
  --path {previous_task_file} \
  --output json
```

**Extract from completion notes:**
- Patterns established
- Lessons learned
- Implementation decisions
- Useful utilities created
- Performance characteristics
- Edge cases discovered

**Example:**
```
[Source: task-003-user-login.md#completion-notes]
Established Patterns:
- Auth middleware: JWT validation in src/middleware/auth.ts
- Error responses: Consistent format with statusCode, error, message
- Test mocking: Email service mock pattern in __mocks__/email.ts
- Validation: Zod schemas in src/schemas/ directory

Lessons Learned:
- bcrypt cost 12 adds ~150ms per hash (acceptable for auth)
- Rate limiting essential for auth endpoints (5 req/min sufficient)
- Email verification flow reusable for other notification types
```

---

### Context Organization

**For ALL Tasks:**

Tech Stack:
```
[Source: package.json, docs/tech-stack.md]
- Backend: Node.js 20.x, Express 4.x, TypeScript 5.x
- Database: PostgreSQL 15.x with TypeORM 0.3.x
- Testing: Jest 29.x, Supertest for integration
- Validation: Zod 3.x
```

Project Structure:
```
[Source: docs/project-structure.md]
src/
├── types/          # TypeScript interfaces
├── schemas/        # Zod validation schemas
├── services/       # Business logic
├── routes/         # API endpoints
├── middleware/     # Express middleware
├── repositories/   # Database access
└── __tests__/      # Test files
```

Coding Standards:
```
[Source: docs/coding-standards.md]
- All services return Result<T, Error> type
- All API endpoints use async/await
- All database queries use transactions for multi-step operations
- All user inputs validated via Zod schemas
- Test coverage target: ≥80% for all files
```

Testing Strategy:
```
[Source: docs/standards.md#testing]
- Unit tests: All services and utilities
- Integration tests: All API endpoints
- E2E tests: Critical user flows
- Coverage: ≥80% statements, ≥75% branches
- Frameworks: Jest for unit/integration, Playwright for E2E
```

---

**For Backend/API Tasks:**

Data Models:
```
[Source: docs/architecture/data-models.md#user]
User Model:
interface User {
  id: string;           // UUID v4
  email: string;        // Unique, lowercase, RFC 5322 format
  password: string;     // bcrypt hash, never returned in API
  firstName: string;    // Optional
  lastName: string;     // Optional
  createdAt: Date;
  updatedAt: Date;
}

Database Schema:
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

API Specifications:
```
[Source: docs/architecture/rest-api-spec.md#auth]
POST /api/auth/signup
Request:
  Content-Type: application/json
  Body: {
    email: string,      // RFC 5322 format
    password: string    // Min 8 chars, complexity required
  }

Response (201 Created):
  Content-Type: application/json
  Body: {
    user: {
      id: string,
      email: string,
      createdAt: string
    },
    token: string       // JWT, expires in 24h
  }

Errors:
  400: Invalid input (validation failed)
  409: Email already exists
  500: Internal server error
```

External Services:
```
[Source: docs/architecture/integrations.md#email]
Email Service: SendGrid API
- API Key: Environment variable SENDGRID_API_KEY
- From Address: noreply@example.com
- Templates: Stored in src/templates/email/
- Retry: 3 attempts with exponential backoff
- Fallback: Log email to console if service unavailable
```

---

**For Frontend/UI Tasks:**

Component Specifications:
```
[Source: docs/architecture/ui-components.md#signup-form]
SignupForm Component:
- Location: src/components/auth/SignupForm.tsx
- Props: {
    onSuccess: (user: User) => void,
    onError: (error: Error) => void
  }
- State: email, password, isSubmitting, errors
- Validation: Real-time with Zod schema
- Styling: Tailwind CSS, follows design system
- Accessibility: WCAG 2.1 AA compliant
```

State Management:
```
[Source: docs/architecture/state-management.md]
- Global State: Zustand for auth state
- Component State: React useState/useReducer
- Server State: TanStack Query (React Query)
- Form State: React Hook Form with Zod resolver
```

Routing:
```
[Source: docs/architecture/routing.md]
- Library: React Router v6
- Auth Routes: /auth/login, /auth/signup, /auth/reset-password
- Protected Routes: Wrap with <ProtectedRoute> component
- Redirects: Unauthenticated users → /auth/login
```

---

## Step 3: Analyze Relevant Components

### Component Identification

**Questions to Answer:**
1. **What data models are involved?**
   - Which entities?
   - What relationships?
   - What validation rules?

2. **What API endpoints are affected?**
   - New endpoints to create?
   - Existing endpoints to modify?
   - What HTTP methods?

3. **What UI components are needed?**
   - New components?
   - Existing components to modify?
   - What user interactions?

4. **What external services are used?**
   - Email service?
   - Payment gateway?
   - Third-party APIs?

---

### Extract Technical Details

**Data Models:**

Format:
```markdown
### Data Models
[Source: docs/architecture/data-models.md#user]

**User Interface:**
\`\`\`typescript
interface User {
  id: string;           // UUID v4
  email: string;        // Unique, RFC 5322, lowercase
  password: string;     // bcrypt hash, cost 12
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

**Validation Schema:**
\`\`\`typescript
const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
});
\`\`\`

**Database Migration:**
File: migrations/XXX_create_users.sql
- UUID primary key
- Unique constraint on email
- Indexed: email (for lookups)
```

---

**API Specifications:**

Format:
```markdown
### API Specifications
[Source: docs/architecture/rest-api-spec.md#auth]

**Endpoint:** POST /api/auth/signup
**Location:** src/routes/auth/signup.ts
**Controller:** src/controllers/auth.controller.ts

**Request:**
\`\`\`typescript
{
  email: string,      // RFC 5322 format
  password: string    // Min 8 chars, complexity required
}
\`\`\`

**Response (201 Created):**
\`\`\`typescript
{
  user: {
    id: string,
    email: string,
    createdAt: string
  },
  token: string       // JWT, expires in 24h
}
\`\`\`

**Authentication:** None required
**Rate Limiting:** 5 requests/minute per IP
**Validation:** Zod schema middleware
```

---

**File Locations:**

Format:
```markdown
### File Locations
[Source: docs/project-structure.md, previous task-003]

**New Files:**
- src/types/user.ts (User interface)
- src/schemas/user.schema.ts (Zod validation)
- src/services/auth/signup.service.ts (Business logic)
- src/routes/auth/signup.ts (API route)
- src/controllers/auth.controller.ts#signup (Controller method)
- migrations/XXX_create_users.sql (Database)
- src/__tests__/services/auth/signup.service.test.ts (Unit tests)
- src/__tests__/routes/auth/signup.integration.test.ts (Integration tests)

**Modified Files:**
- src/routes/auth/index.ts (Add signup route export)
```

---

**Constraints and Requirements:**

Format:
```markdown
### Technical Constraints
[Source: docs/standards.md]

**Performance:**
- API response time: <200ms (p95)
- Password hashing: ~150ms (bcrypt cost 12)
- Database queries: Use indexes, <50ms

**Security:**
- Input validation: All requests via Zod schemas
- Password hashing: bcrypt, cost 12, never log passwords
- SQL injection: Parameterized queries only (TypeORM)
- Rate limiting: 5 requests/minute per IP for auth endpoints
- HTTPS only: Enforce in production

**Reliability:**
- Database transactions: Multi-step operations atomic
- Email service: 3 retry attempts, fallback to logging
- Error handling: Never expose stack traces to client
- Logging: All auth attempts (success/failure) with user context

**Testing:**
- Unit tests: All services (≥80% coverage)
- Integration tests: All API endpoints
- E2E tests: Critical signup flow
- Mock external services: Email service mocked in tests
```

---

## Critical Rules

**1. ONLY Extract Information Present**

❌ **Don't invent:**
```
"Users table should have username field"
(Not in architecture docs)
```

✅ **Do extract:**
```
[Source: docs/architecture/data-models.md#user]
User Model: id, email, password, createdAt, updatedAt
(No username field mentioned)
```

---

**2. ALWAYS Cite Source**

❌ **No source:**
```
Password must be hashed with bcrypt
```

✅ **With source:**
```
Password must be hashed with bcrypt, cost 12
[Source: docs/standards.md#security]
```

---

**3. Note Missing Information**

If critical info is missing:
```markdown
**Email Validation Strategy:**
No specific email validation guidance found in architecture docs.

**Recommendation:**
- Use RFC 5322 email format validation
- Lowercase emails before storage
- Verify email doesn't exist before creation

**Confirm with User:** Approve email validation approach?
```

---

## Halt Conditions

**1. Architecture Documents Not Found**

```markdown
⚠️ ARCHITECTURE DOCUMENTS NOT FOUND

Cannot extract technical context.

**Missing Files:**
- docs/architecture/data-models.md
- docs/architecture/rest-api-spec.md

**Options:**
1. User provides architecture documentation
2. Proceed with minimal context (note limitations in task spec)
3. Defer task spec creation until docs available
```

**2. Critical Information Missing**

```markdown
⚠️ CRITICAL INFORMATION MISSING

**Missing Details:**
- User data model schema not defined
- API endpoint specifications not documented
- Authentication strategy unclear

**Cannot Proceed Because:**
Task spec requires specific technical details for implementation.

**Options:**
1. User provides missing information
2. Create architecture documentation first
3. Use best practices (note assumptions in task spec)
```

**3. Conflicting Information**

```markdown
⚠️ CONFLICTING INFORMATION IN ARCHITECTURE

**Conflict:**
- docs/data-models.md says User has "username" field
- docs/api-spec.md signup endpoint uses "email" only

**Cannot Proceed Because:**
Unclear which specification is correct.

**Need from User:**
- Clarify which specification is authoritative
- Or: Update documentation to resolve conflict
```

---

## Quick Reference

**Load Context:**
1. Coding standards (always-load files)
2. Architecture docs (system design)
3. Standards docs (security, performance)
4. Previous tasks (patterns, learnings)

**Extract for ALL Tasks:**
- Tech stack
- Project structure
- Coding standards
- Testing strategy

**Extract for Backend:**
- Data models, API specs, external services

**Extract for Frontend:**
- Component specs, state management, routing

**Always Include:**
- [Source: filename#section] for every claim
- Note when information is missing
- Previous task patterns and learnings

---

*Part of create-task-spec skill - Planning Suite*
