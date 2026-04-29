# Documentation Templates

Template structures for generated architecture, standards, and patterns documentation.

## Architecture.md Template

```markdown
# {Project Name} - Architecture Documentation

> **Generated:** {YYYY-MM-DD} by document-project skill
> **Overall Confidence:** {confidence}%
> **Review Status:** ⚠️ Requires human review

---

## Overview

**Project Type:** {Backend API | Frontend App | Full-Stack | Library | Monorepo}
**Primary Language:** {TypeScript | Python | Go | Java | Rust} ({percentage}%)
**Architecture Style:** {Layered | Clean | Hexagonal | Microservices}
**Codebase Size:** {lines} lines across {files} files

{Brief description of project purpose - 2-3 sentences}

---

## Technology Stack

### Runtime & Language

**Runtime:**
- {Runtime Name}: {version}
- {Language}: {version}

**Build Tools:**
- {Tool}: {version} ({purpose})

### Backend Framework

**Primary Framework:**
- {Framework Name}: {version}
- Type: {Web framework | API framework | etc.}

**Key Libraries:**
- {library1}: {version} - {purpose}
- {library2}: {version} - {purpose}
- {library3}: {version} - {purpose}

### Database & ORM

**Database:**
- Type: {PostgreSQL | MySQL | MongoDB | etc.}
- ORM: {Prisma | TypeORM | SQLAlchemy | etc.} {version}

**Migrations:**
- Location: {path}
- Tool: {migration tool}

### Testing

**Test Framework:**
- {Jest | Pytest | JUnit | etc.}: {version}

**Test Libraries:**
- {library1}: {version} - {purpose}
- {library2}: {version} - {purpose}

**Test Organization:** {Separate tests/ | Co-located | Spec files}

**Current Coverage:** {percentage}% (measured)

**Confidence:** {High | Medium | Low} ({confidence}%)

---

## Project Structure

```
{Directory tree visualization}
```

### Directory Organization

**Pattern:** {By-Feature | By-Type | Hybrid}

{Detailed directory descriptions}

**Key Directories:**
- `{dir1}/` - {description} ({file_count} files, ~{line_count} lines)
- `{dir2}/` - {description} ({file_count} files, ~{line_count} lines)
- `{dir3}/` - {description} ({file_count} files, ~{line_count} lines)

### Module Dependency Graph

{Mermaid diagram or description of module relationships}

**Core Modules:**
- {module1} - {description}
- {module2} - {description}

**Peripheral Modules:**
- {module1} - {description}
- {module2} - {description}

**Circular Dependencies:** {count found} {list if any}

**Confidence:** {High | Medium | Low} ({confidence}%)

---

## Data Models

### {Model1Name}

**Fields:**
- `{field1}`: {type} - {description} {(primary key | unique | etc.)}
- `{field2}`: {type} - {description}
- `{field3}`: {type} - {description}

**Validation Rules:**
- {field1}: {validation rules}
- {field2}: {validation rules}

**Relationships:**
- {Model1} {hasMany | hasOne | belongsTo} {Model2} ({type of relationship})

**Source Files:**
- {file1} ({type: schema | interface | validation})
- {file2} ({type})

### {Model2Name}

{...similar structure...}

**Entity Relationship Diagram:**

{Mermaid ERD diagram}

**Confidence:** {High | Medium | Low} ({confidence}%)

---

## API Specifications

### Base Configuration

**Base URL:** `{/api | /v1 | etc.}`
**Content Type:** `application/json`
**API Version:** {version if applicable}

### Authentication

**Type:** {JWT | Session-based | API Key | OAuth}
**Header:** `{header-name}: {format}`
**Token Expiry:** {duration}
**Refresh Token:** {Yes/No}

{Additional auth details}

### Endpoints

#### {Category 1} Endpoints

**{METHOD} {path}**
- **Description:** {description}
- **Request Body:**
  ```json
  {request_example}
  ```
- **Response (2XX):**
  ```json
  {response_example}
  ```
- **Response (4XX):**
  ```json
  {error_response_example}
  ```
- **Authentication:** {Required | Optional | Not required}
- **Source:** {file_path}

{Repeat for other endpoints...}

### Response Formats

**Success Response:**
```json
{success_format}
```

**Error Response:**
```json
{error_format}
```

**Status Codes Used:**
- `200` - {description}
- `201` - {description}
- `400` - {description}
- `401` - {description}
- `404` - {description}
- `500` - {description}

### Middleware

**Detected Middleware:**
- {middleware1} - {purpose} (location: {file})
- {middleware2} - {purpose} (location: {file})

**Rate Limiting:** {Detected/Not detected}

**Confidence:** {High | Medium | Low} ({confidence}%)

---

## Architecture Patterns

{Description of overall architectural approach}

### Layered Architecture

{Diagram showing layers}

**Layers:**
1. **{Layer1 Name}** (`{directory}/`)
   - Responsibilities: {responsibilities}
   - Dependencies: {dependencies}

2. **{Layer2 Name}** (`{directory}/`)
   - Responsibilities: {responsibilities}
   - Dependencies: {dependencies}

3. **{Layer3 Name}** (`{directory}/`)
   - Responsibilities: {responsibilities}
   - Dependencies: {dependencies}

**Data Flow:**
{Description of request/response flow through layers}

**Confidence:** {High | Medium | Low} ({confidence}%)

---

## Deployment & Infrastructure

⚠️ **Note:** Deployment architecture not detected from codebase. Human review required.

**Detected Configuration:**
- Environment variables: {list key vars from .env.example}
- Docker: {Detected/Not detected}
- CI/CD: {Detected configuration files}

---

## Human Review Required

The following sections have {medium/low} confidence and should be reviewed by a human:

### High Priority

- [ ] {Item 1} (Confidence: {confidence}%)
- [ ] {Item 2} (Confidence: {confidence}%)

### Medium Priority

- [ ] {Item 1} (Confidence: {confidence}%)
- [ ] {Item 2} (Confidence: {confidence}%)

### Low Priority

- [ ] {Item 1} (Confidence: {confidence}%)
- [ ] {Item 2} (Confidence: {confidence}%)

---

## Appendix

### Analysis Metadata

**Analysis Date:** {YYYY-MM-DD HH:MM:SS}
**Analysis Duration:** {duration}
**Files Analyzed:** {count}
**Lines Analyzed:** {count}
**Overall Confidence:** {percentage}%

### Source Files Analyzed

{List of key source files analyzed}

---

*This documentation was automatically generated by the document-project skill.
Last updated: {YYYY-MM-DD}*
```

