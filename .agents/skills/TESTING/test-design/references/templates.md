# Test Design Templates and Output Formats

All output formats, examples, and templates for the test-design skill.

---

## Step 0: Load Configuration and Context Output

**Complete Output Format:**
```
✓ Configuration loaded from .claude/config.yaml
✓ Test coverage targets: Overall 80%, Critical paths 100%, New code 90%
✓ Test timeouts: Unit 5s, Integration 30s, E2E 60s
✓ Task file: .claude/tasks/task-006-user-signup.md
✓ Task context loaded: User Signup Implementation
✓ Risk profile found: .claude/quality/assessments/task-006-risk-20251029.md
✓ Risk scores available for prioritization: 1 critical, 3 high, 2 medium risks
✓ Ready to analyze test requirements
✓ Duration: 89ms
```

**Example Without Risk Profile:**
```
✓ Configuration loaded from .claude/config.yaml
✓ Test coverage targets: Overall 80%, Critical paths 100%, New code 90%
✓ Task file: .claude/tasks/task-012-payment-integration.md
✓ Task context loaded: Payment Processing Integration
⚠ Risk profile not found (recommended: run risk-profile skill first)
⚠ Will use AC criticality for prioritization instead of risk scores
✓ Ready to analyze test requirements
✓ Duration: 76ms
```

---

## Step 1: Analyze Test Requirements Output

**Complete Output Format:**
```
✓ Test requirements analyzed for 4 acceptance criteria
✓ Test categories identified:
  ├─ Happy path: 8 scenarios
  ├─ Error cases: 6 scenarios
  ├─ Edge cases: 4 scenarios
  ├─ Security: 3 scenarios
  ├─ Performance: 2 scenarios
  └─ Integration: 5 scenarios
✓ Test levels determined:
  ├─ Unit tests: 12 scenarios (logic, validation)
  ├─ Integration tests: 10 scenarios (API, database)
  └─ E2E tests: 6 scenarios (user journeys)
✓ Technical considerations noted:
  ├─ External dependencies: Email service, Payment API
  ├─ Database interactions: Test DB required
  └─ Async operations: Promise-based auth flow
✓ Duration: 234ms
```

**Detailed Example:**
```
✓ Test requirements analyzed for 3 acceptance criteria

✓ AC1: User can signup with valid email/password
  Test Requirements:
  ├─ Valid signup creates user record
  ├─ Valid signup returns JWT token
  ├─ Valid signup sends confirmation email
  ├─ Email format validation
  ├─ Password strength validation (8+ chars, mixed case, number, special)
  ├─ Duplicate email rejection
  ├─ SQL injection attempts rejected
  └─ XSS in email field handled safely

  Test Categories:
  ├─ Happy path: Valid signup with confirmation
  ├─ Error cases: Invalid email format, weak password, duplicate email
  ├─ Edge cases: Unicode emails, 100-char passwords, concurrent signups
  ├─ Security: SQL injection, XSS attempts, rate limiting
  └─ Integration: Email service, database transaction, JWT generation

  Test Levels:
  ├─ Unit: Email validation logic, password strength checker
  ├─ Integration: POST /api/auth/signup endpoint with test DB
  └─ E2E: Complete signup flow from form submission to email confirmation

✓ AC2: User receives confirmation email with activation link
  [Similar breakdown...]

✓ AC3: User can activate account via email link
  [Similar breakdown...]

✓ Technical Considerations:
  ├─ Email service: Must mock (no real emails in tests)
  ├─ Database: Test instance with isolated data
  ├─ JWT secrets: Test environment variables
  ├─ Async operations: async/await throughout auth flow
  └─ Rate limiting: Need test middleware bypass

✓ Duration: 312ms
```

---

## Step 2: Design Test Scenarios Output

**Complete Output Format:**
```
✓ Test scenarios designed: 24 scenarios
✓ Test levels assigned:
  ├─ Unit: 15 scenarios
  ├─ Integration: 7 scenarios
  └─ E2E: 2 scenarios
✓ Priorities assigned (risk-informed):
  ├─ P0 (Critical): 8 scenarios (high-risk, security, data integrity)
  ├─ P1 (High): 10 scenarios (core features, important flows)
  └─ P2 (Medium): 6 scenarios (edge cases, nice-to-have)
✓ Test data specified: Valid, invalid, edge, security payloads
✓ Dependencies identified: 3 mocks needed, 1 test instance, 2 fixtures
✓ Duration: 445ms
```

**Complete Test Scenario Examples:**

### Example 1: Valid User Signup (P0, Integration)

**Scenario ID:** TS-001
**Acceptance Criterion:** AC1 - User can signup with valid email/password

**Given** the API is running and database is empty
**When** POST /api/auth/signup with valid email "alice@example.com" and strong password "SecurePass123!"
**Then**
- Response status is 201 Created
- Response body contains user object with email "alice@example.com"
- Response body contains JWT token (valid format)
- User record exists in database with hashed password
- Confirmation email queued with activation link
- User status is "pending_activation"

**Test Level:** Integration
**Priority:** P0 (Critical - core authentication functionality)
**Risk Linkage:** Addresses Risk #1 (Auth implementation) - Score 6

**Test Data:**
- Valid email: alice@example.com
- Valid password: SecurePass123! (8+ chars, uppercase, lowercase, number, special)

**Expected Behavior:**
```json
{
  "user": {
    "id": "uuid-v4-format",
    "email": "alice@example.com",
    "status": "pending_activation",
    "createdAt": "2025-10-30T14:32:15Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Dependencies:**
- Test database with users table (real Postgres instance)
- Email service mocked (verify sendEmail called with correct params)
- JWT secret configured in test environment

**Mock Configuration:**
```typescript
// Mock email service
jest.mock('@/services/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
}));

