# Task Breakdown Guide

## Purpose

Break requirements into sequential, implementable tasks with clear validation checkpoints.

---

## Step 4: Create Sequential Task Breakdown

### Task Granularity Rules

**Target:** 3-15 tasks per specification

**Too Few (<3 tasks):**
- Requirement too simple for formal task spec
- Use simplified bug fix or quick implementation approach
- Example: "Fix typo in button text" (1 task) → Don't need task spec

**Good Range (3-15 tasks):**
- Appropriate complexity for structured implementation
- Each task is substantial but completable
- Clear dependencies and sequence

**Too Many (>15 tasks):**
- Requirement too complex for single task spec
- Should be split into multiple task specs or epic
- Example: "Build entire authentication system" (30+ tasks) → Break into task specs for signup, login, password reset, etc.

---

### Task Structure

**Each Task Must Have:**
1. Clear objective
2. 3-8 subtasks
3. Link to acceptance criteria (AC: X, Y)
4. Validation checkpoint
5. Test writing requirement

**Template:**
```markdown
- [ ] Task N: [Clear objective] (AC: X, Y)
  - [ ] [Implementation step 1]
  - [ ] [Implementation step 2]
  - [ ] [Implementation step 3]
  - [ ] Write [test type] tests
  - [ ] Validate: [Specific validation]
```

---

### Implementation Order

**Layer-Based Sequencing:**

**1. Data Layer First:**
- Database models
- Schemas and migrations
- Validation rules
- Data access patterns

**Example:**
```markdown
- [ ] Task 1: Create user data model (AC: 1, 2)
  - [ ] Define User interface in src/types/user.ts
  - [ ] Create Zod validation schema in src/schemas/user.schema.ts
  - [ ] Add database migration for users table
  - [ ] Write unit tests for validation logic
  - [ ] Validate: Model matches architecture spec
```

---

**2. Business Logic Second:**
- Services and utilities
- Business rules implementation
- Data transformation
- Complex calculations

**Example:**
```markdown
- [ ] Task 2: Implement signup service logic (AC: 1, 3)
  - [ ] Create SignupService class in src/services/auth/signup.service.ts
  - [ ] Implement user creation with password hashing (bcrypt cost 12)
  - [ ] Add duplicate email check before insertion
  - [ ] Implement transaction support for atomic operations
  - [ ] Write unit tests for service methods (happy path + edge cases)
  - [ ] Validate: All business rules covered, edge cases tested
```

---

**3. API Layer Third:**
- Routes and controllers
- Request/response handling
- Middleware
- Error handling

**Example:**
```markdown
- [ ] Task 3: Create signup API endpoint (AC: 1, 4)
  - [ ] Add POST /api/auth/signup route in src/routes/auth/signup.ts
  - [ ] Implement request validation middleware (Zod schema)
  - [ ] Connect route to SignupService
  - [ ] Add error handling for validation, duplicate, and server errors
  - [ ] Implement rate limiting (5 requests/minute per IP)
  - [ ] Write integration tests for endpoint (success + error cases)
  - [ ] Validate: API matches spec, all errors handled correctly
```

---

**4. UI Layer Fourth (if applicable):**
- Components
- Pages
- Forms
- User interactions

**Example:**
```markdown
- [ ] Task 4: Create signup form component (AC: 1, 2)
  - [ ] Create SignupForm component in src/components/auth/SignupForm.tsx
  - [ ] Implement form with React Hook Form + Zod validation
  - [ ] Add real-time validation feedback
  - [ ] Implement submit handler with API call
  - [ ] Add loading and error states
  - [ ] Style with Tailwind CSS (follow design system)
  - [ ] Write component tests with React Testing Library
  - [ ] Validate: Form matches design, validation works, accessibility compliant
```

---

**5. Integration Last:**
- E2E tests
- Documentation
- Deployment configuration
- Monitoring/logging

**Example:**
```markdown
- [ ] Task 5: Comprehensive testing and documentation (AC: all)
  - [ ] Write E2E tests for complete signup flow (Playwright)
  - [ ] Test error scenarios (invalid input, duplicate email, service failures)
  - [ ] Run full test suite and verify coverage ≥80%
  - [ ] Update API documentation (OpenAPI/Swagger)
  - [ ] Update README with setup instructions
  - [ ] Add logging for signup events (analytics)
  - [ ] Validate: All ACs covered, documentation complete, tests passing
```

---

### Linking to Acceptance Criteria

**Each task should reference relevant ACs:**

