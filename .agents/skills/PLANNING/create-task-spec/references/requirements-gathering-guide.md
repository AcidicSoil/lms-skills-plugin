# Requirements Gathering Guide

## Purpose

Clarify requirements, define acceptance criteria, and establish clear objectives for task specifications.

---

## Step 1: Gather Requirements from User

### Initial Questions

**1. What needs to be implemented?**

Ask:
- What is the feature or functionality?
- What problem does this solve?
- Who will use this feature?
- What is the expected behavior?

**Good responses:**
```
"Users need to create accounts with email and password so they can access personalized features."
```

**Clarification needed:**
```
"We need authentication."
→ Ask: What type? (Login, signup, password reset, OAuth?)
→ Ask: For which user types? (Admin, regular users, both?)
```

---

**2. What defines "done"?**

Ask:
- What are the testable outcomes?
- How will we know this works correctly?
- What are the edge cases?
- Are there any constraints or limits?

**Good responses:**
```
1. User can signup with valid email and password
2. Duplicate emails are prevented
3. Password meets security requirements (8+ chars, complexity)
4. Confirmation email is sent
```

**Clarification needed:**
```
"It should work correctly."
→ Ask: What does "correctly" mean specifically?
→ Ask: What are the success criteria?
→ Ask: What error cases should be handled?
```

---

**3. Priority and complexity?**

Ask:
- How urgent is this?
- How critical for the business?
- Rough complexity estimate?
- Related to larger feature/epic?

**Priority Levels:**
- **P0 (Critical):** Blocking release, production issue, security vulnerability
- **P1 (High):** Important feature, major customer request, significant business value
- **P2 (Medium):** Valuable but not urgent, enhancement, improvement
- **P3 (Low):** Nice-to-have, future consideration, minor improvement

**Complexity Estimates:**
- **Simple:** 1-3 tasks, few dependencies, straightforward implementation
- **Medium:** 4-8 tasks, some dependencies, moderate complexity
- **Complex:** 9-15 tasks, many dependencies, significant complexity
- **Too Complex:** >15 tasks → should be broken into multiple task specs

---

### Requirement Clarification Techniques

**Technique 1: User Story Format**

Restate requirement as:
```
As a [role],
I want [action],
So that [benefit]
```

**Example:**
```
As a new user,
I want to create an account with email and password,
So that I can access personalized features and save my preferences.
```

**Benefits:**
- Clear user perspective
- Explicit action
- Defined value/benefit

---

**Technique 2: Acceptance Criteria (Given-When-Then)**

Format criteria as:
```
Given [precondition],
When [action],
Then [expected result]
```

**Example:**
```
**AC1: Valid Signup**
Given I am on the signup page,
When I enter a valid email and secure password,
Then my account is created and I receive a confirmation email.

**AC2: Duplicate Prevention**
Given a user already exists with email "test@example.com",
When I try to signup with the same email,
Then I receive a "Email already exists" error.
```

**Benefits:**
- Testable outcomes
- Clear preconditions
- Specific expected results

---

**Technique 3: Five Whys**

Ask "why" repeatedly to understand root need:

```
Requirement: "We need user signup"
Why? → "So users can create accounts"
Why? → "So they can save their data"
Why? → "So they return to the app"
Why? → "So we increase retention"
Why? → "So we grow the business"
```

**Result:** Understand business value, not just feature request

---

**Technique 4: Edge Cases Exploration**

Ask about boundaries and exceptions:

**Questions:**
- What happens if user enters invalid data?
- What if the email already exists?
- What if the email service is down?
- What if the database is unavailable?
- What about special characters in inputs?
- What about very long inputs?
- What about concurrent signups?

**Example edge cases:**
```
1. Invalid email format (no @, missing domain)
2. Weak password (too short, no complexity)
3. Email already registered
4. Special characters in name
5. Very long password (>1000 chars)
6. Two users signing up simultaneously with same email
7. Email service timeout
8. Database connection failure
```

---

### Confirmation and Approval

**Present summary to user:**