---

## Standards.md Template

```markdown
# {Project Name} - Development Standards

> **Generated:** {YYYY-MM-DD} by document-project skill
> **Overall Confidence:** {confidence}%
> **Review Status:** ⚠️ Requires human review

Standards discovered through codebase analysis. Consistency percentages indicate how uniformly each standard is applied.

---

## Language & Code Style

### TypeScript Configuration

**Strict Mode:** {Enabled/Disabled}
**Target:** {ES2022 | ES2020 | etc.}
**Module System:** {ESNext | CommonJS}

**Key Compiler Options:**
- `noImplicitAny`: {true/false}
- `strictNullChecks`: {true/false}
- `esModuleInterop`: {true/false}

**Source:** `tsconfig.json`

### Code Formatting

**Indentation:** {2 spaces | 4 spaces | tabs}
**Quotes:** {Single | Double}
**Semicolons:** {Required | Optional}
**Line Length:** {100 | 120 | 80} characters
**Trailing Commas:** {Yes | No}

**Source:** `.prettierrc`, `.eslintrc`, code analysis
**Consistency:** {percentage}%

---

## Naming Conventions

**Variables & Functions:** {camelCase | snake_case}
**Classes & Interfaces:** {PascalCase}
**Constants:** {UPPER_SNAKE_CASE | SCREAMING_SNAKE_CASE}
**Files:** {kebab-case | camelCase | PascalCase}.{ext}
**Test Files:** {*.test.ts | *.spec.ts | *_test.ts}

**Examples:**
- Variable: `userName`, `userEmail`
- Function: `getUserById`, `createUser`
- Class: `UserService`, `AuthController`
- Constant: `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`
- File: `user-service.ts`, `auth.controller.ts`

**Source:** Code analysis
**Consistency:** {percentage}%

---

## Security Standards

### Password Security

**Hashing Algorithm:** {bcrypt | argon2 | etc.}
**Cost Factor:** {12 | 10 | etc.}
**Source:** {file_path}
**Consistency:** {percentage}% (all password operations use same algorithm)

**Standard:**
```typescript
// Always hash passwords with bcrypt cost factor 12
const hashedPassword = await bcrypt.hash(password, 12);
```

### Input Validation

**Library:** {Zod | Joi | express-validator | etc.}
**Location:** {path_pattern}
**Pattern:** Validate at {route handler | middleware | service layer}

**Consistency:** {percentage}% ({x}/{y} endpoints have validation)

**Standard:**
```typescript
// Validate all user inputs at route handler
router.post('/users', validate(userSchema), createUserHandler);
```

### Authentication

**Type:** {JWT | Session | API Key}
**Token Storage:** {localStorage | httpOnly cookie | etc.}
**Token Expiry:** {duration}

**Standard:**
- All protected routes must check authentication
- Tokens must be validated on every request
- Never expose token secrets in code

---

## Testing Standards

### Test Coverage

**Current Coverage:** {percentage}% (measured)
**Inferred Target:** {percentage}% (based on PR patterns | config)
**Minimum Enforced:** {percentage | None} (no coverage gate detected)

### Test Organization

**Structure:** {Separate tests/ directory | Co-located with source}
**Naming:** {*.test.ts | *.spec.ts}
**Framework:** {Jest | Mocha | Pytest | etc.}

### Test Structure

**Pattern:**
```typescript
describe('Feature', () => {
  describe('Scenario', () => {
    it('should do something', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Mocking:**
- Library: {Jest | Sinon | unittest.mock}
- Pattern: {Mock external dependencies, real implementations for internal}
- Test data: {Factories in tests/factories/ | Inline test data}

**Consistency:** {percentage}%

---

## Error Handling

### Error Classes

**Custom Errors Defined:**
- `AppError` - Base application error
- `ValidationError` - Input validation failures
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission failures

**Source:** {file_path}

### Error Handling Pattern

**Standard:**
```typescript
try {
  // operation
} catch (error) {
  logger.error('Error:', error);
  throw new AppError(500, 'Internal server error');
}
```

**Rules:**
- Always log errors with context
- Never expose stack traces to clients
- Use appropriate HTTP status codes
- Include error codes for client handling

**Consistency:** {percentage}%

---

## Logging

### Library

**Logger:** {winston | pino | bunyan | etc.}
**Version:** {version}

### Log Levels

**Used:** {error, warn, info, debug | etc.}
**Configuration:** {file_path or "environment-based"}

### Log Format

**Format:** {JSON structured logging | Text}
**Fields:** {timestamp, level, message, ...metadata}

**Standard:**
```typescript
logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date()
});
```

**Rules:**
- Never log passwords or tokens
- Always include context (user ID, request ID, etc.)
- Use appropriate log levels
- Structure logs for easy parsing

**Consistency:** {percentage}%

---

## Performance Standards

### Database Queries

**ORM:** {Prisma | TypeORM | etc.}

**Standards Detected:**
- {Use connection pooling}
- {Eager load relationships when needed}
- {Use indexes for frequently queried fields}

**Source:** Code analysis
**Consistency:** {percentage}%

### Caching

**Caching Detected:** {Yes/No}
**Library:** {Redis | node-cache | etc. | Not detected}

**Standard:** {If detected, describe caching pattern}

**Confidence:** {Low | Medium | High}

---

## API Design Standards

### Endpoint Naming

**Pattern:** {RESTful | RPC-style | GraphQL}
**Resource Naming:** {Plural nouns | Singular nouns}
**Versioning:** {/v1/ prefix | Not detected}

**Examples:**
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

**Consistency:** {percentage}%

### Response Format

**Standard Format:**
```json
{
  "data": {...},
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

**Error Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": ["Detail 1", "Detail 2"]
}
```

**Consistency:** {percentage}%

---

## Code Quality Standards

### Linting

**Linter:** {ESLint | Pylint | etc.}
**Configuration:** {file_path}
**Key Rules:** {list key rules}

### Code Reviews

**Process:** ⚠️ Not detected from codebase (add manually)

**Recommended Standards:**
- All code changes require PR review
- At least 1 approval required
- Tests must pass before merge

---

## Documentation Standards

**API Documentation:** {Swagger/OpenAPI | JSDoc | None detected}
**Code Comments:** {Detected standard: JSDoc | Docstrings | Inline only}
**README:** {Present | Needs update}

**Standard:**
- Public APIs must have documentation comments
- Complex logic should have inline comments
- README must be kept up-to-date

---

## Human Review Recommendations

The following standards have low confidence or inconsistencies:

- [ ] {Standard 1} - {percentage}% consistency (review needed)
- [ ] {Standard 2} - Not detected (add manually)

---

*This documentation was automatically generated by the document-project skill.
Last updated: {YYYY-MM-DD}*
```

---

## Patterns.md Template

```markdown
# {Project Name} - Design Patterns & Conventions

> **Generated:** {YYYY-MM-DD} by document-project skill
> **Overall Confidence:** {confidence}%

Common design patterns and architectural conventions discovered in the codebase.

---

## Architectural Patterns

### {Pattern Name} (e.g., Layered Architecture)

{Brief description}

**Implementation:**
{Diagram or description}

**Benefits:**
- {Benefit 1}
- {Benefit 2}

**Consistency:** {percentage}%

---

## Design Patterns

### {Pattern 1 Name} (e.g., Repository Pattern)

{Description of pattern and purpose}

**Implementation:**
```{language}
{Code example showing pattern structure}
```

**Usage:**
- All database operations go through repositories
- Services depend on repository interfaces
- Enables easy testing with mocks

**Examples in Codebase:**
- `{file1}` - {description}
- `{file2}` - {description}

**When to Use:**
- {Use case 1}
- {Use case 2}

**Consistency:** {percentage}% ({x}/{y} data access operations use this pattern)

---

{Repeat for each detected pattern...}

---

## Common Conventions

### File Organization

{Description of how files are organized}

### Module Exports

**Pattern:**
```{language}
{Example export pattern}
```

**Consistency:** {percentage}%

### Async/Await vs Promises

**Preferred:** {async/await | Promises}
**Consistency:** {percentage}%

---

## Anti-Patterns Detected

### {Anti-Pattern Name} (e.g., God Objects)

**Description:** {What makes this an anti-pattern}

**Occurrences:**
- {file1} - {class/function name} ({lines} lines)
- {file2} - {class/function name} ({lines} lines)

**Recommendation:** {How to refactor}

---

*This documentation was automatically generated by the document-project skill.
Last updated: {YYYY-MM-DD}*
```

---

## Review Checklist Template

```markdown
# Documentation Review Checklist

**Project:** {Project Name}
**Generated:** {YYYY-MM-DD}
**Overall Confidence:** {percentage}%

Complete this checklist to validate and improve generated documentation.

---

## High Priority Review Items

These items have low confidence or are critical for accuracy:

- [ ] **{Item 1}** (Confidence: {confidence}%)
      - Current: {what was detected}
      - Action needed: {what to verify/add}
      - File to update: {docs/architecture.md section X}

- [ ] **{Item 2}** (Confidence: {confidence}%)
      - Current: {what was detected}
      - Action needed: {what to verify/add}
      - File to update: {file and section}

---

## Medium Priority Review Items

These items should be verified but are less critical:

- [ ] **{Item 1}** (Confidence: {confidence}%)
- [ ] **{Item 2}** (Confidence: {confidence}%)

---

## Low Priority Review Items

Nice-to-have improvements:

- [ ] **{Item 1}**
- [ ] **{Item 2}**

---

## Review Sign-Off

**Reviewer:** ___________________
**Date:** ___________________
**Status:** ⬜ Approved / ⬜ Needs Revision

**Notes:**

---
```