**Example:**
```markdown
**Acceptance Criteria:**
1. User can signup with valid email/password
2. Password security requirements enforced
3. Duplicate emails prevented
4. Confirmation email sent

**Tasks:**
- [ ] Task 1: Create user model (AC: 1, 2)
      ↑ Addresses AC1 (email/password fields) and AC2 (password validation)

- [ ] Task 2: Implement signup service (AC: 1, 3)
      ↑ Addresses AC1 (user creation) and AC3 (duplicate check)

- [ ] Task 3: Create API endpoint (AC: 1, 4)
      ↑ Addresses AC1 (signup functionality) and AC4 (email trigger)

- [ ] Task 4: Email verification (AC: 4)
      ↑ Fully addresses AC4 (confirmation email)

- [ ] Task 5: Comprehensive tests (AC: all)
      ↑ Validates all acceptance criteria
```

**Benefits:**
- Clear traceability
- Ensures all ACs covered
- Easy verification during implementation

---

### Validation Checkpoints

**Every task must include validation:**

**Types of Validation:**

1. **Code Quality:**
   - Linter passing
   - Type checker passing
   - No console warnings

2. **Functional:**
   - Tests passing
   - Feature works as expected
   - Edge cases handled

3. **Architecture Compliance:**
   - Matches architecture spec
   - Follows coding standards
   - Uses established patterns

4. **Acceptance Criteria:**
   - Applicable ACs verified
   - Edge cases from ACs tested

**Example Validations:**
```markdown
- [ ] Validate: Model matches architecture spec [Source: docs/data-models.md#user]
- [ ] Validate: All edge cases covered (invalid emails, weak passwords)
- [ ] Validate: API matches spec [Source: docs/rest-api-spec.md#auth]
- [ ] Validate: Performance <200ms (test with 100 concurrent requests)
- [ ] Validate: All ACs tested and passing
```

---

### Test Writing Requirements

**Every task must include test writing:**

**Test Types:**

1. **Unit Tests:**
   - Services, utilities, helpers
   - Validation logic
   - Business rules
   - Target: ≥80% coverage

2. **Integration Tests:**
   - API endpoints
   - Database operations
   - External service calls
   - Target: All endpoints covered

3. **E2E Tests:**
   - Critical user flows
   - End-to-end scenarios
   - Real browser interactions
   - Target: Happy path + major error paths

**Examples:**
```markdown
- [ ] Write unit tests for validation logic (12 test cases)
- [ ] Write unit tests for service methods (happy path + error scenarios)
- [ ] Write integration tests for endpoint (success + 400, 409, 500 errors)
- [ ] Write E2E tests for complete signup flow (valid + invalid scenarios)
```

---

## Complete Example

### Requirement: User Signup

**Acceptance Criteria:**
1. User can signup with valid email/password
2. Password security requirements enforced (8+ chars, complexity)
3. Duplicate emails prevented (return 409 Conflict)
4. Confirmation email sent with verification link

**Task Breakdown:**

```markdown
## Tasks / Subtasks

- [ ] Task 1: Create user data model (AC: 1, 2)
  - [ ] Define User interface in src/types/user.ts with id, email, password, timestamps
  - [ ] Create Zod validation schema in src/schemas/user.schema.ts (email: RFC 5322, password: min 8 chars + complexity)
  - [ ] Add database migration for users table with UUID primary key and unique email constraint
  - [ ] Create indexes on email column for fast lookups
  - [ ] Write unit tests for validation logic (12 test cases: valid/invalid emails, valid/invalid passwords)
  - [ ] Validate: Model matches architecture spec [Source: docs/data-models.md#user]

- [ ] Task 2: Implement signup service logic (AC: 1, 3)
  - [ ] Create SignupService class in src/services/auth/signup.service.ts
  - [ ] Implement createUser method with password hashing (bcrypt, cost 12)
  - [ ] Add duplicate email check with database query before insertion
  - [ ] Implement transaction support for atomic user creation
  - [ ] Add error handling for database failures and constraint violations
  - [ ] Write unit tests for service methods (8 test cases: success, duplicate email, database errors)
  - [ ] Validate: All edge cases covered (duplicate email returns proper error, transactions work)

- [ ] Task 3: Create signup API endpoint (AC: 1, 4)
  - [ ] Add POST /api/auth/signup route in src/routes/auth/signup.ts
  - [ ] Implement request validation middleware using Zod schema
  - [ ] Connect route to SignupService.createUser
  - [ ] Add error handling (400: validation, 409: duplicate, 500: server error)
  - [ ] Implement rate limiting middleware (5 requests/minute per IP)
  - [ ] Generate JWT token on successful signup (expires in 24h)
  - [ ] Write integration tests for endpoint (5 test cases: success, invalid input, duplicate email, rate limit, server error)
  - [ ] Validate: API matches spec [Source: docs/rest-api-spec.md#auth], response time <200ms

- [ ] Task 4: Add email verification (AC: 4)
  - [ ] Integrate SendGrid email service from src/services/email/
  - [ ] Create confirmation email template in src/templates/email/confirmation.html
  - [ ] Generate verification token (JWT, expires in 24h)
  - [ ] Send confirmation email after signup with verification link
  - [ ] Add retry logic for email sending (3 attempts with exponential backoff)
  - [ ] Write integration tests with mocked email service (2 test cases: success, email service failure)
  - [ ] Validate: Email sent successfully, fallback logging works if service unavailable

- [ ] Task 5: Comprehensive testing and documentation (AC: all)
  - [ ] Write E2E tests for complete signup flow using Playwright (2 scenarios: valid signup, error handling)
  - [ ] Test all error scenarios (invalid email, weak password, duplicate email, service failures)
  - [ ] Run full test suite and verify coverage ≥80% (target: 85%)
  - [ ] Update API documentation (OpenAPI/Swagger spec for POST /api/auth/signup)
  - [ ] Update README.md with signup API usage examples
  - [ ] Add logging for signup events (success/failure) for analytics
  - [ ] Run performance test (100 concurrent signups, verify <200ms p95)
  - [ ] Validate: All 4 acceptance criteria tested and passing, documentation complete
```