```markdown
## Requirement Summary

**Feature:** User Signup with Email/Password

**User Story:**
As a new user,
I want to create an account with email and password,
So that I can access personalized features.

**Acceptance Criteria:**
1. User can signup with valid email (RFC 5322 format) and password (8+ chars, complexity required)
2. Duplicate emails are prevented (return 409 Conflict error)
3. Password is securely hashed (bcrypt, cost 12)
4. Confirmation email is sent with verification link
5. Invalid inputs return clear validation errors

**Priority:** P1 (High) - Critical for user onboarding
**Complexity:** Medium (5 tasks estimated)
**Related:** Epic: User Authentication

**Edge Cases Identified:**
- Invalid email formats
- Weak passwords
- Duplicate email handling
- Email service failures
- Database connection issues

**Ready to proceed with detailed planning? (yes/no)**
```

**User must confirm before proceeding**

---

## Halt Conditions

### 1. Unclear Requirement

**Indicators:**
- User cannot explain what feature does
- "I'll know it when I see it" responses
- Conflicting statements
- Vague descriptions

**Action:**
```markdown
⚠️ UNCLEAR REQUIREMENT

The requirement is not sufficiently defined to create a task specification.

**Issues:**
- [List specific ambiguities]

**Need from User:**
- [What information is needed]

**Options:**
1. User provides clearer requirement description
2. Schedule requirements workshop
3. Create prototype first for feedback
```

---

### 2. Ambiguous Acceptance Criteria

**Indicators:**
- ACs use vague terms ("works well", "fast enough")
- No testable outcomes
- Missing edge cases
- Contradictory criteria

**Action:**
```markdown
⚠️ AMBIGUOUS ACCEPTANCE CRITERIA

Cannot create task spec without specific, testable acceptance criteria.

**Issues:**
- AC2: "System should be fast" → What is acceptable response time?
- AC3: "User experience should be good" → What specific UX requirements?

**Need from User:**
- Specific metrics or thresholds
- Testable outcomes
- Clear success criteria
```

---

### 3. User Does Not Approve

**Indicators:**
- User says "not quite right"
- User requests major changes
- User wants to rethink approach

**Action:**
```markdown
⚠️ USER DID NOT APPROVE PROCEEDING

**User Feedback:**
[User's concerns or requested changes]

**Options:**
1. Clarify requirement based on feedback → Restart Step 1
2. Break into smaller features → Create multiple task specs
3. Defer until more information available
```

---

## Best Practices

**1. Active Listening**
- Repeat back what you heard
- Ask clarifying questions
- Don't assume technical details

**2. Focus on "What" and "Why", Not "How"**
- What needs to be built (outcome)
- Why it's needed (value)
- NOT how to implement (that comes later)

**3. Be Specific**
- ❌ "Fast response times"
- ✅ "API response time <200ms"

- ❌ "Good user experience"
- ✅ "Form validation feedback within 100ms"

**4. Write Testable ACs**
- ❌ "System should handle errors gracefully"
- ✅ "When database is unavailable, return 503 with error message"

**5. Consider Non-Functional Requirements**
- Performance (response times, throughput)
- Security (authentication, authorization, encryption)
- Reliability (error handling, retries, fallbacks)
- Scalability (concurrent users, data volume)
- Accessibility (WCAG compliance, keyboard navigation)

---

## Templates

### User Story Template

```markdown
**Title:** [Brief feature name]

**User Story:**
As a [role],
I want [action],
So that [benefit]

**Acceptance Criteria:**
1. [Specific, testable criterion]
2. [Specific, testable criterion]
3. [Specific, testable criterion]
...

**Priority:** P0 | P1 | P2 | P3
**Complexity:** Simple | Medium | Complex
**Related:** [Epic/Feature name if applicable]
```

### Acceptance Criterion Template

```markdown
**AC[N]: [Brief name]**

**Given** [precondition],
**When** [action],
**Then** [expected result]

**Edge Cases:**
- [Edge case 1]
- [Edge case 2]
```

---

## Quick Reference

**Questions to Ask:**
1. What needs to be implemented?
2. What defines "done"?
3. What are the edge cases?
4. What is the priority?
5. How complex is this?

**Good ACs are:**
- Specific (not vague)
- Testable (can verify)
- Valuable (user benefit)
- Independent (not overlapping)
- Complete (covers requirements)

**Halt When:**
- Requirement unclear
- ACs ambiguous
- User doesn't approve

---

*Part of create-task-spec skill - Planning Suite*
