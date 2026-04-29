---
name: roadmap-planner
description: Product roadmap planning and release management. Use when creating strategic product roadmaps, planning releases, estimating timelines, managing dependencies, or defining milestones.
license: Apache 2.0
---

# Product Roadmap Planning

Strategic product roadmap creation, release planning, timeline estimation, and dependency management for product development.

## When to Use This Skill

Use this skill when:
- Creating strategic product roadmaps
- Planning releases and milestones
- Estimating project timelines
- Identifying and managing dependencies
- Capacity planning and resource allocation
- Scenario planning (best case, worst case)
- Stakeholder roadmap communication
- Release strategy definition

## Core Concepts

### Roadmap Types

**Now-Next-Later:**
- Best for agile teams
- High uncertainty environments
- Fast-changing markets
- Focus on outcomes over dates

**Quarterly:**
- Traditional organizations
- Budget alignment
- External commitments
- Clear deadlines

**Theme-Based:**
- Strategic focus
- Outcome-oriented
- Flexible scope
- Executive communication

**Feature-Based:**
- Customer-facing
- Marketing alignment
- Release-specific
- Feature commitments

### Strategic Alignment

**Vision → Strategy → Roadmap → Backlog**

```
Vision (3-5 years)
  ↓
Strategy (1-2 years)
  ↓
Roadmap (6-12 months)
  ↓
Backlog (current sprint)
```

## Roadmap Creation Process

### Step 1: Define Strategic Context
```markdown
## Vision
Where are we going in 3-5 years?

## Strategy
How will we get there?

## Business Goals
What are we trying to achieve this year?

## Success Metrics
How will we measure success?
```

### Step 2: Identify Themes
**Theme Categories:**
- Growth (acquisition, activation)
- Engagement (retention, usage)
- Monetization (revenue, conversion)
- Efficiency (cost reduction, automation)
- Compliance (regulatory, security)

**Example Themes:**
```
Q1-Q2: Foundation
- Platform modernization
- Technical debt reduction
- Core infrastructure

Q3-Q4: Growth
- User acquisition features
- Viral mechanisms
- Partner integrations
```

### Step 3: Break Down into Epics
```
Theme: User Acquisition
├── Epic: Referral Program
├── Epic: Social Sharing
├── Epic: Onboarding Optimization
└── Epic: SEO Improvements
```

### Step 4: Estimate Effort
**T-Shirt Sizing:**
- XS: < 1 week
- S: 1-2 weeks
- M: 2-4 weeks
- L: 1-2 months
- XL: 2-3 months
- XXL: > 3 months (break down)

**Story Points:**
- Use team velocity
- Calculate from historical data
- Adjust for team changes

### Step 5: Sequence and Prioritize
**Dependencies First:**
- Infrastructure before features
- Platform before applications
- Backend before frontend
- Core before nice-to-have

**Value-Based:**
- High value, low effort (quick wins)
- High value, high effort (major projects)
- Low value, low effort (fill-ins)
- Low value, high effort (avoid)

### Step 6: Create Timeline
**Capacity Planning:**
```
Available Capacity = Team Size × Working Days × Focus Factor

Focus Factor: 0.6-0.7 (accounts for meetings, interruptions)

Example:
5 person team × 60 days × 0.65 = 195 person-days per quarter
```

**Timeline Calculation:**
```
Timeline = Total Effort / Team Capacity

Example:
500 story points total
Team velocity: 50 points/sprint
Timeline: 500/50 = 10 sprints = 5 months
```

## Dependency Management

### Dependency Types
| Type | Description | Example |
|------|-------------|---------|
| **Internal** | Within team/organization | API before frontend |
| **External** | Third-party dependencies | Payment gateway integration |
| **Cross-team** | Other teams | Shared service updates |
| **Regulatory** | Compliance requirements | GDPR implementation |

### Dependency Mapping
```markdown
## Dependency: Payment Gateway Integration

**Type**: External
**Owner**: Stripe/PayPal
**Impact**: High (blocks checkout feature)
**Timeline**: 4-6 weeks for approval
**Risk**: Medium (vendor dependency)
**Mitigation**: Start application early, have backup provider

**Dependent Work**:
- Checkout feature (blocked until approved)
- Refund system (can start in parallel)
- Admin dashboard (can start in parallel)
```

