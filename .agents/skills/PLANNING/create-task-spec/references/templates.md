# Task Specification Templates

This file contains templates, examples, and formatting standards for creating task specifications.

---

## Task Specification Summary Template

Present this summary after creating task specification:

```markdown
## Task Specification Created

**Task ID:** task-006-user-signup
**File:** .claude/tasks/task-006-user-signup.md
**Status:** Draft

**Objective:**
As a new user, I want to create an account with email and password,
so that I can access personalized features.

**Acceptance Criteria:**
1. User can signup with valid email/password
2. Password security requirements enforced
3. Duplicate emails prevented
4. Confirmation email sent

**Task Breakdown:**
- Task 1: Create user model (AC: 1, 2)
- Task 2: Implement signup service (AC: 1, 3)
- Task 3: Create API endpoint (AC: 1, 4)
- Task 4: Add email verification (AC: 4)
- Task 5: Write comprehensive tests (AC: all)

**Total:** 5 tasks, 20 subtasks

**Context Embedded:**
- User model schema [Source: docs/architecture/data-models.md#user]
- Auth API spec [Source: docs/architecture/rest-api-spec.md#auth]
- Testing strategy [Source: docs/standards.md#testing]
- Previous auth patterns [Source: task-003 completion notes]

**Ready for implementation? (yes/no)**
```

---

## Output Format

Return structured output with telemetry:

```json
{
  "task_file": ".claude/tasks/task-006-user-signup.md",
  "task_id": "task-006",
  "task_count": 5,
  "status": "Approved",
  "telemetry": {
    "skill": "create-task-spec",
    "task_id": "task-006",
    "task_count": 5,
    "subtask_count": 20,
    "priority": "P1",
    "status": "Approved",
    "duration_ms": 325000
  }
}
```

---

## Task Specification File Template

Standard structure for task specification files:

```markdown
# Task: {{TASK_ID}} - {{TASK_TITLE}}

**Created:** {{DATE}}
**Priority:** {{PRIORITY}}
**Status:** {{STATUS}}

---

## Objective

{{USER_STORY}}

---

## Acceptance Criteria

{{ACCEPTANCE_CRITERIA}}

---

## Context

### Technology Stack
{{TECH_STACK}}
[Source: {{SOURCE_FILE}}]

### Previous Task Insights
{{PREVIOUS_LEARNINGS}}
[Source: {{PREVIOUS_TASK_FILE}}]

### Data Models
{{DATA_MODELS}}
[Source: {{SOURCE_FILE}}#{{SECTION}}]

### API Specifications
{{API_SPECS}}
[Source: {{SOURCE_FILE}}#{{SECTION}}]

### Component Specifications
{{COMPONENT_SPECS}}
[Source: {{SOURCE_FILE}}#{{SECTION}}]

### File Locations
{{FILE_LOCATIONS}}
[Source: {{SOURCE_FILE}}]

### Testing Requirements
{{TEST_REQUIREMENTS}}
[Source: {{SOURCE_FILE}}]

### Technical Constraints
{{CONSTRAINTS}}
[Source: {{SOURCE_FILE}}]

---

## Tasks / Subtasks

{{TASKS}}

---

## Validation

{{VALIDATION}}

---

## Implementation Record

*(To be completed during implementation)*
```

---

## Template Placeholder Examples

### {{USER_STORY}}
```markdown
As a new user, I want to create an account with email and password, so that I can access personalized features.
```

### {{ACCEPTANCE_CRITERIA}}
```markdown
1. **AC-1**: User can signup with valid email/password
   - Email validation follows RFC 5322
   - Password must be 8+ characters with complexity requirements

2. **AC-2**: Password security requirements enforced
   - Passwords hashed with bcrypt (cost 12)
   - No plain text storage

3. **AC-3**: Duplicate emails prevented
   - Database unique constraint on email
   - Returns 409 Conflict for duplicates

4. **AC-4**: Confirmation email sent
   - Email sent within 5 seconds of signup
   - Contains verification link valid for 24 hours
```

