# Validation & Approval Guide

## Purpose

Validate task specification completeness, save task file, and obtain user approval.

---

## Step 6: Validate Task Specification Completeness

### Validation Checklist

**1. Required Sections Present**

All task specs must have these sections:

- [ ] **Status** (initially "Draft")
- [ ] **Objective** (user story format)
- [ ] **Acceptance Criteria** (2-5 specific criteria)
- [ ] **Context** (embedded technical details)
- [ ] **Tasks / Subtasks** (3-15 tasks with subtasks)
- [ ] **Implementation Record** (empty placeholder for implementation skill)

**Example Structure:**
```markdown
## Status
Draft

## Objective
As a new user, I want to create an account with email and password,
so that I can access personalized features.

## Acceptance Criteria
1. User can signup with valid email/password
2. Password security requirements enforced
3. Duplicate emails prevented
4. Confirmation email sent

## Context
[Embedded technical details with source references]

## Tasks / Subtasks
[Sequential task breakdown]

## Implementation Record
[To be populated during implementation]
```

---

**2. Context Completeness**

Context section must include (where applicable):

- [ ] **Previous Insights**
  - Patterns from previous tasks
  - Lessons learned
  - Established conventions

- [ ] **Data Models** (for backend tasks)
  - Schema definitions
  - Validation rules
  - Relationships
  - [Source: architecture doc reference]

- [ ] **API Specifications** (for backend tasks)
  - Endpoint paths and methods
  - Request/response formats
  - Authentication requirements
  - Error codes
  - [Source: architecture doc reference]

- [ ] **Component Specifications** (for frontend tasks)
  - Component location
  - Props and state
  - Event handlers
  - Styling approach
  - [Source: architecture doc reference]

- [ ] **File Locations**
  - Exact paths for new files
  - Existing files to modify
  - Test file locations

- [ ] **Testing Requirements**
  - Test types required (unit, integration, E2E)
  - Coverage targets
  - Mock strategies

- [ ] **Technical Constraints**
  - Performance targets
  - Security requirements
  - Reliability considerations

