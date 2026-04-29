# Scope Management Guide

## Overview

Scope management is the art of defining what's in and out of scope for a product, and defending those boundaries against scope creep. This guide provides strategies for managing stakeholder expectations and preventing feature bloat.

---

## Understanding Scope Creep

### What is Scope Creep?

**Definition:** Uncontrolled expansion of product scope without adjusting timeline, resources, or priorities.

**Symptoms:**
- "Just one more feature" requests after PRD finalized
- Must Have list grows from 8 to 20 features
- Timeline slips repeatedly
- Team burnout from constant additions
- MVP becomes "Maximum Viable Product"

**Cost of Scope Creep:**
- Delayed launch (miss market window)
- Budget overruns
- Team morale damage
- Product quality suffers (trying to do too much)
- Market learns and adapts (competitors catch up)

---

### Root Causes of Scope Creep

#### Cause 1: Unclear Success Criteria

**Problem:** No agreement on what "done" means

**Example:**
```
Stakeholder: "We need a dashboard"
[Builds basic dashboard]
Stakeholder: "This isn't what I meant, we need charts, exports, filters..."
```

**Solution:** Define acceptance criteria upfront
```
Dashboard (Must Have):
- Acceptance Criteria:
  ✓ Show 5 key metrics (revenue, users, retention, churn, NPS)
  ✓ Update real-time
  ✓ Responsive (works on mobile)

Dashboard Advanced Features (Should Have - v1.1):
- Custom date ranges
- Export to PDF
- Advanced filtering
```

---

#### Cause 2: Stakeholder FOMO (Fear of Missing Out)

**Problem:** "Competitor X has this feature, we need it too!"

**Example:**
```
Stakeholder: "I saw [competitor] has dark mode. We need that too!"
Reality: Dark mode is nice-to-have, not differentiator
```

**Solution:** Differentiation > Feature Parity
```
Response: "Dark mode is a Could Have (v1.2+). Our differentiation is [X], which [competitor] doesn't have. We'll ship faster by focusing on our unique value."
```

---

#### Cause 3: "While We're At It" Syndrome

**Problem:** Adding features because they seem easy

**Example:**
```
Engineer: "While building login, I can add social login (Google, Facebook)"
PM: "Sure, sounds easy!"
[2 weeks later: OAuth complexity, testing edge cases, support burden]
```

**Solution:** Stick to Must Haves only
```
Response: "Social login is a Should Have (v1.1). Let's ship email/password MVP first, validate need for social login with users."
```

---

#### Cause 4: Design Iteration Expansion

**Problem:** Design explorations become feature requests

**Example:**
```
Designer: "I explored some advanced filtering options in the mockups"
Stakeholder: "These look great! Let's include them."
PM: "Those are explorations, not v1 features..."
Stakeholder: "But they're already designed!"
```

**Solution:** Separate explorations from commitments
```
Label mockups: "v1 Features" vs "Future Explorations"
Communicate: "Design explores possibilities. We implement priorities."
```

---

## Scope Defense Strategies

### Strategy 1: The MoSCoW Shield

**Use MoSCoW categories as forcing function**

**Response to "Just Add This" Requests:**
```
"Where does this fit in MoSCoW?"

If Must Have → Replace something else (fixed scope)
If Should Have → Add to v1.1 backlog
If Could Have → Add to future roadmap
If Won't Have → Explain why it's excluded
```

**Example:**
```
Request: "Can we add CSV export?"

PM: "Export is valuable. Let's categorize:
- Is this required for launch? (Must Have test) → NO
- Would users significantly miss it? (Should Have test) → YES
- Decision: Should Have for v1.1 (3 weeks post-launch)"

Document in PRD Won't Have (v1) section with plan for v1.1.
```

---

### Strategy 2: The Cost-Benefit Analysis

**Make trade-offs visible**

**Template:**
```
Feature Request: [Feature Name]
Estimated Effort: [Time in weeks]
Benefit: [User value / business impact]
Opportunity Cost: [What we won't do if we do this]

Trade-off:
If we add [Feature], we will:
✓ Gain: [Benefit]
✗ Lose: [Delay feature Y by 2 weeks, miss launch date]

Decision: [Approve / Defer / Reject]
```

**Example:**
```
Feature Request: Dark Mode
Estimated Effort: 1.5 weeks (theme system, testing all screens)
Benefit: Nice-to-have for some users (15% request in surveys)
Opportunity Cost: Delays launch by 1.5 weeks OR cuts another Should Have

Trade-off:
If we add Dark Mode, we will:
✓ Gain: Please 15% of users who prefer dark UI
✗ Lose: Delay launch 1.5 weeks (miss Q2 deadline)

Decision: DEFER to v1.2 (low priority, high cost)
```

---

### Strategy 3: The MVP Litmus Test

**Every Must Have passes this test:**

**Questions:**
1. **Can we launch without this?** → Must be NO
2. **Does this solve the core user problem?** → Must be YES
3. **Will lack of this feature cause users to abandon product?** → Must be YES