**Summary:**
- **Tasks:** 5
- **Subtasks:** 35
- **ACs Covered:** All 4
- **Test Files:** 4 (unit, service unit, integration, E2E)
- **Estimated Tests:** 27 tests total

---

## Best Practices

**1. One Task, One Concern**

❌ **Don't mix layers:**
```markdown
- [ ] Task 1: Create user model and API endpoint
```

✅ **Separate by layer:**
```markdown
- [ ] Task 1: Create user model
- [ ] Task 2: Create API endpoint
```

---

**2. Specific, Not Generic**

❌ **Too generic:**
```markdown
- [ ] Implement authentication
```

✅ **Specific:**
```markdown
- [ ] Task 1: Create user model (AC: 1, 2)
- [ ] Task 2: Implement signup service (AC: 1, 3)
- [ ] Task 3: Create signup endpoint (AC: 1, 4)
```

---

**3. Include Test Writing**

❌ **No tests:**
```markdown
- [ ] Create SignupService
- [ ] Add error handling
```

✅ **With tests:**
```markdown
- [ ] Create SignupService
- [ ] Add error handling
- [ ] Write unit tests (8 test cases)
- [ ] Validate: All edge cases covered
```

---

**4. Validation Every Task**

Every task must end with validation step:
```markdown
- [ ] Validate: [Specific check]
```

Examples:
- Validate: Model matches architecture spec
- Validate: API response time <200ms
- Validate: All ACs tested and passing
- Validate: Test coverage ≥80%

---

**5. Progressive Complexity**

Start simple, build complexity:
```markdown
Task 1: Data model (foundational)
Task 2: Service logic (builds on model)
Task 3: API endpoint (builds on service)
Task 4: Integration (builds on endpoint)
Task 5: Tests (validates all)
```

---

## Common Pitfalls

**1. Tasks Too Large**

❌ **Too large:**
```markdown
- [ ] Task 1: Implement complete authentication system
  - [ ] Signup
  - [ ] Login
  - [ ] Password reset
  - [ ] Email verification
  - [ ] OAuth integration
```

✅ **Break into multiple task specs:**
```markdown
Task Spec 1: User Signup (5 tasks)
Task Spec 2: User Login (4 tasks)
Task Spec 3: Password Reset (3 tasks)
Task Spec 4: OAuth Integration (6 tasks)
```

---

**2. Missing Validation**

❌ **No validation:**
```markdown
- [ ] Create user model
- [ ] Write tests
```

✅ **With validation:**
```markdown
- [ ] Create user model
- [ ] Write tests
- [ ] Validate: Model matches spec, tests pass, coverage ≥80%
```

---

**3. Unclear Dependencies**

❌ **Random order:**
```markdown
- [ ] Task 1: Create API endpoint
- [ ] Task 2: Create user model
```

✅ **Logical order:**
```markdown
- [ ] Task 1: Create user model (foundation)
- [ ] Task 2: Implement service (uses model)
- [ ] Task 3: Create API endpoint (uses service)
```

---

## Quick Reference

**Task Granularity:**
- 3-15 tasks per spec
- <3: Too simple (don't need spec)
- >15: Too complex (split into multiple specs)

**Implementation Order:**
1. Data layer (models, schemas)
2. Business logic (services)
3. API layer (routes, controllers)
4. UI layer (components, forms)
5. Integration (tests, docs)

**Every Task Must Have:**
- Clear objective
- 3-8 subtasks
- Link to ACs
- Test writing step
- Validation checkpoint

**Validation Types:**
- Code quality (linter, types)
- Functional (tests passing)
- Architecture compliance
- AC verification

---

*Part of create-task-spec skill - Planning Suite*
