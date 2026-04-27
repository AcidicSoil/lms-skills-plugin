# Requirements Elicitation Guide

## Overview

Requirements elicitation is the systematic process of discovering, extracting, and documenting what stakeholders need from a product. Effective elicitation uncovers not just stated requirements, but hidden assumptions, implicit needs, and unstated constraints.

---

## Elicitation Techniques

### Technique 1: Open-Ended Questions

**Purpose:** Explore problem space without constraining responses

**When to Use:**
- Early discovery phase
- Understanding user pain points
- Exploring possibilities

**Question Patterns:**
- "Tell me about..." - Invites storytelling
- "Walk me through..." - Reveals process and workflow
- "What challenges do you face when..." - Uncovers pain points
- "How do you currently..." - Reveals current solutions
- "What would you like to..." - Explores desired outcomes

**Example Dialogue:**
```
PM: "Tell me about how you currently manage your inventory."
User: "Well, I use spreadsheets, but it's a nightmare when we get shipments..."
PM: "Walk me through what happens when a shipment arrives."
User: "I have to manually update 3 different sheets, and if I make a mistake..."
[Reveals pain point: Manual data entry, error-prone, multiple sources]
```

---

### Technique 2: Five Whys

**Purpose:** Get to root cause of problems and true user needs

**When to Use:**
- Understanding why features are requested
- Validating assumptions about user needs
- Prioritizing features by root value

**How it Works:**
Ask "why" five times to drill down from surface request to fundamental need.

**Example:**
```
User: "We need a mobile app."
PM: "Why do you need a mobile app?"
User: "So we can access data on the go."
PM: "Why do you need to access data on the go?"
User: "Because our field technicians need information at customer sites."
PM: "Why do field technicians need information at customer sites?"
User: "To diagnose issues without calling the office."
PM: "Why is calling the office a problem?"
User: "It delays service and frustrates customers."
PM: "Why does that matter?"
User: "Customer satisfaction is our key differentiator."

[Root need: Improve customer satisfaction through faster service]
[Solution: May not need full mobile app - responsive web + offline mode might suffice]
```

---

### Technique 3: User Story Mapping

**Purpose:** Understand user workflows and journey

**When to Use:**
- Mapping end-to-end user experience
- Identifying feature gaps
- Prioritizing by user journey

**How it Works:**
1. Identify user persona
2. Map high-level activities (user journey)
3. Break down into tasks and steps
4. Identify pain points and opportunities
5. Prioritize by journey criticality

**Example:**
```
Persona: Field Technician

Journey: Service Call Response
├─ Receive assignment → [Current pain: Phone call, manual note-taking]
├─ Travel to site → [Opportunity: Route optimization]
├─ Diagnose issue → [Current pain: No access to equipment history]
├─ Perform repair → [Opportunity: Step-by-step guided procedures]
├─ Document work → [Current pain: Paper forms, data re-entry]
└─ Complete billing → [Opportunity: Automatic invoice generation]

Priority: Focus on "Diagnose issue" (highest impact on service time)
```

---

### Technique 4: Assumption Testing

**Purpose:** Surface and validate implicit assumptions

**When to Use:**
- When stakeholders make confident assertions
- When technical feasibility is uncertain
- When user behavior assumptions exist

**How it Works:**
1. Identify assumptions in requirements
2. Classify: Business, Technical, User Behavior
3. Validate through data, research, or prototyping
4. Document validated vs unvalidated assumptions

**Example Assumptions:**
```
STATED: "Users want real-time notifications"

ASSUMPTION BREAKDOWN:
- Assumption 1: Users check app frequently enough to see notifications (User Behavior)
  Validation: Check analytics - do users open app daily? hourly?

- Assumption 2: Real-time is necessary vs hourly/daily batch (Business)
  Validation: What's the cost of delay? Is 1-hour delay acceptable?

- Assumption 3: Our infrastructure can support real-time push (Technical)
  Validation: Talk to engineering - what's the complexity and cost?

RESULT:
- Users open app 2-3x/day on average
- 1-hour delay is acceptable for 80% of use cases
- Real-time push adds 3 weeks to timeline
- DECISION: Start with hourly batch, add real-time for critical alerts only
```

---

## Elicitation by Stakeholder Type

### Product Stakeholders (Business)

**Focus Areas:**
- Business objectives and ROI
- Market positioning and differentiation
- Success metrics and KPIs
- Budget and resource constraints
- Timeline and roadmap

**Key Questions:**
- "What business problem are we solving?"
- "How will we measure success?"
- "What's the expected ROI?"
- "Who are our competitors and how do we differentiate?"
- "What's the acceptable timeline?"

---

### End Users

**Focus Areas:**
- Current workflows and pain points
- Desired outcomes and goals
- Frustrations with current solutions
- User environment and context
- Frequency of use and patterns

**Key Questions:**
- "Walk me through how you do [task] today?"
- "What frustrates you most about the current process?"
- "What would make your job easier?"
- "How often do you need to do this?"
- "What happens if you can't complete this task?"