// Verify email sent
expect(emailService.sendEmail).toHaveBeenCalledWith({
  to: 'alice@example.com',
  subject: 'Confirm your email',
  template: 'confirmation',
  data: { activationLink: expect.stringContaining('/activate/') }
});
```

**Test File:** `src/routes/auth/__tests__/signup.integration.test.ts`

**Estimated Execution Time:** 350ms

---

### Example 2: SQL Injection Prevention (P0, Integration)

**Scenario ID:** TS-002
**Acceptance Criterion:** AC1 - User can signup with valid email/password (Security validation)

**Given** the API is running and database is empty
**When** POST /api/auth/signup with SQL injection payload in email field
**Then**
- Response status is 400 Bad Request
- Response body contains validation error for email format
- No database query executed (payload rejected before DB access)
- No user record created
- Security event logged

**Test Level:** Integration
**Priority:** P0 (Critical - security vulnerability prevention)
**Risk Linkage:** Addresses Risk #2 (SQL Injection) - Score 9 (Critical)

**Test Data:**
- Malicious email: `admin'--@example.com` OR `admin@example.com'; DROP TABLE users;--`
- Valid password: SecurePass123!

**Expected Behavior:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Dependencies:**
- Test database (no queries should execute)
- Email service NOT called
- Security logger mocked (verify injection attempt logged)

**Verification:**
```typescript
// Verify no user created
const userCount = await testDb.user.count();
expect(userCount).toBe(0);

// Verify security event logged
expect(securityLogger.warn).toHaveBeenCalledWith(
  expect.objectContaining({
    event: 'sql_injection_attempt',
    email: expect.stringContaining("'")
  })
);
```

**Test File:** `src/routes/auth/__tests__/signup-security.integration.test.ts`

**Estimated Execution Time:** 200ms (blocked before DB access)

---

### Example 3: Duplicate Email Rejection (P0, Integration)

**Scenario ID:** TS-003
**Acceptance Criterion:** AC1 - User can signup with valid email/password

**Given** the database already contains user with email "bob@example.com"
**When** POST /api/auth/signup with email "bob@example.com" and valid password
**Then**
- Response status is 409 Conflict
- Response body contains clear error message
- No new user record created
- No confirmation email sent
- Original user record unchanged

**Test Level:** Integration
**Priority:** P0 (Critical - data integrity, prevents duplicate accounts)
**Risk Linkage:** Addresses Risk #3 (Data integrity) - Score 6

**Test Data:**
- Existing user: bob@example.com (already in database)
- Duplicate email: bob@example.com
- Valid password: AnotherPass456!

**Setup:**
```typescript
beforeEach(async () => {
  // Create existing user
  await testDb.user.create({
    data: {
      email: 'bob@example.com',
      passwordHash: await hashPassword('ExistingPass123!'),
      status: 'active'
    }
  });
});
```

**Expected Behavior:**
```json
{
  "error": "Email already registered",
  "message": "An account with this email already exists. Please sign in or use a different email."
}
```

**Dependencies:**
- Test database with existing user
- Email service NOT called (no email for failed signup)

**Verification:**
```typescript
// Verify only one user exists (original)
const users = await testDb.user.findMany({ where: { email: 'bob@example.com' } });
expect(users).toHaveLength(1);
expect(users[0].status).toBe('active'); // Unchanged