**Example:**
```
Feature: Advanced Analytics Dashboard
1. Can we launch without this? → YES (simple metrics dashboard sufficient)
2. Does this solve core problem? → NO (core is project management, not analytics)
3. Will users abandon without this? → NO (nice to have, not critical)

Verdict: NOT a Must Have → Move to Should Have (v1.1)
```

---

### Strategy 4: The Phased Roadmap

**Show future, don't commit to v1**

**Roadmap Visual:**
```
v1.0 (Launch) - 8 weeks
└─ 5-8 Must Have features
└─ Launch: [Date]

v1.1 (First Iteration) - 4 weeks
└─ 5-7 Should Have features
└─ Launch: +3 weeks post-v1.0

v1.2+ (Future Enhancements)
└─ Could Have features
└─ Based on user feedback and data

v2.0 (Major Update)
└─ Won't Have features reconsidered
└─ Timeline: 6-12 months post-launch
```

**Benefit:** Stakeholders see their features on roadmap, just not in v1

---

### Strategy 5: The Data-Driven Deflection

**Use data to prioritize, not opinions**

**Response Template:**
```
"Let's validate this assumption with data."

Options:
1. User research (talk to 10 users)
2. Competitor analysis (do competitors have this?)
3. Analytics (if we have an existing product)
4. Survey (quick validation)
5. Prototype test (build quick mockup, test with users)

If data supports → Consider adding
If data doesn't support → Defer or reject
```

**Example:**
```
Request: "We need real-time collaboration (like Google Docs)"

PM: "Let's validate:
- Survey: How often do multiple users need simultaneous editing?
- Research: Talk to 10 users about their workflow
- Analytics: (if we have prototype) How many concurrent users per project?

Result (after research):
- 5% of users have concurrent editing needs
- 95% work async (review/comment is sufficient)
- Decision: Real-time collaboration is Won't Have (v1), async collaboration is Must Have"
```

---

## Stakeholder Management Techniques

### Technique 1: The Priority Negotiation

**When stakeholder insists everything is Must Have:**

**Framework:**
```
"I hear that all these features are important. Help me prioritize:

If we could only ship 3 features by [launch date], which 3 would you choose?"

[They pick 3]

"Great! Those are our Must Haves. The rest are Should/Could Haves for v1.1+"
```

**Force Ranking Exercise:**
```
Give stakeholder list of 15 features.
Ask: "Rank these 1-15 by importance."

Result:
- Top 5 → Must Have (consider)
- 6-10 → Should Have (v1.1)
- 11-15 → Could Have (future)
```

---

### Technique 2: The Prototype Clarification

**When requirements are vague:**

**Process:**
```
1. Build quick mockup/prototype (1-2 days)
2. Share with stakeholder
3. Stakeholder: "This is great, but..." [reveals true requirements]
4. Iterate on prototype (cheaper than code)
5. Finalize requirements once stakeholder happy with prototype
```

**Benefit:** Prevents building wrong thing, aligns expectations early

---

### Technique 3: The "Yes, And" Technique

**Turn rejection into roadmap addition:**

**Bad Response:**
```
Stakeholder: "We need feature X"
PM: "No, that's out of scope."
[Stakeholder feels dismissed]
```

**Good Response:**
```
Stakeholder: "We need feature X"
PM: "Yes, that's valuable! Let's add it to the v1.1 roadmap (3 weeks post-launch). For v1, we're focusing on [Must Haves] to hit the [launch date]. Does that work?"
[Stakeholder feels heard, feature captured, scope protected]
```

---

### Technique 4: The Executive Escalation

**When stakeholder won't budge:**

**Escalation Framework:**
```
1. Document the disagreement
   - Stakeholder request: [X]
   - PM recommendation: [Y]
   - Rationale: [Data, user research, trade-offs]

2. Present both options with trade-offs
   - Option A (Stakeholder): Pros, cons, timeline, risk
   - Option B (PM): Pros, cons, timeline, risk

3. Escalate to decision-maker (CPO, CEO)

4. Abide by decision (even if you disagree)
```

**Important:** Escalate rarely, only for critical disagreements

---

## Common Scope Negotiation Scenarios

### Scenario 1: The Sales Promise

**Situation:** Sales team promised feature to close deal

**Example:**
```
Sales: "I told [Enterprise Customer] we have SSO. When can we ship?"
PM: "SSO is a v2 feature (6 months out). It's not on v1 roadmap."
Sales: "But I already sold it!"
```

**Response:**
```
1. Validate the promise (talk to customer, review contract)
2. Assess impact (is deal contingent on SSO?)
3. Calculate cost (how much eng effort to add SSO?)
4. Present options:
   - Option A: Delay v1 launch by 4 weeks, add SSO
   - Option B: Ship v1 on time, add SSO in v1.5 (3 months), give customer discount for wait
   - Option C: Walk away from deal (if cost > revenue)

5. Executive decision required
```

---

### Scenario 2: The Competitive Threat

