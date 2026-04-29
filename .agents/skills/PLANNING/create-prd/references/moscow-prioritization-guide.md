# MoSCoW Prioritization Guide

## Overview

MoSCoW is a prioritization method that categorizes features into four categories: **Must have, Should have, Could have, Won't have**. This creates clear scope boundaries and enables data-driven conversations about trade-offs.

---

## The Four Categories

### Must Have (Critical, MVP Blockers)

**Definition:** Without these features, the product doesn't solve the core problem or deliver the primary value proposition.

**Tests:**
- "Can we launch without this?" → NO
- "Does this solve the core user problem?" → YES
- "Is this part of minimum viable product?" → YES

**Examples:**
```
E-commerce site:
✅ Must Have: Product catalog, shopping cart, checkout, payment processing
❌ Not Must Have: Wishlists, product reviews, recommendations

Project management tool:
✅ Must Have: Create tasks, assign to users, mark complete, view task list
❌ Not Must Have: Gantt charts, time tracking, resource allocation
```

**Guidelines:**
- Keep list small (5-10 features max for MVP)
- Every Must Have should directly enable core value prop
- Be ruthless: "nice to have" ≠ "must have"

---

### Should Have (Important, Not Launch Blockers)

**Definition:** Important features that significantly improve the product but aren't required for launch. Can be added in v1.1 or v1.2.

**Tests:**
- "Will users notice if this is missing?" → YES (mildly)
- "Can we work around it temporarily?" → YES
- "Does it improve but not enable core value?" → YES

**Examples:**
```
E-commerce site:
✅ Should Have: Search functionality, filters, product reviews
Reason: Users can browse categories initially; search adds convenience

Project management tool:
✅ Should Have: Email notifications, file attachments, comments
Reason: Users can check app manually; notifications add convenience
```

**Guidelines:**
- Features that enhance UX but don't block core workflow
- Features that reduce friction but have workarounds
- Nice-to-haves that users will appreciate but won't abandon product over

---

### Could Have (Nice-to-Have, Low Priority)

**Definition:** Features that add nice touches but have minimal impact on core value or user satisfaction.

**Tests:**
- "Would this be a pleasant surprise?" → YES
- "Is the effort worth the value?" → MAYBE
- "Can we easily live without this?" → YES

**Examples:**
```
E-commerce site:
✅ Could Have: Dark mode, keyboard shortcuts, advanced filtering

Project management tool:
✅ Could Have: Custom color themes, emoji reactions, task templates
```

**Guidelines:**
- Features that delight but don't drive adoption
- Features that benefit power users, not mainstream
- Features to add when core product is solid
- Often cut or deferred to later versions

---

### Won't Have (Explicitly Out of Scope)

**Definition:** Features that are explicitly excluded for this release. Documenting "Won't Haves" prevents scope creep and manages expectations.

**Reasons for Won't Have:**
1. **Resource Constraints** - Good idea but not enough time/budget
2. **Wrong Audience** - Feature benefits users we're not targeting
3. **Technical Limitations** - Infrastructure can't support it yet
4. **Strategic Reasons** - Conflicts with positioning or business model
5. **Future Roadmap** - Good idea, planned for v2 or v3

**Examples:**
```
E-commerce site (v1):
❌ Won't Have: Multi-vendor marketplace (v2 feature, too complex)
❌ Won't Have: Subscription billing (targeting one-time purchases initially)
❌ Won't Have: International shipping (US-only for v1)

Project management tool (v1):
❌ Won't Have: Real-time collaboration (technical complexity, v2 feature)
❌ Won't Have: Advanced reporting/analytics (not core workflow)
❌ Won't Have: API access (enterprise feature, not targeting developers yet)
```

**Why Document Won't Haves:**
- Sets clear boundaries
- Manages stakeholder expectations
- Prevents "just one more feature" scope creep
- Creates future roadmap visibility

---

## Prioritization Process

### Step 1: List All Features

**Action:** Brain dump every feature idea without filtering.

**Sources:**
- User requests
- Competitive analysis
- Team brainstorming
- Stakeholder wishlist
- Technical debt items

**Format:**
```
Feature List (Unfiltered):
1. User authentication (login/signup)
2. Dashboard with key metrics
3. Create new projects
4. Invite team members
5. Advanced analytics
6. Mobile app
7. Dark mode
8. Export to PDF
... [50+ features is common]
```

---

### Step 2: Apply MoSCoW Categories

**Action:** Categorize each feature using tests above.

**Process:**
1. Start with "Must Have" - be brutal, keep list small
2. Move to "Should Have" - important but not blockers
3. Then "Could Have" - nice additions
4. Finally "Won't Have" - explicit exclusions