---

### Technical Stakeholders (Engineering, IT)

**Focus Areas:**
- Technical constraints and dependencies
- Integration requirements
- Performance and scalability needs
- Security and compliance requirements
- Maintenance and operational concerns

**Key Questions:**
- "What technical constraints should we be aware of?"
- "What systems need to integrate with this?"
- "What are the performance requirements?"
- "What security/compliance requirements apply?"
- "What's the operational impact of this?"

---

## Documentation Patterns

### Pattern 1: Problem-Solution Format

```markdown
## Problem
[Describe the user problem clearly and specifically]

## Current Situation
[How users currently solve this problem]

## Pain Points
- [Specific pain point 1]
- [Specific pain point 2]

## Proposed Solution
[High-level solution approach]

## Expected Outcome
[What success looks like]
```

---

### Pattern 2: User Story Format

```markdown
As a [user type],
I want to [do something],
So that [achieve outcome/benefit].

Acceptance Criteria:
- [Specific, testable criterion 1]
- [Specific, testable criterion 2]

Context:
[Additional context, constraints, or considerations]
```

---

### Pattern 3: Job Story Format

```markdown
When [situation/context],
I want to [motivation/goal],
So I can [expected outcome].

Example:
When I arrive at a customer site without internet,
I want to access equipment history offline,
So I can diagnose issues without delay.
```

---

## Common Elicitation Pitfalls

### Pitfall 1: Leading Questions

**Bad:** "You'd want a mobile app for this, right?"
**Good:** "How do you envision accessing this information?"

**Why:** Leading questions bias responses toward a specific answer.

---

### Pitfall 2: Accepting Solutions as Requirements

**Bad:** User says "We need a dashboard" → Implement dashboard
**Good:** User says "We need a dashboard" → "What information do you need to see and why?"

**Why:** Users often propose solutions rather than stating needs. Dig deeper to understand the underlying requirement.

---

### Pitfall 3: Assuming User Expertise

**Bad:** Assume users know technical terms (API, SaaS, etc.)
**Good:** Use simple language and explain technical concepts

**Why:** Users may not have technical background. Meet them where they are.

---

### Pitfall 4: Ignoring Context

**Bad:** Focus only on feature requests
**Good:** Understand user environment, constraints, and workflow

**Why:** Context shapes how features will actually be used.

---

### Pitfall 5: Not Validating Assumptions

**Bad:** "Users obviously want this feature"
**Good:** "Let's test this assumption with 5 users"

**Why:** Assumptions without validation lead to building the wrong thing.

---

## Elicitation Checklist

Before finalizing requirements, verify:

- [ ] Problem clearly defined and validated
- [ ] Root cause identified (not just symptoms)
- [ ] User needs vs wants distinguished
- [ ] Current solutions and workarounds understood
- [ ] Success criteria clearly defined
- [ ] Assumptions explicitly documented
- [ ] Constraints and dependencies identified
- [ ] Stakeholder alignment achieved
- [ ] Requirements specific and measurable
- [ ] Alternative solutions considered

---

## Example: Complete Elicitation Session

**Context:** E-commerce company wants "better search"

**Session Transcript (abbreviated):**

```
PM: "Tell me about the current search experience."
User: "Users complain they can't find products."

PM: "Walk me through a specific example where a user couldn't find a product."
User: "Customer searched for 'running shoes' but we show 'athletic footwear'."

PM: "Why does that happen?"
User: "Our search only matches exact terms, not synonyms."

PM: "How often does this happen?"
User: "About 30% of searches have zero results."

PM: "What happens when users get zero results?"
User: "50% leave the site immediately."

PM: "What have you tried to fix this?"
User: "We manually added some synonyms, but it's overwhelming."

PM: "What would success look like?"
User: "<5% zero-result searches, >80% users find product within 3 searches."
```

**Requirements Extracted:**
```
PROBLEM: 30% of searches return zero results due to exact-match-only search

ROOT CAUSE: No synonym/semantic matching in search algorithm

IMPACT: 50% of users with zero results abandon site (significant revenue loss)

CURRENT SOLUTION: Manual synonym list (not scalable)

SUCCESS METRICS:
- Zero-result rate: 30% → <5%
- Search success rate: <50% → >80% (within 3 searches)
- User retention: Prevent 50% abandonment

REQUIREMENTS:
1. Implement semantic search with synonym matching
2. Support common product variants (plurals, abbreviations, colloquialisms)
3. Learn from user behavior (clicks after searches)
4. Admin interface to add/manage synonyms
5. Analytics dashboard for search performance

ASSUMPTIONS:
- Users willing to scroll through 10-20 results (needs validation)
- Semantic search technically feasible within 4-week timeline
- Current search infrastructure can be extended (vs rewrite)

NEXT STEPS:
- Validate assumptions with engineering
- Prototype with 100 most common search terms
- A/B test with 10% of users
```

---

**Elicitation Guide - Part of create-prd skill**
**Use these techniques to gather comprehensive, validated requirements**
