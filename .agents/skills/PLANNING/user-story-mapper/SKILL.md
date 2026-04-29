---
name: user-story-mapper
description: User story mapping and backlog creation. Use when creating user story maps, breaking down epics into stories, writing acceptance criteria in Gherkin format, or prioritizing product backlogs following INVEST principles.
license: Apache 2.0
---

# User Story Mapping

Comprehensive user story mapping, backlog creation, and acceptance criteria writing for agile product development.

## When to Use This Skill

Use this skill when:
- Creating user story maps for new features or products
- Breaking down epics into implementable user stories
- Writing acceptance criteria in Gherkin/BDD format
- Prioritizing product backlogs
- Refining stories to meet INVEST criteria
- Planning MVP and release slices
- Conducting backlog grooming sessions
- Estimating story points

## Core Concepts

### User Story Format
```
As a {type of user}
I want {goal/desire}
So that {benefit/value}
```

### INVEST Criteria
- **Independent**: Can be developed separately
- **Negotiable**: Details can be discussed
- **Valuable**: Delivers value to user
- **Estimable**: Team can estimate effort
- **Small**: Can be completed in one sprint
- **Testable**: Has clear acceptance criteria

### Story Mapping Structure
```
User Activities (Walking Skeleton)
├── User Tasks
│   ├── User Stories (MVP)
│   ├── User Stories (V1)
│   └── User Stories (V2)
```

## User Story Mapping Process

### Step 1: Identify User Types
**Primary Users:**
- Registered users
- Guest users
- Administrators
- Customer support
- Content creators

**Create User Personas:**
```markdown
## Persona: Registered User
**Name**: Sarah
**Role**: Frequent shopper
**Goals**:
- Find products quickly
- Track orders
- Manage preferences

**Frustrations**:
- Slow checkout
- Can't find order history
- Too many clicks
```

### Step 2: Map User Activities
**High-level user goals:**
```
E-commerce Example:
1. Browse Products
2. Add to Cart
3. Checkout
4. Track Order
5. Manage Account
```

### Step 3: Break Down into Tasks
**For each activity, identify tasks:**
```
Browse Products:
- Search for products
- Filter results
- Sort results
- View product details
- Compare products
- View reviews
```

### Step 4: Write Stories for Each Task
**Example for "View Product Details":**
```
Story 1: User can view product images
Story 2: User can view product description
Story 3: User can view product specifications
Story 4: User can view product reviews
Story 5: User can view related products
```

### Step 5: Prioritize and Slice
**Release Planning:**
```
MVP (Must Have):
- View product images
- View product description
- View price

V1 (Should Have):
- View product reviews
- View related products

V2 (Could Have):
- AR product preview
- Video reviews
- 360° product view
```

## Acceptance Criteria Writing

### Gherkin Syntax
```gherkin
Feature: {Feature name}
  As a {user type}
  I want {capability}
  So that {benefit}

Scenario: {Scenario name}
  Given {precondition}
  And {additional context}
  When {action}
  Then {expected outcome}
  And {additional outcome}
```

### Scenario Types

**Happy Path:**
```gherkin
Scenario: User successfully adds product to cart
  Given I am browsing products
  When I click "Add to Cart" on a product
  Then the product should be added to my cart
  And I should see a confirmation message
  And the cart icon should show the updated item count
```

**Alternative Path:**
```gherkin
Scenario: User adds multiple quantities to cart
  Given I am viewing a product detail page
  When I select quantity "3"
  And I click "Add to Cart"
  Then 3 units should be added to my cart
  And I should see "3 items added" confirmation
```

**Error Path:**
```gherkin
Scenario: Product is out of stock
  Given I am viewing a product detail page
  When the product is out of stock
  Then the "Add to Cart" button should be disabled
  And I should see "Out of Stock" label
```

**Edge Cases:**
```gherkin
Scenario: User adds more items than available
  Given I have 2 items of Product X in my cart
  When I try to add 10 more items
  And only 5 items are in stock
  Then I should see "Only 3 more available" message
  And only 3 items should be added
```

**Validation:**
```gherkin
Scenario: User enters invalid coupon code
  Given I am at checkout
  When I enter an invalid coupon code
  And I click "Apply"
  Then I should see "Invalid coupon code" error
  And the order total should remain unchanged
```