// Verify no email sent
expect(emailService.sendEmail).not.toHaveBeenCalled();
```

**Test File:** `src/routes/auth/__tests__/signup.integration.test.ts`

**Estimated Execution Time:** 250ms

---

### Example 4: Email Validation Unit Test (P1, Unit)

**Scenario ID:** TS-004
**Acceptance Criterion:** AC1 - User can signup with valid email/password

**Given** the email validation function
**When** called with invalid email formats
**Then** returns false with appropriate error message

**Test Level:** Unit
**Priority:** P1 (High - core validation logic)

**Test Cases:**
```typescript
describe('validateEmail', () => {
  it('rejects emails without @ symbol', () => {
    expect(validateEmail('invalidemail.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects emails without TLD', () => {
    expect(validateEmail('user@domain')).toBe(false);
  });

  it('accepts valid email formats', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
  });

  it('handles unicode emails', () => {
    expect(validateEmail('user@münchen.de')).toBe(true);
  });

  it('rejects emails with spaces', () => {
    expect(validateEmail('user name@example.com')).toBe(false);
  });
});
```

**Dependencies:** None (pure function)

**Test File:** `src/utils/__tests__/validation.test.ts`

**Estimated Execution Time:** 15ms (6 tests × 2-3ms each)

---

### Example 5: Complete Signup E2E Flow (P0, E2E)

**Scenario ID:** TS-005
**Acceptance Criterion:** AC1, AC2, AC3 - Complete signup and activation flow

**Given** the web application is running in test environment
**When** user completes entire signup and activation flow
**Then** user is successfully registered and can log in

**Test Steps:**
1. Navigate to /signup page
2. Fill email field with "charlie@example.com"
3. Fill password field with "StrongPass789!"
4. Fill confirm password field with "StrongPass789!"
5. Click "Sign Up" button
6. Verify success message displayed
7. Extract activation link from mock email service
8. Navigate to activation link
9. Verify account activated message
10. Navigate to /login page
11. Fill email and password
12. Click "Log In" button
13. Verify redirected to dashboard

**Test Level:** E2E (Browser automation)
**Priority:** P0 (Critical - complete user journey)
**Risk Linkage:** Addresses overall auth flow implementation

**Test Code:**
```typescript
test('Complete signup and activation flow', async ({ page }) => {
  // Step 1-6: Signup
  await page.goto('/signup');
  await page.fill('[name="email"]', 'charlie@example.com');
  await page.fill('[name="password"]', 'StrongPass789!');
  await page.fill('[name="confirmPassword"]', 'StrongPass789!');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toContainText('Check your email');

  // Step 7-9: Activation
  const activationLink = getLastEmailLink(); // Extract from mock
  await page.goto(activationLink);
  await expect(page.locator('.success-message')).toContainText('Account activated');

  // Step 10-13: Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'charlie@example.com');
  await page.fill('[name="password"]', 'StrongPass789!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

**Dependencies:**
- Test browser (Playwright/Puppeteer)
- Test database with clean state
- Mock email service (capture activation links)
- Test environment with seeded data

**Test File:** `tests/e2e/auth/signup-flow.spec.ts`

**Estimated Execution Time:** 8 seconds

---

## Step 3: Develop Mock Strategies Output

**Complete Output Format:**
```
✓ Mock strategies developed for 4 dependencies
✓ Full mocks: 2 (Email service, Payment API)
✓ Test instances: 1 (PostgreSQL database)
✓ Partial mocks: 1 (JWT service - real implementation with test secrets)
✓ Mock data/fixtures specified: Success, failure, timeout, edge cases
✓ Configuration documented: Setup files, libraries (jest), verification patterns
✓ Duration: 178ms
```

**Complete Mock Strategy Examples:**

### Mock Strategy 1: Email Service (Full Mock)

**Dependency:** Email sending service (SendGrid, AWS SES, etc.)

**Approach:** Full mock - Replace with test double, never send real emails

**Rationale:**
- Sending real emails is slow (network latency)
- Costs money per email sent
- Difficult to verify delivery in tests
- May hit rate limits during test runs
- No value in testing third-party service

**Implementation:**
```typescript
// tests/setup/mocks/emailService.ts
export const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({
    messageId: 'test-msg-123',
    status: 'queued'
  }),

  verifyEmail: jest.fn().mockResolvedValue(true),

  getEmailHistory: jest.fn().mockReturnValue([]),

  // Simulate failures
  simulateFailure: () => {
    mockEmailService.sendEmail.mockRejectedValueOnce(
      new Error('Email service unavailable')
    );
  },

  // Simulate timeout
  simulateTimeout: () => {
    mockEmailService.sendEmail.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 10000))
    );
  }
};

// In jest.setup.ts:
jest.mock('@/services/email', () => mockEmailService);
```

**Mock Data Scenarios:**

**Success Response:**
```typescript
{
  messageId: 'test-msg-123',
  status: 'queued',
  to: 'user@example.com',
  subject: 'Confirm your email',
  timestamp: '2025-10-30T14:32:15Z'
}
```

**Failure Response:**
```typescript
{
  error: 'Service unavailable',
  code: 'ETIMEDOUT',
  retryable: true
}
```

**Verification Patterns:**
```typescript
// Verify email sent
expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);

// Verify email parameters
expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
  to: 'user@example.com',
  subject: 'Confirm your email',
  template: 'confirmation',
  data: {
    userName: 'Alice',
    activationLink: expect.stringContaining('/activate/')
  }
});

// Verify email NOT sent on error
expect(mockEmailService.sendEmail).not.toHaveBeenCalled();

// Reset mock between tests
beforeEach(() => {
  mockEmailService.sendEmail.mockClear();
});
```

---

### Mock Strategy 2: Database (Test Instance)

**Dependency:** PostgreSQL database

**Approach:** Test instance - Real database with test data, not mocked

**Rationale:**
- Database interactions are key integration test targets
- Mocking database loses value (doesn't catch query bugs)
- Real DB tests transactions, constraints, indexes
- Test instance is fast enough (<500ms per test)
- Catches real-world DB issues (deadlocks, constraints)

**Implementation:**
```typescript
// tests/setup/database.ts
import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL // postgres://localhost:5432/test_db
    }
  },
  log: ['error'] // Quiet in tests
});

// Global setup (runs once)
beforeAll(async () => {
  // Run migrations
  await testDb.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
  await testDb.$executeRaw`CREATE SCHEMA public`;
  // Run migrations here
});

// Per-test cleanup
beforeEach(async () => {
  // Clean all tables
  await testDb.user.deleteMany();
  await testDb.session.deleteMany();
  await testDb.token.deleteMany();
});

// Global teardown
afterAll(async () => {
  await testDb.$disconnect();
});
```

**Test Data Fixtures:**
```typescript
// tests/fixtures/users.ts
export const createTestUser = async (overrides = {}) => {
  return await testDb.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: await hashPassword('TestPass123!'),
      status: 'active',
      ...overrides
    }
  });
};

export const testUsers = {
  alice: {
    email: 'alice@example.com',
    password: 'AlicePass123!'
  },
  bob: {
    email: 'bob@example.com',
    password: 'BobPass456!'
  }
};
```

**Isolation Strategy:**
```typescript
// Option 1: Delete all data between tests (fast)
beforeEach(async () => {
  await testDb.user.deleteMany();
});

// Option 2: Transactions with rollback (faster, but complex)
let tx;
beforeEach(async () => {
  tx = await testDb.$begin();
});
afterEach(async () => {
  await tx.$rollback();
});

// Option 3: Separate DB per test worker (parallel safe)
// Configure in jest.config.js:
// testEnvironment: '@quramy/jest-prisma'
```

---

### Mock Strategy 3: JWT Service (Partial Mock)

**Dependency:** JWT token generation/verification

**Approach:** Partial mock - Real implementation with test secrets

**Rationale:**
- JWT logic is simple and fast (no external calls)
- Testing real JWT implementation adds value
- Can use deterministic test secrets for reproducibility
- Only mock the secret key, not the implementation

**Implementation:**
```typescript
// tests/setup/jwt.ts
process.env.JWT_SECRET = 'test-secret-key-do-not-use-in-production';
process.env.JWT_EXPIRY = '1h';

// Use real JWT service (no mock needed)
import { JWTService } from '@/services/jwt';

export const testJWT = new JWTService({
  secret: process.env.JWT_SECRET,
  expiresIn: '1h'
});

// Helper to create test tokens
export const createTestToken = (userId: string) => {
  return testJWT.sign({ userId, email: 'test@example.com' });
};

// Helper to decode tokens in tests
export const decodeTestToken = (token: string) => {
  return testJWT.verify(token);
};
```

**No Mocking Required:**
```typescript
// Just use the real service
import { jwtService } from '@/services/jwt';

test('Valid signup returns JWT token', async () => {
  const response = await request(app)
    .post('/api/auth/signup')
    .send({ email: 'alice@example.com', password: 'SecurePass123!' });

  expect(response.status).toBe(201);
  expect(response.body.token).toBeTruthy();

  // Verify token is valid (real JWT verification)
  const decoded = jwtService.verify(response.body.token);
  expect(decoded.email).toBe('alice@example.com');
});
```

---

### Mock Strategy 4: Payment API (Full Mock with Scenarios)

**Dependency:** Stripe payment processing API

**Approach:** Full mock with multiple scenarios (success, failure, timeout)

**Rationale:**
- Cannot charge real credit cards in tests (expensive, unethical)
- Stripe has rate limits (can't run 1000s of tests)
- Payment flows have many edge cases to test (decline, timeout, fraud)
- Stripe provides test mode, but still network latency

**Implementation:**
```typescript
// tests/setup/mocks/stripeService.ts
export const mockStripe = {
  charges: {
    create: jest.fn().mockResolvedValue({
      id: 'ch_test_123',
      status: 'succeeded',
      amount: 1000,
      currency: 'usd'
    })
  },

  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test_456',
      email: 'customer@example.com'
    })
  },

  // Scenario: Card declined
  simulateDecline: () => {
    mockStripe.charges.create.mockRejectedValueOnce({
      type: 'StripeCardError',
      code: 'card_declined',
      message: 'Your card was declined'
    });
  },

  // Scenario: Network timeout
  simulateTimeout: () => {
    mockStripe.charges.create.mockRejectedValueOnce({
      type: 'StripeConnectionError',
      message: 'Network timeout'
    });
  },

  // Scenario: Fraud detection
  simulateFraud: () => {
    mockStripe.charges.create.mockResolvedValueOnce({
      id: 'ch_test_789',
      status: 'failed',
      failure_code: 'fraudulent'
    });
  }
};

jest.mock('stripe', () => {
  return jest.fn(() => mockStripe);
});
```

**Mock Scenarios:**
```typescript
test('Successful payment creates charge', async () => {
  const result = await paymentService.charge({
    amount: 1000,
    currency: 'usd',
    source: 'tok_visa'
  });

  expect(result.status).toBe('succeeded');
  expect(mockStripe.charges.create).toHaveBeenCalledWith({
    amount: 1000,
    currency: 'usd',
    source: 'tok_visa'
  });
});

test('Card declined returns error', async () => {
  mockStripe.simulateDecline();

  await expect(
    paymentService.charge({ amount: 1000, currency: 'usd', source: 'tok_visa' })
  ).rejects.toThrow('Your card was declined');
});

test('Network timeout retries', async () => {
  mockStripe.simulateTimeout();
  mockStripe.charges.create.mockResolvedValueOnce({ status: 'succeeded' }); // Success on retry

  const result = await paymentService.charge({ amount: 1000, currency: 'usd', source: 'tok_visa' });

  expect(result.status).toBe('succeeded');
  expect(mockStripe.charges.create).toHaveBeenCalledTimes(2); // Initial + retry
});
```

---

## Step 4: Plan CI/CD Integration Output

**Complete Output Format:**
```
✓ CI/CD test strategy planned
✓ Execution stages defined:
  ├─ Pre-commit: Unit tests only (< 10s)
  ├─ Pull Request: All tests + coverage (< 3min)
  ├─ Pre-deployment: E2E + smoke tests (< 5min)
  └─ Post-deployment: Smoke tests (< 1min)
✓ Parallelization configured:
  ├─ Unit tests: 100% parallel (all workers)
  ├─ Integration tests: 4 workers with isolated DBs
  └─ E2E tests: Sequential (1 worker)
✓ Coverage requirements: 80% overall, 100% critical paths
✓ Test data management: Global setup for fixtures, beforeEach cleanup
✓ Duration: 156ms
```

**Complete CI/CD Strategy Example:**

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage
        timeout-minutes: 2

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/unit/coverage-final.json
          flags: unit

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate:test
        env:
          TEST_DATABASE_URL: postgres://test:test@localhost:5432/test_db

      - name: Run integration tests
        run: npm run test:integration -- --coverage --maxWorkers=4
        timeout-minutes: 5
        env:
          TEST_DATABASE_URL: postgres://test:test@localhost:5432/test_db

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/integration/coverage-final.json
          flags: integration

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build

      - name: Run database migrations
        run: npm run db:migrate:test
        env:
          TEST_DATABASE_URL: postgres://test:test@localhost:5432/test_db

      - name: Start application
        run: npm run start:test &
        env:
          TEST_DATABASE_URL: postgres://test:test@localhost:5432/test_db
          PORT: 3000

      - name: Wait for application
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Run E2E tests
        run: npm run test:e2e
        timeout-minutes: 10

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

  coverage-check:
    name: Coverage Check
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Download coverage reports
        uses: codecov/codecov-action@v3

      - name: Check coverage thresholds
        run: |
          # Fail if overall coverage < 80%
          COVERAGE=$(jq '.total.statements.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

          # Check critical paths have 100% coverage
          CRITICAL_COVERAGE=$(jq '.["src/services/auth/**/*"].statements.pct' coverage/coverage-summary.json)
          if (( $(echo "$CRITICAL_COVERAGE < 100" | bc -l) )); then
            echo "Critical path coverage $CRITICAL_COVERAGE% is below 100% threshold"
            exit 1
          fi

  test-summary:
    name: Test Summary
    needs: [unit-tests, integration-tests, e2e-tests, coverage-check]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Test results
        run: |
          echo "✅ All tests passed"
          echo "✅ Coverage thresholds met"
          echo "✅ Ready to merge"
```

---

### Pre-commit Hook (Local Development)

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running pre-commit tests..."

# Run unit tests only (fast feedback)
npm run test:unit -- --bail --findRelatedTests

if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Commit aborted."
  exit 1
fi

echo "✅ Unit tests passed. Proceeding with commit."
```

---

### GitLab CI Configuration

**File:** `.gitlab-ci.yml`

```yaml
stages:
  - test
  - coverage
  - deploy

variables:
  POSTGRES_DB: test_db
  POSTGRES_USER: test
  POSTGRES_PASSWORD: test
  TEST_DATABASE_URL: "postgres://test:test@postgres:5432/test_db"

unit-tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run test:unit -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/unit/cobertura-coverage.xml
    paths:
      - coverage/unit/
  coverage: '/Statements\s*:\s*(\d+\.\d+)%/'

integration-tests:
  stage: test
  image: node:18
  services:
    - postgres:15
  script:
    - npm ci
    - npm run db:migrate:test
    - npm run test:integration -- --coverage --maxWorkers=4
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/integration/cobertura-coverage.xml
    paths:
      - coverage/integration/
  coverage: '/Statements\s*:\s*(\d+\.\d+)%/'

e2e-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  services:
    - postgres:15
  script:
    - npm ci
    - npm run build
    - npm run db:migrate:test
    - npm run start:test &
    - npx wait-on http://localhost:3000 --timeout 30000
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 7 days
  allow_failure: false

coverage-check:
  stage: coverage
  image: node:18
  dependencies:
    - unit-tests
    - integration-tests
  script:
    - npm run test:coverage:merge
    - npm run test:coverage:check
  coverage: '/All files\s*\|\s*(\d+\.\d+)/'
  only:
    - merge_requests
    - main
```

---

## Step 5: Calculate Test Summary Output

**Complete Output Format:**
```
✓ Test summary calculated
✓ Total tests: 24 scenarios
  ├─ Unit: 15 tests (62.5%)
  ├─ Integration: 7 tests (29.2%)
  └─ E2E: 2 tests (8.3%)
✓ By priority:
  ├─ P0 (Critical): 8 tests (33.3%) - Must pass before merge
  ├─ P1 (High): 10 tests (41.7%) - Should pass before merge
  └─ P2 (Medium): 6 tests (25.0%) - Can defer if needed
✓ Estimated execution time:
  ├─ Unit: 0.75s (15 × 50ms)
  ├─ Integration: 3.5s (7 × 500ms)
  ├─ E2E: 10s (2 × 5s)
  └─ Total: 14.25s (fast test suite)
✓ Expected coverage:
  ├─ Overall: ~85-90%
  ├─ Critical paths: 100%
  └─ Business logic: 95%
✓ Duration: 45ms
```

---

## Step 6: Generate Test Design Document and Present Summary Output

**Complete Output Format:**
```
✓ Test design document generated
✓ Output file: .claude/quality/assessments/task-006-test-design-20251030.md
✓ Document sections:
  ├─ Test summary (counts, priorities, execution time)
  ├─ Test scenarios by AC (24 scenarios with Given-When-Then)
  ├─ Mock strategies (4 dependencies)
  ├─ CI/CD integration (4 stages)
  └─ Risk-test mapping (6 high-risk areas mapped to tests)
✓ File size: 8,427 bytes
✓ Duration: 123ms
```

**User-Facing Summary:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test Design Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: task-006 - User Signup Implementation
File: .claude/quality/assessments/task-006-test-design-20251030.md

---

### Test Summary

**Total Tests:** 24 scenarios designed
- Unit: 15 (business logic, validation)
- Integration: 7 (API endpoints, database)
- E2E: 2 (complete user journeys)

**Priority Breakdown:**
- 🔴 P0 (Critical): 8 tests - Must pass before merge
- 🟠 P1 (High): 10 tests - Should pass before merge
- 🟡 P2 (Medium): 6 tests - Can defer if needed

**Estimated Time:** 14 seconds total execution (fast suite)

---

### Key Test Scenarios

**Security (P0):**
- SQL injection attempts rejected (TS-002)
- XSS attacks prevented (TS-006)
- Password strength validation enforced (TS-007)
- Rate limiting prevents brute force (TS-008)

**Functionality (P0):**
- Valid signup creates user and returns token (TS-001)
- Duplicate email rejected with 409 (TS-003)
- Email confirmation sent successfully (TS-004)
- Account activation via email link works (TS-005)

**Performance (P1):**
- Signup response < 200ms (TS-012)
- No N+1 queries in user operations (TS-013)
- Concurrent signups handled correctly (TS-014)

**Edge Cases (P2):**
- Unicode emails accepted (TS-018)
- 100-character passwords accepted (TS-019)
- Session timeout handled gracefully (TS-020)

---

### Mock Strategy

**Email Service:** Full mock with success/failure/timeout scenarios
**Database:** Test instance (Postgres) with isolated data per test
**JWT Service:** Real implementation with test secrets
**Rate Limiter:** Partial mock (bypass in tests, verify calls)

---

### CI/CD Integration

**Pre-commit:** Unit tests only (< 10s, blocks commit if fail)
**Pull Request:** All tests + coverage check (< 3min, blocks merge if fail)
**Pre-deployment:** E2E + smoke tests on staging (< 5min, blocks deploy if fail)
**Post-deployment:** Smoke tests only (< 1min, alerts on fail)

**Coverage Requirements:**
- Overall: 80% minimum (blocks merge if below)
- Critical paths (auth): 100% required
- New code: 90% minimum

---

### Risk-Test Mapping

Based on risk profile (task-006-risk-20251029.md), tests address:

- 🔴 Critical Risk (Score 9): Password logging → Security audit test (TS-021, P0)
- 🔴 Critical Risk (Score 9): SQL injection → SQL injection tests (TS-002, TS-009, P0)
- 🟠 High Risk (Score 6): XSS attacks → XSS prevention tests (TS-006, TS-010, P0)
- 🟠 High Risk (Score 6): Duplicate emails → Data integrity test (TS-003, P0)
- 🟠 High Risk (Score 6): N+1 queries → Performance test (TS-013, P1)
- 🟠 High Risk (Score 6): Rate limiting → Brute force test (TS-008, P0)

All critical/high-risk areas have corresponding P0/P1 tests. ✅

---

### Next Steps

1. **Review** full test design document for implementation details
2. **Setup** test environment (test database, mock configurations)
3. **Implement** tests using test-first approach (write test, write code, verify)
4. **Run tests** frequently during development (pre-commit hook)
5. **Verify** all P0 tests pass before marking ready for review

**Test files to create:**
- src/routes/auth/__tests__/signup.integration.test.ts
- src/routes/auth/__tests__/signup-security.integration.test.ts
- src/utils/__tests__/validation.test.ts
- tests/e2e/auth/signup-flow.spec.ts

**Ready to begin test-first implementation? 🚀**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Complete Test Design Document Template

**File:** `.claude/quality/assessments/task-006-test-design-20251030.md`

```markdown
---
task_id: task-006
task_title: User Signup Implementation
test_design_date: 2025-10-30
assessment_mode: pre-implementation
risk_profile_available: true
risk_profile_file: task-006-risk-20251029.md
total_tests: 24
p0_tests: 8
p1_tests: 10
p2_tests: 6
unit_tests: 15
integration_tests: 7
e2e_tests: 2
estimated_execution_time_seconds: 14.25
---

# Test Design: task-006 - User Signup Implementation

**Test Design Date:** 2025-10-30
**Assessment Mode:** Pre-implementation
**Risk Profile:** Available (task-006-risk-20251029.md)

---

## Executive Summary

This test design document specifies **24 test scenarios** across 3 test levels (unit, integration, E2E) with risk-informed prioritization. **8 P0 (critical) tests** must pass before merge, addressing high-risk areas identified in the risk profile. The test suite has an estimated execution time of **14 seconds**, enabling fast feedback loops during development.

**Key Focus Areas:**
- **Security (P0):** SQL injection, XSS, password strength, rate limiting
- **Functionality (P0):** User creation, duplicate detection, email confirmation
- **Performance (P1):** Response time <200ms, no N+1 queries
- **Edge Cases (P2):** Unicode emails, long passwords, concurrent operations

**Mock Strategy:** Email service fully mocked, database uses test instance (Postgres), JWT service uses real implementation with test secrets.

**CI/CD Integration:** Pre-commit hooks run unit tests (<10s), PR pipeline runs all tests with coverage check (<3min), pre-deployment runs E2E tests (<5min).

---

## Test Summary

**Total Tests:** 24 scenarios

**By Level:**
- Unit: 15 tests (62.5%) - Fast, isolated logic tests
- Integration: 7 tests (29.2%) - API and database tests
- E2E: 2 tests (8.3%) - Complete user journey tests

**By Priority:**
- P0 (Critical): 8 tests (33.3%) - Must pass before merge
- P1 (High): 10 tests (41.7%) - Should pass before merge
- P2 (Medium): 6 tests (25.0%) - Can defer if time-constrained

**Estimated Execution Time:**
- Unit: 0.75s (15 × ~50ms average)
- Integration: 3.5s (7 × ~500ms average)
- E2E: 10s (2 × ~5s average)
- **Total: 14.25 seconds** (fast test suite enables TDD)

**Expected Coverage:**
- Overall: ~85-90% (target: 80% minimum)
- Critical paths (auth): 100% (required)
- Business logic: ~95%
- Error handling: ~85%

---

## Test Scenarios by Acceptance Criterion

### AC1: User can signup with valid email/password

#### TS-001: Valid User Signup (P0, Integration)

**Given** the API is running and database is empty
**When** POST /api/auth/signup with valid email/password
**Then** user created, token returned, confirmation email sent

**Priority:** P0 (Critical - core functionality)
**Risk:** Addresses Risk #1 (Auth implementation) - Score 6

**Test File:** `src/routes/auth/__tests__/signup.integration.test.ts`
**Execution Time:** ~350ms

[Full scenario details in templates.md#step-2-example-1]

---

#### TS-002: SQL Injection Prevention (P0, Integration)

**Given** the API is running
**When** POST with SQL injection payload in email
**Then** request rejected, no DB query executed

**Priority:** P0 (Critical - security vulnerability)
**Risk:** Addresses Risk #2 (SQL Injection) - Score 9 (Critical)

**Test File:** `src/routes/auth/__tests__/signup-security.integration.test.ts`
**Execution Time:** ~200ms

[Full scenario details in templates.md#step-2-example-2]

---

[Continue for all 24 test scenarios...]

---

## Mock Strategies

### Email Service (Full Mock)

**Approach:** Replace with jest mock, never send real emails

**Implementation:**
```typescript
// tests/setup/mocks/emailService.ts
export const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'test-123' })
};
```

**Scenarios:** Success, failure, timeout

[Full details in templates.md#step-3-mock-strategy-1]

---

### Database (Test Instance)

**Approach:** Real Postgres with test database, not mocked

**Setup:**
```typescript
export const testDb = new PrismaClient({
  datasources: { db: { url: process.env.TEST_DATABASE_URL } }
});
```

[Full details in templates.md#step-3-mock-strategy-2]

---

## CI/CD Integration

### Test Execution Stages

**Stage 1: Pre-commit (Local)**
- Trigger: Before git commit
- Tests: Unit tests only
- Duration: < 10 seconds
- Failure: Block commit

**Stage 2: Pull Request (CI)**
- Trigger: On PR creation/update
- Tests: All tests (unit + integration + E2E)
- Duration: < 3 minutes
- Failure: Block merge
- Coverage: Minimum 80% overall, 100% critical paths

[Full CI/CD configuration in templates.md#step-4-github-actions]

---

## Risk-Test Mapping

| Risk ID | Risk Description | Score | Test IDs | Priority |
|---------|------------------|-------|----------|----------|
| R1 | SQL Injection | 9 | TS-002, TS-009 | P0 |
| R2 | XSS Attacks | 9 | TS-006, TS-010 | P0 |
| R3 | Password Logging | 9 | TS-021 | P0 |
| R4 | Duplicate Emails | 6 | TS-003 | P0 |
| R5 | N+1 Queries | 6 | TS-013 | P1 |
| R6 | Rate Limiting | 6 | TS-008 | P0 |

All critical/high-risk areas have corresponding P0/P1 tests. ✅

---

## Implementation Guidance

### Test-First Approach

1. **Read test scenario** - Understand requirements
2. **Write test** - Implement test following scenario
3. **Run test** - Verify it fails (red)
4. **Write code** - Implement feature
5. **Run test** - Verify it passes (green)
6. **Refactor** - Improve code quality
7. **Repeat** - Next scenario

### File Organization

```
src/
  routes/
    auth/
      __tests__/
        signup.integration.test.ts       (TS-001, TS-003, TS-004)
        signup-security.integration.test.ts  (TS-002, TS-006, TS-008)
        activation.integration.test.ts    (TS-005)
  utils/
    __tests__/
      validation.test.ts                (TS-004, TS-007, TS-015-TS-020)
tests/
  e2e/
    auth/
      signup-flow.spec.ts               (TS-005, TS-011)
  setup/
    mocks/
      emailService.ts
    database.ts
```

---

## Next Steps

1. ✅ **Review** this test design document
2. ⏭️ **Setup** test environment (test DB, mocks)
3. ⏭️ **Create** test files following file organization
4. ⏭️ **Implement** tests using test-first approach
5. ⏭️ **Verify** all P0 tests pass before review

**Test Coverage Target:** 80% overall, 100% critical paths

**Estimated Implementation Time:** ~12-15 hours (tests + implementation)

---

*Test design completed by BMAD Test Design Skill v2.0*
*Next Review: After implementation or if requirements change*
```

---

## JSON Output Format

**Complete Skill Output Structure:**
```json
{
  "skill": "test-design",
  "version": "2.0",
  "status": "completed",
  "task_id": "task-006",
  "task_title": "User Signup Implementation",
  "test_design_date": "2025-10-30T14:32:15Z",
  "assessment_mode": "pre-implementation",
  "duration_ms": 1389,
  "risk_profile_available": true,
  "risk_profile_file": ".claude/quality/assessments/task-006-risk-20251029.md",
  "test_summary": {
    "total_tests": 24,
    "by_level": {
      "unit": 15,
      "integration": 7,
      "e2e": 2
    },
    "by_priority": {
      "p0": 8,
      "p1": 10,
      "p2": 6
    },
    "estimated_execution_time_seconds": 14.25
  },
  "test_scenarios": [
    {
      "id": "TS-001",
      "title": "Valid User Signup",
      "ac": "AC1",
      "level": "integration",
      "priority": "P0",
      "risk_linkage": {
        "risk_id": "R1",
        "risk_score": 6,
        "risk_description": "Auth implementation complexity"
      },
      "given": "the API is running and database is empty",
      "when": "POST /api/auth/signup with valid email and password",
      "then": [
        "Response status is 201 Created",
        "Response body contains user object",
        "Response body contains JWT token",
        "User record exists in database",
        "Confirmation email queued"
      ],
      "test_data": {
        "valid_email": "alice@example.com",
        "valid_password": "SecurePass123!"
      },
      "dependencies": [
        "Test database (Postgres)",
        "Email service mocked",
        "JWT secret configured"
      ],
      "test_file": "src/routes/auth/__tests__/signup.integration.test.ts",
      "estimated_execution_time_ms": 350
    }
  ],
  "mock_strategies": [
    {
      "dependency": "Email Service",
      "approach": "full_mock",
      "rationale": "Never send real emails, slow and expensive",
      "library": "jest",
      "scenarios": ["success", "failure", "timeout"]
    },
    {
      "dependency": "Database",
      "approach": "test_instance",
      "rationale": "Integration tests need real DB to catch query bugs",
      "library": "prisma",
      "isolation": "delete_all_between_tests"
    }
  ],
  "cicd_integration": {
    "stages": [
      {
        "name": "pre-commit",
        "trigger": "before_git_commit",
        "tests": "unit_only",
        "duration_target_seconds": 10,
        "failure_policy": "block_commit"
      },
      {
        "name": "pull_request",
        "trigger": "pr_creation_or_update",
        "tests": "all",
        "duration_target_seconds": 180,
        "failure_policy": "block_merge",
        "coverage_check": true
      }
    ],
    "parallelization": {
      "unit_tests": "100%",
      "integration_tests": "4_workers",
      "e2e_tests": "sequential"
    },
    "coverage_requirements": {
      "overall_minimum": 80,
      "critical_paths_minimum": 100,
      "new_code_minimum": 90
    }
  },
  "risk_test_mapping": [
    {
      "risk_id": "R2",
      "risk_description": "SQL Injection",
      "risk_score": 9,
      "test_ids": ["TS-002", "TS-009"],
      "test_priority": "P0"
    }
  ],
  "expected_coverage": {
    "overall": "85-90%",
    "critical_paths": "100%",
    "business_logic": "95%",
    "error_handling": "85%"
  },
  "test_design_file": ".claude/quality/assessments/task-006-test-design-20251030.md",
  "telemetry": {
    "event": "skill.test-design.completed",
    "task_id": "task-006",
    "assessment_mode": "pre-implementation",
    "total_tests": 24,
    "p0_tests_count": 8,
    "p1_tests_count": 10,
    "p2_tests_count": 6,
    "unit_tests_count": 15,
    "integration_tests_count": 7,
    "e2e_tests_count": 2,
    "estimated_execution_time_seconds": 14.25,
    "risk_profile_available": true
  }
}
```

---

## Integration Examples

### Integration with Risk Profile Skill

**Workflow:**
```
risk-profile → Identifies high-risk areas with P×I scores
     ↓
test-design → Uses risk scores for test prioritization
     ↓
     Critical risks (score ≥7) → P0 tests (must pass before merge)
     High risks (score 6) → P0/P1 tests (should pass)
     Medium/low risks → P2 tests (nice to have)
```

**Example:**
```markdown
Risk profile identified:
- R1: SQL Injection (Score 9 - Critical)
- R2: XSS Attacks (Score 9 - Critical)
- R3: Duplicate Emails (Score 6 - High)

Test design creates:
- TS-002: SQL injection prevention (P0, addresses R1)
- TS-006: XSS prevention (P0, addresses R2)
- TS-003: Duplicate email rejection (P0, addresses R3)

All high-risk areas have P0 tests. ✅
```

---

### Integration with Trace Requirements Skill

**Workflow:**
```
test-design → Specifies 24 test scenarios mapped to ACs
     ↓
implementation → Implements tests and features
     ↓
trace-requirements → Verifies all ACs have passing tests
     ↓
     Reports coverage gaps if any AC not validated by tests
```

**Example:**
```markdown
Test design specifies:
- AC1: 8 test scenarios (TS-001 through TS-008)
- AC2: 6 test scenarios (TS-009 through TS-014)
- AC3: 4 test scenarios (TS-015 through TS-018)

Trace requirements verifies:
- AC1: 8/8 tests pass ✅
- AC2: 5/6 tests pass ⚠️ (TS-013 failing - N+1 query issue)
- AC3: 4/4 tests pass ✅

Gap identified: TS-013 failing, AC2 not fully validated
```

---

## Configuration Examples

### `.claude/config.yaml`

```yaml
quality:
  # Test coverage targets
  testCoverage:
    overall: 80              # Minimum overall coverage (blocks merge if below)
    criticalPaths: 100       # Critical paths (auth, payment) must have 100%
    newCode: 90              # New code held to higher standard

  # Test execution timeouts
  testTimeouts:
    unit: 5000               # 5 seconds total for all unit tests
    integration: 30000       # 30 seconds total for integration tests
    e2e: 60000               # 60 seconds total for E2E tests

  # Test assessment location
  assessmentLocation: ".claude/quality/assessments"

  # Test design template (optional)
  testDesignTemplate: ".claude/templates/test-design.md"
```

---

### `package.json` Test Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=\\.test\\.(ts|js)$ --coverage",
    "test:integration": "jest --testPathPattern=\\.integration\\.test\\.(ts|js)$ --coverage --runInBand",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "test:ci": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:coverage": "jest --coverage --coverageReporters=text-summary lcov",
    "test:coverage:check": "jest --coverage --coverageThreshold='{\"global\":{\"statements\":80,\"branches\":75,\"functions\":80,\"lines\":80}}'",
    "db:migrate:test": "DATABASE_URL=$TEST_DATABASE_URL prisma migrate deploy"
  }
}
```

---

### `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test matching
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|js)',
    '**/*.(test|spec).(ts|js)'
  ],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThresholds: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    // Critical paths require 100%
    'src/services/auth/**/*.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    }
  },

  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],

  // Module aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Timeouts
  testTimeout: 5000  // 5 seconds per test
};
```

---

### `.github/workflows/test.yml` (Complete Example)

See Step 4 output for complete GitHub Actions workflow with all stages.

---

*Complete templates and output formats for test-design skill*