### {{DATA_MODELS}}
```markdown
**User Model:**

```typescript
interface User {
  id: string;              // UUID v4
  email: string;           // Unique, validated
  passwordHash: string;    // bcrypt hash
  emailVerified: boolean;  // Default: false
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules:**
- Email: RFC 5322 compliant, max 255 chars
- Password: 8-128 chars, requires uppercase, lowercase, digit, special char

[Source: docs/architecture/data-models.md#user]
```

### {{API_SPECS}}
```markdown
**POST /api/auth/signup**

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "emailVerified": false
  },
  "message": "Verification email sent to user@example.com"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid email format"
}
```

**Response (409 Conflict):**
```json
{
  "error": "Email already registered"
}
```

**Response (500 Internal Server Error):**
```json
{
  "error": "Failed to create account. Please try again."
}
```

[Source: docs/architecture/rest-api-spec.md#auth-signup]
```

### {{COMPONENT_SPECS}}
```markdown
**SignupForm Component:**

**Location:** `src/components/auth/SignupForm.tsx`

**Props:**
```typescript
interface SignupFormProps {
  onSuccess: (user: User) => void;
  onError: (error: string) => void;
}
```

**State:**
- email: string
- password: string
- isSubmitting: boolean
- errors: { email?: string; password?: string }

**Validation:**
- Client-side validation on blur
- Real-time password strength indicator
- Show validation errors below fields

**Styling:**
- Use Tailwind CSS utility classes
- Match existing form patterns
- Responsive: mobile-first design

[Source: docs/ui-components/forms.md#signup-form]
```

### {{FILE_LOCATIONS}}
```markdown
**New Files to Create:**
- `src/types/user.ts` - User type definitions
- `src/schemas/auth.schema.ts` - Zod validation schemas
- `src/services/auth/signup.service.ts` - Signup business logic
- `src/controllers/auth/signup.controller.ts` - HTTP request handler
- `src/routes/auth.routes.ts` - Auth route definitions (modify)
- `tests/unit/services/signup.test.ts` - Service unit tests
- `tests/integration/auth/signup.test.ts` - API integration tests

**Existing Files to Modify:**
- `src/routes/index.ts` - Add auth routes
- `src/app.ts` - Register auth routes
- `docs/api-documentation.md` - Document signup endpoint

[Source: docs/project-structure.md]
```

### {{TEST_REQUIREMENTS}}
```markdown
**Testing Strategy:**

**Unit Tests (80%+ coverage):**
- Validation logic (email, password)
- Password hashing
- Duplicate detection
- Service methods

**Integration Tests:**
- Full signup flow (happy path)
- Duplicate email rejection
- Invalid input handling
- Database constraints
- Email sending

**Test Framework:** Jest + Supertest
**Mock Strategy:** Mock external services (email sender, database for unit tests)
**Coverage Target:** 80% minimum, 90% recommended

[Source: docs/testing-standards.md]
```

### {{CONSTRAINTS}}
```markdown
**Performance:**
- Signup endpoint response time: <500ms (p95)
- Password hashing: ~200ms (bcrypt cost 12)
- Database insert: <50ms

**Security:**
- Password never logged or returned in API
- Rate limiting: 5 signups per IP per hour
- Email verification required before full access
- HTTPS required in production

**Reliability:**
- Graceful handling of email service failures
- Database transaction for atomicity
- Retry logic for transient failures
- Detailed error logging

**Testing:**
- All acceptance criteria must have tests
- Edge cases covered (empty strings, SQL injection attempts, etc.)
- Error scenarios tested

[Source: docs/non-functional-requirements.md]
```

### {{TASKS}}
```markdown
- [ ] **Task 1: Create user data model** (AC: 1, 2)
  - [ ] Define User interface in `src/types/user.ts`
  - [ ] Create Zod validation schema in `src/schemas/auth.schema.ts`
  - [ ] Add database migration for users table
  - [ ] Write unit tests for validation logic
  - [ ] **Validate:** Model matches architecture spec

- [ ] **Task 2: Implement signup service logic** (AC: 1, 3)
  - [ ] Create `signup.service.ts` with user creation logic
  - [ ] Implement password hashing with bcrypt (cost 12)
  - [ ] Add duplicate email check with proper error handling
  - [ ] Write unit tests for service methods (happy path + errors)
  - [ ] **Validate:** All edge cases covered

- [ ] **Task 3: Create signup API endpoint** (AC: 1, 4)
  - [ ] Create `signup.controller.ts` with request handling
  - [ ] Add POST /api/auth/signup route
  - [ ] Implement request validation middleware
  - [ ] Add error handling and response formatting
  - [ ] Write integration tests for API endpoint
  - [ ] **Validate:** All status codes correct (201, 400, 409, 500)

- [ ] **Task 4: Add email verification** (AC: 4)
  - [ ] Integrate email service for verification emails
  - [ ] Create verification token generation logic
  - [ ] Add verification endpoint (GET /api/auth/verify/:token)
  - [ ] Write tests for email sending and verification flow
  - [ ] **Validate:** Emails sent successfully, tokens expire correctly

- [ ] **Task 5: Write comprehensive test suite** (AC: all)
  - [ ] Add edge case tests (malformed emails, weak passwords)
  - [ ] Add security tests (SQL injection, XSS attempts)
  - [ ] Verify test coverage meets 80% threshold
  - [ ] Run full test suite and verify all passing
  - [ ] **Validate:** All acceptance criteria have corresponding passing tests
```