### Acceptance Criteria Template
```gherkin
Feature: {Feature Name}

Scenario: {Positive scenario name}
  Given {context}
  When {action}
  Then {outcome}

Scenario: {Negative scenario name}
  Given {context}
  When {invalid action}
  Then {error handling}
  And {user feedback}

Scenario: {Edge case name}
  Given {boundary condition}
  When {action}
  Then {handling of edge case}

Scenario: {Performance requirement}
  Given {load condition}
  When {action}
  Then {response time requirement}
```

## Story Slicing Techniques

### By Workflow Steps
```
Epic: User Registration
Slice 1: User can enter email and password
Slice 2: User can verify email
Slice 3: User can complete profile
Slice 4: User can set preferences
```

### By Data Boundaries
```
Epic: Product Management
Slice 1: User can create products (basic fields)
Slice 2: User can add product images
Slice 3: User can add product variants
Slice 4: User can manage inventory
```

### By User Roles
```
Epic: Content Management
Slice 1: Authors can create drafts
Slice 2: Editors can review and edit
Slice 3: Admins can approve and publish
Slice 4: Readers can comment
```

### By Functional Coverage
```
Epic: Search
Slice 1: Basic keyword search (MVP)
Slice 2: Filter by category
Slice 3: Filter by price range
Slice 4: Sort by relevance/price/date
Slice 5: Advanced search with multiple criteria
```

### By Quality/Completeness
```
Epic: Payment Processing
Slice 1: Credit card payments (one provider)
Slice 2: Multiple credit card providers
Slice 3: PayPal integration
Slice 4: Store credit/gift cards
Slice 5: Split payments
```

## Backlog Prioritization

### MoSCoW Method
```markdown
## Must Have (60% of effort)
- Critical for MVP
- Legal/regulatory requirements
- Core functionality

## Should Have (20% of effort)
- Important but not vital
- Significant value add
- Workaround exists

## Could Have (20% of effort)
- Desirable features
- Low impact if omitted
- Nice to have

## Won't Have (this time)
- Explicitly excluded
- Documented for future
```

### RICE Scoring
```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach: How many users? (1-10 scale)
Impact: How much impact? (0.25, 0.5, 1, 2, 3)
Confidence: How confident? (50%, 80%, 100%)
Effort: Person-months (1-10 scale)

Example:
- Reach: 8 (80% of users)
- Impact: 2 (High impact)
- Confidence: 80%
- Effort: 4 (person-months)
- RICE Score: (8 × 2 × 0.8) / 4 = 3.2
```

### Value vs. Effort Matrix
```
                High Effort
                    │
        ┌───────────┼───────────┐
        │           │           │
        │   Major   │   Time    │
 High   │ Projects  │  Wasters  │
 Value  │ (Plan     │ (Avoid)   │
        │ Carefully)│           │
        ├───────────┼───────────┤
        │           │           │
        │  Quick    │  Fill-ins │
 Low    │  Wins     │  (Do when │
 Value  │ (Do First)│  time)    │
        │           │           │
        └───────────┼───────────┘
                    │
                Low Effort
```

## Story Point Estimation

### Fibonacci Scale
| Points | Description | Time Equivalent |
|--------|-------------|-----------------|
| **1** | Trivial | < 2 hours |
| **2** | Simple | 2-4 hours |
| **3** | Moderate | 4-8 hours |
| **5** | Complex | 1-2 days |
| **8** | Very Complex | 2-4 days |
| **13** | Extremely Complex | Should split |
| **21** | Too Large | Must split |

### Estimation Guidelines
```
Consider these factors:

Complexity:
- How complex is the logic?
- How many edge cases?
- Integration complexity?

Effort:
- How much code to write?
- How many files affected?
- Documentation needed?

Uncertainty:
- New technology?
- Unclear requirements?
- External dependencies?

Testing:
- How many test scenarios?
- Automation complexity?
- Test data requirements?
```

### Planning Poker Process
1. Product Owner presents story
2. Team discusses requirements
3. Each estimator selects card
4. All reveal simultaneously
5. If spread > 2 points, discuss
6. High estimators explain concerns
7. Low estimators explain assumptions
8. Re-vote until consensus
9. Record final estimate