**Example:**
```
MUST HAVE (6 features):
1. User authentication (can't have users without accounts)
2. Create projects (core value prop)
3. Create tasks within projects (core value prop)
4. Assign tasks to team members (core workflow)
5. Mark tasks complete (basic workflow)
6. View all tasks (basic visibility)

SHOULD HAVE (8 features):
7. Dashboard (helpful overview, but can start in tasks view)
8. Invite team members (can manually share accounts initially)
9. Email notifications (users can check app directly)
10. File attachments (can use links to Dropbox/Google Drive)
11. Comments on tasks (can use task description initially)
12. Due dates (can note in task description)
13. Search (can scroll through tasks initially)
14. Filters (nice to have, not critical)

COULD HAVE (10 features):
15. Advanced analytics (nice data, not core workflow)
16. Dark mode (cosmetic preference)
17. Keyboard shortcuts (power user feature)
18. Custom fields (advanced customization)
19. Templates (helpful but can copy existing projects)
20. Time tracking (useful but not core PM tool)
21. Gantt charts (nice visualization, not critical)
22. Calendar view (alternative view, not essential)
23. Recurring tasks (edge case)
24. Task dependencies (advanced feature)

WON'T HAVE (v1):
25. Mobile app (too much effort for v1, defer to v2)
26. Real-time collaboration (complex websockets, defer to v2)
27. API access (not targeting developers in v1)
28. SSO/SAML (enterprise feature, not targeting enterprise)
29. Advanced permissions (simple owner/member model for v1)
30. Integrations (Zapier, Slack, etc. - defer to v1.1)
```

---

### Step 3: Validate with Stakeholders

**Action:** Review categories with users, stakeholders, and team.

**Questions to Ask:**
- "Can you operate without [Should Have]?" → Must be YES
- "Is [Must Have] truly required for launch?" → Must be YES
- "Do [Won't Haves] belong in future roadmap?" → Capture for v2

**Red Flags:**
- ⚠️ Too many Must Haves (>10) → Re-evaluate, be more ruthless
- ⚠️ No Won't Haves → Not being strategic enough about scope
- ⚠️ Stakeholder insists everything is Must Have → Escalate, use data

---

## Prioritization Techniques

### Technique 1: Value vs Effort Matrix

**Visual Framework:**
```
High Value
    │
    │  [Quick Wins]      [Major Projects]
    │  Do Second         Do First (if Must/Should)
    │  SHOULD/COULD      MUST/SHOULD
────┼─────────────────────────────────
    │
    │  [Fill-Ins]        [Money Pits]
    │  Do Last          Avoid/Won't Have
    │  COULD            WON'T
Low Value
    │
Low Effort ──────────────── High Effort
```

**How to Use:**
1. Plot each feature on matrix
2. Prioritize high-value, low-effort (quick wins) within Should/Could
3. Defer/avoid low-value, high-effort (money pits)

---

### Technique 2: Kano Model

**Categories:**
- **Basic Expectations** - Assumed by users (Must Have)
- **Performance Features** - More is better (Should Have)
- **Delighters** - Unexpected bonuses (Could Have)

**Example:**
```
E-commerce Site:

BASIC (Must):
- Product images load
- Checkout works
- Payment secure
→ Users won't praise these, but will complain if missing

PERFORMANCE (Should):
- Fast load times
- Accurate search
- Good mobile experience
→ Better performance = higher satisfaction

DELIGHTERS (Could):
- AR product preview
- Personal style recommendations
- One-click reorder
→ Unexpected features that surprise and delight
```

---

### Technique 3: User Story Mapping

Map features to user journey to prioritize by workflow criticality.

**Example:**
```
User Journey: First-Time User

1. Sign Up → MUST (can't use product without account)
2. Create First Project → MUST (core value prop)
3. Invite Team → SHOULD (can delay to day 2)
4. Customize Settings → COULD (can use defaults initially)

User Journey: Daily User

1. See Updated Tasks → MUST (core workflow)
2. Mark Tasks Complete → MUST (core workflow)
3. Add New Tasks → MUST (core workflow)
4. Receive Notifications → SHOULD (can check manually)
5. View Analytics → COULD (nice overview, not critical)
```

Prioritize features that enable critical user journeys.

---

## Common Prioritization Mistakes

### Mistake 1: Everything is Must Have

**Symptom:** 20+ Must Have features
**Problem:** Not truly identifying MVP
**Solution:** Apply "Launch Without It" test ruthlessly

**Reality Check:**
- If everything is Must Have, nothing is Must Have
- True MVP typically has 5-10 Must Haves, not 30

---

### Mistake 2: Confusing User Wants with Needs