### Critical Path Analysis
1. List all work items
2. Map dependencies
3. Calculate path lengths
4. Identify longest path (critical)
5. Focus on critical path items
6. Monitor for delays

## Release Planning

### Release Strategy
**Types of Releases:**

**Time-Based:**
- Fixed release dates
- Scope varies
- Good for marketing alignment
- Example: Quarterly releases

**Feature-Based:**
- Release when features complete
- Variable dates
- Good for continuous delivery
- Example: Feature flags

**Hybrid:**
- Fixed windows with flexible scope
- Best of both approaches
- Most common approach

### Release Checklist
```markdown
## Pre-Release
- [ ] Features complete and tested
- [ ] Documentation updated
- [ ] Support team trained
- [ ] Marketing materials ready
- [ ] Rollback plan documented

## Release Day
- [ ] Deploy to production
- [ ] Smoke tests passing
- [ ] Monitoring active
- [ ] Team on standby
- [ ] Communication sent

## Post-Release
- [ ] Monitor for issues
- [ ] Collect feedback
- [ ] Analyze metrics
- [ ] Retrospective conducted
- [ ] Lessons documented
```

### Rollback Planning
```markdown
## Rollback Triggers
- Critical bug affecting > 10% of users
- Performance degradation > 50%
- Data corruption detected
- Security vulnerability found

## Rollback Process
1. Decision by incident commander
2. Communicate to stakeholders
3. Execute rollback procedure
4. Verify system stability
5. Post-mortem analysis

## Rollback Testing
- Test rollback procedure quarterly
- Document recovery time objective (RTO)
- Ensure data consistency
```

## Timeline Estimation

### Three-Point Estimation
```
Expected Value = (Optimistic + 4 × Most Likely + Pessimistic) / 6
Standard Deviation = (Pessimistic - Optimistic) / 6

Example:
Optimistic: 8 weeks
Most Likely: 12 weeks
Pessimistic: 20 weeks

Expected: (8 + 4×12 + 20) / 6 = 12.7 weeks
Std Dev: (20 - 8) / 6 = 2 weeks

Confidence Intervals:
68% confidence: 12.7 ± 2 weeks (10.7 - 14.7)
95% confidence: 12.7 ± 4 weeks (8.7 - 16.7)
```

### Risk-Adjusted Planning
```
Buffer = Base Estimate × Risk Factor

Risk Factors:
- Low risk (familiar tech, clear requirements): 1.1
- Medium risk (some unknowns): 1.25
- High risk (new tech, unclear requirements): 1.5

Example:
Base estimate: 10 weeks
Risk factor: 1.25 (medium)
Buffered estimate: 12.5 weeks
```

### Velocity-Based Planning
```
Average Velocity = Sum of Completed Points / Number of Sprints

Example:
Sprint 1: 45 points
Sprint 2: 52 points
Sprint 3: 48 points
Sprint 4: 50 points

Average: (45+52+48+50) / 4 = 48.75 points/sprint

For 500 point backlog:
Sprints needed: 500 / 48.75 = 10.3 sprints
Timeline: ~5 months (2-week sprints)
```

## Capacity Planning

### Team Capacity
```markdown
## Team Capacity Calculation

Team Size: 5 developers
Working Days: 60 days/quarter
Focus Factor: 0.65

Raw Capacity: 5 × 60 = 300 person-days
Effective Capacity: 300 × 0.65 = 195 person-days

Vacation/Sick Days: 2 days/person
Meeting Overhead: 2 hours/person/week

Adjusted Capacity: 180 person-days
```

### Multi-Team Planning
```markdown
## Cross-Team Dependencies

Team A (Backend): 120 days capacity
Team B (Frontend): 90 days capacity
Team C (Mobile): 60 days capacity

Blocked Capacity:
- Team B blocked waiting for Team A: 20 days
- Team C blocked waiting for Team B: 10 days

Effective Capacity:
- Team A: 120 days (no blockers)
- Team B: 70 days (90 - 20 blocked)
- Team C: 50 days (60 - 10 blocked)
```

## Stakeholder Communication