**ALL context must have [Source: filename#section] references**

---

**3. Task Quality**

Tasks must meet quality standards:

- [ ] **Count:** 3-15 tasks (not too few, not too many)
- [ ] **Order:** Logical implementation sequence (data → logic → API → UI → integration)
- [ ] **Subtasks:** Each task has 3-8 clear subtasks
- [ ] **AC Links:** Each task links to relevant acceptance criteria (AC: X, Y)
- [ ] **Tests:** Each task includes test writing step
- [ ] **Validation:** Each task ends with validation checkpoint
- [ ] **Specificity:** File paths are exact, not generic

**Example Quality Task:**
```markdown
- [ ] Task 2: Implement signup service logic (AC: 1, 3)
  - [ ] Create SignupService class in src/services/auth/signup.service.ts
  - [ ] Implement createUser method with password hashing (bcrypt, cost 12)
  - [ ] Add duplicate email check with database query before insertion
  - [ ] Implement transaction support for atomic user creation
  - [ ] Add error handling for database failures and constraint violations
  - [ ] Write unit tests for service methods (8 test cases: success, duplicate, errors)
  - [ ] Validate: All edge cases covered, transactions work correctly
```

**Quality Indicators:**
- ✅ Exact file path (src/services/auth/signup.service.ts)
- ✅ Specific details (bcrypt cost 12)
- ✅ Clear subtasks (7 steps)
- ✅ Links to ACs (AC: 1, 3)
- ✅ Test writing included
- ✅ Validation checkpoint

---

**4. Source References**

All technical claims must be sourced:

❌ **No sources:**
```markdown
### Data Models

User model:
- id: UUID
- email: string
- password: string (hashed)
```

✅ **With sources:**
```markdown
### Data Models
[Source: docs/architecture/data-models.md#user]

User model:
- id: UUID v4
- email: string (unique, RFC 5322 format, lowercase)
- password: string (bcrypt hash, cost 12, never returned in API)
- createdAt: Date
- updatedAt: Date
```

**Check:**
- [ ] Every data model has [Source: ...]
- [ ] Every API spec has [Source: ...]
- [ ] Every component spec has [Source: ...]
- [ ] Every technical constraint has [Source: ...]
- [ ] If no source exists, note: "No guidance in architecture docs"

---

### Validation Failures

**If validation fails, halt and present issues:**

```markdown
⚠️ TASK SPECIFICATION INCOMPLETE

**Issues Found:**

1. **Missing Context:**
   - Data model schema not included
   - API endpoint specification missing
   - Testing requirements not specified

2. **Task Quality Issues:**
   - Task 1 has no validation checkpoint
   - Task 3 has generic file path ("create service file")
   - Task 5 missing test writing step

3. **Source Reference Issues:**
   - Data model claims have no [Source: ...] references
   - API spec mentions bcrypt but no source for cost factor

**Cannot Proceed:**
Task spec is not ready for implementation without complete context.

**Action Required:**
- Add missing context sections
- Add validation checkpoints to tasks
- Make file paths specific
- Add source references for all technical claims

**Options:**
1. Fix issues and re-validate
2. Proceed with known limitations (document in task spec)
3. Gather more architecture information first
```

---

## Step 7: Save Task Specification and Get User Approval

### Save Task File

**Generate file path:**
```
{taskLocation}/{task_id}-{slug}.md
```

**Example:**
```
.claude/tasks/task-006-user-signup.md
```

**Save using bmad-commands:**
```bash
python .claude/skills/bmad-commands/scripts/write_file.py \
  --path .claude/tasks/task-006-user-signup.md \
  --content "{task_spec_content}" \
  --output json
```

**Verify write success:**
```json
{
  "success": true,
  "outputs": {
    "path": ".claude/tasks/task-006-user-signup.md",
    "bytes_written": 12543
  }
}
```

---

### Present Summary to User

**Summary Format:**

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Task Specification Created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Task ID:** task-006-user-signup
**File:** .claude/tasks/task-006-user-signup.md
**Status:** Draft
**Priority:** P1 (High)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Objective

**User Story:**
As a new user, I want to create an account with email and password,
so that I can access personalized features.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Acceptance Criteria

1. User can signup with valid email (RFC 5322 format) and password (8+ chars, complexity)
2. Password security requirements enforced (bcrypt cost 12)
3. Duplicate emails prevented (return 409 Conflict error)
4. Confirmation email sent with verification link

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Task Breakdown

**Total:** 5 tasks, 35 subtasks

1. **Task 1:** Create user data model (AC: 1, 2)
   - 6 subtasks: interface, schema, migration, tests, validation

2. **Task 2:** Implement signup service logic (AC: 1, 3)
   - 7 subtasks: service, hashing, duplicate check, transactions, tests, validation

3. **Task 3:** Create signup API endpoint (AC: 1, 4)
   - 8 subtasks: route, validation, service connection, errors, rate limiting, tests, validation

4. **Task 4:** Add email verification (AC: 4)
   - 6 subtasks: email service, template, token, retry logic, tests, validation

5. **Task 5:** Comprehensive testing and documentation (AC: all)
   - 8 subtasks: E2E tests, coverage verification, documentation, logging, validation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Context Embedded

**Previous Insights:**
- Auth middleware pattern from task-003 [Source: task-003#completion-notes]
- bcrypt cost 12 performance (~150ms) [Source: task-003#completion-notes]
- Email service mock pattern [Source: task-003#completion-notes]

**Data Models:**
- User interface with UUID, email, password, timestamps [Source: docs/architecture/data-models.md#user]
- Zod validation schema for email (RFC 5322) and password (8+ chars, complexity) [Source: docs/standards.md#validation]
- Database migration with unique email constraint [Source: docs/architecture/data-models.md#user]

**API Specifications:**
- POST /api/auth/signup endpoint [Source: docs/architecture/rest-api-spec.md#auth]
- Request: {email, password} [Source: docs/architecture/rest-api-spec.md#auth]
- Response: {user, token} [Source: docs/architecture/rest-api-spec.md#auth]
- Errors: 400 (validation), 409 (duplicate), 500 (server) [Source: docs/architecture/rest-api-spec.md#errors]

**File Locations:**
- src/types/user.ts (interface)
- src/schemas/user.schema.ts (validation)
- src/services/auth/signup.service.ts (logic)
- src/routes/auth/signup.ts (endpoint)
- Exact paths specified for all 11 new files

**Testing Requirements:**
- Unit tests: Services and schemas (≥80% coverage) [Source: docs/standards.md#testing]
- Integration tests: API endpoints [Source: docs/standards.md#testing]
- E2E tests: Critical signup flow [Source: docs/standards.md#testing]
- Total estimated: 27 tests

**Technical Constraints:**
- Performance: API response <200ms [Source: docs/standards.md#performance]
- Security: bcrypt cost 12, input validation, rate limiting [Source: docs/standards.md#security]
- Reliability: Transactions, retry logic, error handling [Source: docs/standards.md#reliability]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Ready for Implementation

**All context embedded** - Developer will NOT need to read architecture docs
**All paths specified** - Exact file locations provided
**All patterns referenced** - Previous learnings included
**All ACs linked** - Each task maps to acceptance criteria
**Validation included** - Every task has validation checkpoint

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Approve this task specification? (yes/no)**

If yes:
- Status will be updated to "Approved"
- Task ready for execute-task skill
- Implementation can begin immediately

If no:
- Provide feedback for revisions
- Task remains "Draft"
- Restart from appropriate step
```

---

### User Response Handling

**1. User Approves (yes)**

Action:
- Update task status from "Draft" to "Approved"
- Save updated file
- Provide handoff instructions

Output:
```markdown
✅ Task Specification Approved

**File:** .claude/tasks/task-006-user-signup.md
**Status:** Approved → Ready for implementation

**Next Steps:**
1. Use execute-task skill with this task file
2. Command: execute-task task-006-user-signup.md
3. Implementation will follow sequential task breakdown

**No architecture lookup needed** - All context embedded in task file
```

---

**2. User Requests Changes**

Action:
- Record user feedback
- Determine which step to restart from
- Maintain task as "Draft"

Output:
```markdown
📝 Revisions Requested

**User Feedback:**
[User's specific concerns or changes]

**Action Plan:**
- [Specific changes to make based on feedback]
- Restart from Step [N]
- Re-validate before re-presenting

**Task remains Draft** until approved
```

Examples:
```
User: "Need OAuth integration too"
→ Restart from Step 1 (gather OAuth requirements)

User: "These file paths don't match our structure"
→ Restart from Step 3 (re-analyze with correct paths)

User: "Missing performance requirements"
→ Restart from Step 2 (load additional standards)
```

---

**3. User Rejects/Defers**

Action:
- Keep task as "Draft"
- Clarify reason
- Provide options

Output:
```markdown
❌ Task Specification Deferred

**Reason:**
[User's reason for deferring]

**Options:**
1. **Defer:** Keep as Draft, revisit later
2. **Cancel:** Delete draft task file
3. **Revise:** Provide specific changes needed

**Task Status:** Draft (not approved)
```

---

## Completion

**Task specification is complete when:**

- [ ] All required sections present
- [ ] All context embedded with source references
- [ ] 3-15 sequential tasks with validation checkpoints
- [ ] All tasks link to acceptance criteria
- [ ] File saved successfully
- [ ] User has approved
- [ ] Status updated to "Approved"

**Output:**
```json
{
  "task_file": ".claude/tasks/task-006-user-signup.md",
  "task_id": "task-006",
  "task_count": 5,
  "status": "Approved"
}
```

---

## Halt Conditions

**1. File Write Fails**

```markdown
⚠️ FILE WRITE FAILED

**Error:** Cannot write to .claude/tasks/task-006-user-signup.md

**Possible Causes:**
- Directory doesn't exist
- Permission denied
- Disk full

**Action Required:**
1. Check directory exists
2. Check write permissions
3. Create directory if needed
4. Retry save
```

---

**2. User Requests Major Revisions**

```markdown
⚠️ MAJOR REVISIONS REQUESTED

**User Feedback:**
[Significant changes needed]

**Action:**
Restart from [Step N] to address feedback

**Options:**
1. Restart from Step 1 (requirement changes)
2. Restart from Step 2 (architecture changes)
3. Restart from Step 4 (task breakdown changes)
```

---

## Quick Reference

**Validation Checklist:**
- [ ] Required sections present
- [ ] Context complete with sources
- [ ] 3-15 tasks with quality subtasks
- [ ] All ACs linked
- [ ] Tests and validation included

**Save Task:**
```bash
write_file.py --path {taskLocation}/{task_id}.md --content "{spec}"
```

**Approval Flow:**
1. Present summary
2. Get user response (yes/no)
3. If yes: Update to "Approved"
4. If no: Record feedback, revise

**Status Progression:**
- Draft (initial)
- Approved (user confirmed)
- InProgress (during implementation)
- Review (after implementation)
- Done (after quality review)

---

*Part of create-task-spec skill - Planning Suite*