**Bad:** User says "I want a mobile app" → Mobile app is Must Have
**Good:** User says "I want a mobile app" → Dig deeper: Why? What's the need?
→ Need: Access on the go → Solution: Responsive web (Should Have)

**Principle:** Users know their problems, not always the best solutions.

---

### Mistake 3: Ignoring Technical Debt

**Problem:** Only prioritizing user-facing features
**Solution:** Include technical Must Haves

**Example:**
```
MUST HAVE (Technical):
- Authentication system (can't have users without auth)
- Database schema (can't store data)
- Basic error handling (can't launch broken product)
- Security basics (can't risk user data)

These aren't sexy but are truly Must Have.
```

---

### Mistake 4: Not Timeboxing Must Haves

**Problem:** Must Haves that take 12 months
**Solution:** Right-size scope to realistic timeline

**Principle:**
- If Must Haves take >3-6 months, re-scope
- Break into phases (v1.0, v1.1, v1.2)
- Find minimum viable version of each Must Have

**Example:**
```
Original Must Have: "Advanced analytics dashboard"
→ Too big (3-4 weeks of work)

Right-Sized Must Have: "Basic metrics on homepage"
→ Achievable (3-4 days of work)
→ Advanced analytics becomes Should Have for v1.1
```

---

## MoSCoW Checklist

Before finalizing prioritization:

- [ ] Must Haves are truly required for launch (apply "Launch Without It" test)
- [ ] Must Have list is realistic (<10 features for MVP)
- [ ] Should Haves are important but have workarounds
- [ ] Could Haves are nice-to-haves with low priority
- [ ] Won't Haves are explicitly documented (no ambiguity)
- [ ] Stakeholders aligned on categories
- [ ] Timeframe realistic for Must/Should Haves
- [ ] Technical Must Haves included (not just user-facing)
- [ ] Prioritization validated with users or data
- [ ] Plan for revisiting (MoSCoW is not set in stone)

---

## Example: Complete MoSCoW for SaaS Project Management Tool

```markdown
## Feature Prioritization (MoSCoW)

### MUST HAVE (MVP Launch Blockers) - 8 features
1. **User Authentication** - Login/signup with email
2. **Create Project** - Basic project creation with name/description
3. **Create Tasks** - Add tasks to projects with title/description
4. **Assign Tasks** - Assign tasks to team members
5. **Task Status** - Mark tasks as To Do/In Progress/Done
6. **Task List View** - See all tasks in a project
7. **Invite Team Members** - Email invite to join workspace
8. **Basic Permissions** - Owner vs Member roles

**Timeline:** 6-8 weeks for Must Haves

---

### SHOULD HAVE (Important, v1.1-1.2) - 10 features
9. **Dashboard** - Overview of all projects and tasks
10. **Email Notifications** - Task assigned, due date, mentions
11. **Due Dates** - Set and display task deadlines
12. **Search** - Search across all tasks and projects
13. **Filters** - Filter tasks by assignee, status, due date
14. **Comments** - Comment threads on tasks
15. **File Attachments** - Attach files to tasks
16. **Task Priority** - Mark tasks as High/Medium/Low priority
17. **Task Labels/Tags** - Categorize tasks with custom tags
18. **Activity Feed** - See recent activity across workspace

**Timeline:** 3-4 weeks post-launch

---

### COULD HAVE (Nice-to-Have, v1.3+) - 12 features
19. **Dark Mode** - UI theme preference
20. **Keyboard Shortcuts** - Power user efficiency
21. **Custom Fields** - Add custom data to tasks
22. **Task Templates** - Reusable task lists
23. **Time Tracking** - Log time spent on tasks
24. **Gantt Charts** - Timeline view of tasks
25. **Calendar View** - Calendar integration
26. **Recurring Tasks** - Auto-create tasks on schedule
27. **Task Dependencies** - Link dependent tasks
28. **Advanced Analytics** - Charts, reports, insights
29. **Markdown Support** - Rich text in descriptions
30. **Bulk Operations** - Multi-select and bulk edit

**Timeline:** 2-3 months post-launch, based on usage data

---

### WON'T HAVE (Explicitly Out of Scope for v1) - 6 features
31. **Mobile Apps** - Defer to v2 (focus on responsive web first)
32. **Real-Time Collaboration** - Defer to v2 (technical complexity)
33. **API Access** - Not targeting developers in v1
34. **SSO/SAML** - Enterprise feature, not targeting enterprise yet
35. **Advanced Permissions** - Complex role-based access (defer to v2)
36. **Integrations (Slack, Zapier)** - Defer to v1.1+

**Roadmap:** Plan for v2 (6-12 months post-launch)
```

---

**MoSCoW Prioritization Guide - Part of create-prd skill**
**Use this method to create clear, defensible feature prioritization**