## Story Quality Checklist

### INVEST Validation
- [ ] **Independent**: Can be developed separately
- [ ] **Negotiable**: Not overly prescriptive
- [ ] **Valuable**: Clear user benefit
- [ ] **Estimable**: Team can estimate
- [ ] **Small**: < 5 story points
- [ ] **Testable**: Has acceptance criteria

### Acceptance Criteria Quality
- [ ] Written in Gherkin format
- [ ] Covers happy path
- [ ] Covers error scenarios
- [ ] Covers edge cases
- [ ] Testable (pass/fail)
- [ ] Includes performance criteria
- [ ] Includes security criteria (if applicable)

### Story Readiness
- [ ] User type clearly defined
- [ ] Goal is specific
- [ ] Benefit is clear
- [ ] Dependencies identified
- [ ] UX mockups available (if needed)
- [ ] Technical feasibility confirmed
- [ ] Estimated by team

## Output Format

When using this skill, create:

### 1. User Story Map Document
```markdown
# User Story Map: {Product/Feature}

## User Types
{List of user personas}

## User Activities
{High-level activities}

## Story Map
{Visual representation}

## Prioritized Backlog
{Stories by priority}

## Release Plan
{MVP, V1, V2 slices}
```

### 2. User Stories Document
```markdown
# User Stories: {Feature}

## Epic: {Epic Name}

### Story: {Story ID} - {Name}
**As a** {user type}
**I want** {goal}
**So that** {benefit}

#### Acceptance Criteria
{Gherkin scenarios}

#### Story Points
{Estimate}

#### Dependencies
{List}
```

### 3. Backlog Document
```markdown
# Product Backlog

## Prioritized Stories
| ID | Story | Points | Priority | Sprint |
|----|-------|--------|----------|--------|

## Sprint Plan
| Sprint | Stories | Total Points | Goal |
|--------|---------|--------------|------|
```

## Best Practices

1. **Write Stories Collaboratively**: Involve team in story writing
2. **Keep User-Centric**: Focus on user value, not technical implementation
3. **One Story, One Value**: Each story should deliver independent value
4. **Slice Thin**: Break large stories into small, implementable pieces
5. **Test First**: Write acceptance criteria before implementation
6. **Refine Regularly**: Conduct backlog grooming weekly
7. **Estimate as Team**: Use planning poker for consensus
8. **Update Based on Learning**: Stories evolve as understanding grows

## Common Mistakes

### Story Writing Mistakes
- ❌ Technical stories ("As a developer...")
- ❌ Missing benefit ("So that" is vague)
- ❌ Too large (epics as stories)
- ❌ Multiple users in one story
- ❌ Combined with "AND" (two stories in one)

### Acceptance Criteria Mistakes
- ❌ Too few scenarios
- ❌ Only happy path
- ❌ Untestable ("Should be fast")
- ❌ Missing error scenarios
- ❌ Too detailed (implementation specs)

### Prioritization Mistakes
- ❌ Prioritizing by loudest stakeholder
- ❌ Ignoring dependencies
- ❌ Not considering technical debt
- ❌ Everything is "Must Have"
- ❌ Not re-prioritizing regularly

## References

- [User Stories Applied](https://www.oreilly.com/library/view/user-stories-applied/0321205685/) - Mike Cohn
- [User Story Mapping](https://www.oreilly.com/library/view/user-story-mapping/9781491904893/) - Jeff Patton
- [Specification by Example](https://www.oreilly.com/library/view/specification-by-example/9781617290084/) - Gojko Adzic
- [BDD in Action](https://www.manning.com/books/bdd-in-action-second-edition) - John Ferguson Smart
- [Agile Estimating and Planning](https://www.oreilly.com/library/view/agile-estimating-and/0131479415/) - Mike Cohn

### MCP Interactions
- **GitHub MCP**: Search repository for previous similar actions or related PRs before executing this skill.
- **Brave Search MCP**: Validate current patterns against the live internet if the context is sparse.
- **Context7 MCP**: Extract deep architectural/domain context relevant to the skill's execution.