**Situation:** Competitor launches feature, stakeholder panics

**Example:**
```
Stakeholder: "Competitor X just launched [Feature]! We need to match them NOW!"
PM: "That's a Should Have on our roadmap for v1.1..."
Stakeholder: "We can't wait! We'll lose customers!"
```

**Response:**
```
1. Assess threat (is this actually impacting us?)
   - Talk to sales: Are we losing deals over this?
   - Talk to customers: Is this feature requested?
   - Check analytics: Is this causing churn?

2. Reality check:
   - If real threat (customers leaving) → Reprioritize
   - If perceived threat (FOMO) → Stick to plan

3. Consider:
   - Can we ship 80% solution faster (MVP version of feature)?
   - Can we message our differentiation better (we have X, they don't)?
```

---

### Scenario 3: The Scope Creep Bug

**Situation:** "Quick fix" turns into major feature

**Example:**
```
Engineer: "I found a bug in the login flow"
PM: "OK, fix it"
Engineer: "To fix it properly, I need to refactor auth, add password reset, improve validation..."
[1-day fix becomes 2-week project]
```

**Response:**
```
1. Separate bug fix from enhancements:
   - Bug Fix: Band-aid solution (1 day) → Ship now
   - Proper Fix: Refactor auth (2 weeks) → Schedule for v1.1

2. Document technical debt:
   - Add to Tech Debt backlog
   - Prioritize against features
   - Don't auto-commit to "perfect" solution

3. Ship imperfect but working solution
```

---

## Scope Management Checklist

Before finalizing scope:

- [ ] Must Have list limited to 5-10 features
- [ ] Every Must Have passes MVP Litmus Test
- [ ] Should/Could Haves documented for future
- [ ] Won't Haves explicitly called out
- [ ] Stakeholder alignment achieved
- [ ] Trade-offs understood and accepted
- [ ] Timeline realistic for Must Haves only
- [ ] Acceptance criteria defined for Must Haves
- [ ] Roadmap shows future (v1.1, v1.2)
- [ ] Scope change process defined

---

## Red Flags (Scope Creep Warning Signs)

Watch for these warning signs:

- ⚠️ Must Have list growing over time (8 → 15 → 25)
- ⚠️ Launch date keeps slipping ("just 2 more weeks")
- ⚠️ New "critical" features discovered weekly
- ⚠️ No features ever get cut or deferred
- ⚠️ Team working overtime regularly
- ⚠️ "Quick win" features taking weeks
- ⚠️ No one can explain what MVP means anymore
- ⚠️ Every stakeholder has "just one more thing"

**If you see 3+ red flags → Call scope review meeting, reset priorities**

---

## Scope Management Templates

### Template 1: Feature Request Response

```
Feature Request: [Feature Name]
Requested By: [Name]
Date: [Date]

ASSESSMENT:
- Problem it solves: [Problem statement]
- User impact: [High / Medium / Low]
- Engineering effort: [X weeks]
- MoSCoW category: [Must / Should / Could / Won't]

DECISION:
- [ ] Add to v1.0 (Must Have) - requires removing: [Feature Y]
- [ ] Add to v1.1 (Should Have) - target: [Date]
- [ ] Add to backlog (Could Have) - prioritize later
- [ ] Decline (Won't Have) - reason: [Reason]

Communicated to requester: [Date]
```

---

### Template 2: Scope Change Request

```
SCOPE CHANGE REQUEST

Change: [What's being added/removed/changed]
Rationale: [Why this change is needed]
Impact:
- Timeline: [Add/remove X weeks]
- Resources: [Additional resources needed]
- Trade-offs: [What won't get done]

APPROVAL REQUIRED:
- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Key Stakeholders

Status: [Pending / Approved / Rejected]
```

---

### Template 3: Weekly Scope Health Check

```
SCOPE HEALTH CHECK - Week [X]

Must Haves Status:
- [Feature 1]: On track ✅
- [Feature 2]: At risk ⚠️ (reason: [X])
- [Feature 3]: Blocked ❌ (blocker: [Y])

New Requests This Week: [Count]
- Added to v1.0: [Count] (requires approval)
- Added to v1.1: [Count]
- Declined: [Count]

Launch Date: [Date]
- On track? [Yes / No]
- Risk level: [Low / Medium / High]

Action Items:
- [Action 1]
- [Action 2]
```

---

## Key Principles Summary

1. **Ruthlessly Prioritize** - Not everything can be Must Have
2. **Make Trade-offs Visible** - Show cost of every addition
3. **Use Data, Not Opinions** - Validate assumptions
4. **Phase the Roadmap** - v1 → v1.1 → v1.2
5. **Protect the Timeline** - Scope or timeline, pick one
6. **Say "Yes, And"** - Accept ideas, schedule appropriately
7. **Document Won't Haves** - Explicit exclusions prevent creep
8. **Trust the Process** - MoSCoW exists for this reason

---

**Scope Management Guide - Part of create-prd skill**
**Use these strategies to defend scope and manage stakeholder expectations**