### Executive Updates
**Monthly Cadence:**
```markdown
## Roadmap Status: {Month}

### Accomplished
- {Key milestones achieved}
- {Metrics improved}

### In Progress
- {Current focus areas}
- {Expected completion}

### Risks
- {High-priority risks}
- {Mitigation status}

### Decisions Needed
- {Pending decisions}
- {Impact of delay}

### Next Month Focus
- {Key priorities}
- {Major milestones}
```

### Stakeholder Demos
**Bi-weekly Cadence:**
```markdown
## Demo Agenda

1. Sprint Goals Review (5 min)
2. Feature Demos (20 min)
3. Metrics Update (5 min)
4. Roadmap Changes (5 min)
5. Q&A (15 min)
```

### Customer Communication
**Release Notes:**
```markdown
# Release {Version} - {Date}

## New Features
- {Feature 1}: {Benefit}
- {Feature 2}: {Benefit}

## Improvements
- {Improvement 1}
- {Improvement 2}

## Bug Fixes
- {Fix 1}
- {Fix 2}

## Upcoming
- {Next release preview}
```

## Risk Management

### Risk Identification
**Categories:**
- Technical (technology risks)
- Schedule (timeline risks)
- Resource (staffing risks)
- External (vendor/market risks)
- Requirements (scope risks)

### Risk Register
```markdown
| Risk | Probability | Impact | Score | Mitigation | Owner |
|------|-------------|--------|-------|------------|-------|
| Vendor delay | 40% | High | 8.0 | Backup vendor | PM |
| Key person leave | 20% | High | 4.0 | Cross-train | TL |
| Scope creep | 60% | Medium | 7.2 | Change control | PM |
```

### Risk Mitigation Strategies
**Avoid:**
- Eliminate the risk
- Change approach
- Example: Use proven technology

**Transfer:**
- Shift to third party
- Insurance, SLAs
- Example: Vendor guarantee

**Mitigate:**
- Reduce probability/impact
- Add controls
- Example: Extra testing

**Accept:**
- Acknowledge and monitor
- Contingency plan
- Example: Buffer time

## Quality Standards

### Roadmap Quality
- ✅ Aligned with strategy
- ✅ Realistic timelines
- ✅ Dependencies identified
- ✅ Risk-adjusted
- ✅ Clear ownership
- ✅ Communicated effectively
- ✅ Updated regularly

### Estimation Quality
- ✅ Based on historical data
- ✅ Includes buffers
- ✅ Accounts for dependencies
- ✅ Team validated
- ✅ Assumptions documented
- ✅ Confidence levels clear

### Communication Quality
- ✅ Tailored to audience
- ✅ Clear and transparent
- ✅ Regular cadence
- ✅ Risks visible
- ✅ Progress tracked
- ✅ Feedback incorporated

## Common Mistakes

### Planning Mistakes
- ❌ Over-committing on dates
- ❌ Ignoring dependencies
- ❌ No buffer for uncertainty
- ❌ Treating roadmap as fixed
- ❌ Not accounting for tech debt
- ❌ Ignoring team capacity

### Estimation Mistakes
- ❌ Optimism bias
- ❌ Ignoring historical data
- ❌ Not involving team
- ❌ Estimating too far ahead
- ❌ Not breaking down large items

### Communication Mistakes
- ❌ Hiding risks and delays
- ❌ Over-promising
- ❌ Not updating regularly
- ❌ One-size-fits-all updates
- ❌ Not saying no

## References

- [Product Roadmaps Relaunched](https://www.oreilly.com/library/view/product-roadmaps-relaunched/9781491960547/) - C. Todd Lombardo
- [Agile Estimating and Planning](https://www.oreilly.com/library/view/agile-estimating-and/0131479415/) - Mike Cohn
- [Making Things Happen](https://www.oreilly.com/library/view/making-things-happen/9780735661660/) - Scott Berkun
- [The Principles of Product Development Flow](https://www.oreilly.com/library/view/the-principles-of/9781935401001/) - Donald G. Reinertsen
- [Critical Chain](https://www.oreilly.com/library/view/critical-chain/0132924130/) - Eliyahu M. Goldratt

### MCP Interactions
- **GitHub MCP**: Search repository for previous similar actions or related PRs before executing this skill.
- **Brave Search MCP**: Validate current patterns against the live internet if the context is sparse.
- **Context7 MCP**: Extract deep architectural/domain context relevant to the skill's execution.