---

## Configuration Format

Expected configuration in `.claude/config.yaml`:

```yaml
documentation:
  architecture:
    - docs/architecture/data-models.md
    - docs/architecture/rest-api-spec.md
    - docs/architecture/system-design.md

development:
  alwaysLoadFiles:
    - docs/coding-standards.md
    - docs/testing-standards.md
  taskLocation: .claude/tasks

templates:
  taskSpec: .claude/templates/task-spec.md
```

---

## Requirement Gathering Questions

### Essential Questions

**1. What needs to be implemented?**
- Feature description (1-2 sentences)
- Problem it solves
- Primary user/beneficiary

**2. What defines "done"?**
- 2-5 specific, testable acceptance criteria
- Edge cases to consider
- Success metrics

**3. Priority and complexity?**
- P0 (Critical - blocks release)
- P1 (High - important for release)
- P2 (Medium - nice to have)
- P3 (Low - future consideration)
- Complexity: Simple | Medium | Complex

### Follow-up Questions (if needed)

**For unclear requirements:**
- "Can you provide an example of how this would be used?"
- "What should happen if [edge case]?"
- "Who is the primary user of this feature?"

**For technical clarity:**
- "Are there existing patterns we should follow?"
- "Are there specific technical constraints?"
- "Should this integrate with existing features?"

**For validation:**
- "How will we know this is working correctly?"
- "What would make you confident this is complete?"

---

## Task Breakdown Patterns

### Pattern 1: API Feature (Backend)

```markdown
1. Data models and migrations
2. Service layer logic
3. API endpoints and controllers
4. Integration with existing systems
5. Comprehensive testing
```

### Pattern 2: UI Feature (Frontend)

```markdown
1. Component design and structure
2. State management setup
3. API integration
4. Styling and responsiveness
5. Accessibility and testing
```

### Pattern 3: Full-Stack Feature

```markdown
1. Backend: Data models
2. Backend: Service logic
3. Backend: API endpoints
4. Frontend: Components
5. Frontend: Integration
6. End-to-end testing
```

### Pattern 4: Infrastructure/DevOps

```markdown
1. Configuration setup
2. Infrastructure provisioning
3. Deployment pipeline
4. Monitoring and logging
5. Documentation
```

---

## Validation Checklist

**Required Sections:**
- [ ] Status (Draft or Approved)
- [ ] Objective (user story format)
- [ ] Acceptance Criteria (2-5 specific)
- [ ] Context (embedded technical details)
- [ ] Tasks/Subtasks (3-15 tasks)
- [ ] Implementation Record (placeholder)

**Context Completeness:**
- [ ] Previous task insights referenced
- [ ] Data models with schemas
- [ ] API specs with examples
- [ ] Component specs with structure
- [ ] Exact file locations
- [ ] Testing requirements
- [ ] All with [Source: ...] references

**Task Quality:**
- [ ] Logical implementation order
- [ ] Linked to acceptance criteria
- [ ] Include test writing steps
- [ ] Have validation checkpoints
- [ ] Specific file paths (not generic)

---

## Source Citation Format

Always cite sources for technical details:

```markdown
**Data Model Schema:**
[Detailed schema here]

[Source: docs/architecture/data-models.md#user-model]
```

```markdown
**API Endpoint Specification:**
[Endpoint details here]

[Source: docs/architecture/rest-api-spec.md#auth-endpoints]
```

```markdown
**Previous Task Learnings:**
[Patterns and insights here]

[Source: .claude/tasks/task-003-user-login.md - Implementation Record]
```

---

*Part of BMAD Enhanced Planning Suite - create-task-spec skill*
