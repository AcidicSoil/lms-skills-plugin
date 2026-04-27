# Confidence Scoring Guide

## Overview

Confidence scoring quantifies how certain we are about extracted information from brownfield codebase analysis. Scores guide stakeholders on what needs validation vs what can be trusted.

**Confidence Scale:** 0-100% (Low / Medium / High)

---

## Scoring Framework

### High Confidence (90-100%)

**Definition:** Information extracted with high certainty, minimal validation needed

**Characteristics:**
- Clear, unambiguous code
- Good documentation (JSDoc, docstrings, README)
- Type definitions present (TypeScript, type hints)
- Test coverage exists (verified behavior)
- Recent updates (actively maintained, <6 months)
- Consistent patterns throughout codebase
- Multiple corroborating sources (code + docs + tests)

**Examples:**

```javascript
/**
 * Processes a payment using Stripe API
 * @param {number} amount - Amount in cents
 * @param {string} currency - Three-letter ISO currency code (e.g., 'usd')
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<PaymentResult>} Payment result with transaction ID
 */
async function processPayment(
  amount: number,
  currency: string,
  customerId: string
): Promise<PaymentResult> {
  const payment = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method_types: ['card'],
  });

  return {
    success: true,
    transactionId: payment.id,
  };
}

// ✅ CONFIDENCE: HIGH (95%)
// Evidence:
// - Clear documentation with JSDoc
// - TypeScript type definitions
// - Explicit Stripe API usage
// - Simple, straightforward logic
// - Parameters well-named and typed

// PRD Documentation:
Feature: Payment Processing
Confidence: 95% (High)
Implementation: Stripe API integration
Payment methods supported: Credit cards
Currency: Configurable (3-letter ISO codes)
Validation Needed: None (implementation clear)
```

---

### Medium Confidence (60-89%)

**Definition:** Information mostly clear but with some ambiguity or missing context

**Characteristics:**
- Reasonable naming but some unclear variables
- Partial documentation (some functions documented, others not)
- Logic understandable but complex or has unclear edge cases
- Few or no tests (behavior not verified)
- Some outdated patterns mixed with modern code
- Magic numbers or hardcoded values without explanation
- Single source of truth (code only, no corroborating docs/tests)

**Examples:**

```javascript
function applyDiscount(user, cart) {
  let total = 0;
  for (let item of cart.items) {
    total += item.price * item.quantity;
  }

  // Apply user discount
  if (user.tier === 'premium') {
    total *= 0.9; // 10% off
  } else if (user.tier === 'gold') {
    total *= 0.85; // 15% off
  }

  // Bulk discount
  if (cart.items.length > 10) {
    total *= 0.95; // Extra 5% off
  }

  return total;
}

// ⚠️ CONFIDENCE: MEDIUM (75%)
// Evidence:
// - Logic understandable
// - Discount percentages clear from comments
// - But: What if user has both tier AND bulk discount?
// - But: Are discounts stackable or exclusive?
// - But: No tests to verify behavior
// - But: No documentation on edge cases

// PRD Documentation:
Feature: Discount System
Confidence: 75% (Medium)
Implementation:
- Premium users: 10% discount
- Gold users: 15% discount
- Bulk orders (>10 items): 5% additional discount

Validation Needed:
❓ Are tier and bulk discounts stackable?
❓ What happens if user has no tier?
❓ Maximum discount limit?
❓ Discount applied before or after taxes?

Assumptions (to validate):
- Assuming discounts are stackable (code multiplies sequentially)
- Assuming no maximum discount cap (no ceiling check in code)
```

---

### Low Confidence (0-59%)

**Definition:** Information highly uncertain, requires significant validation

**Characteristics:**
- Cryptic or misleading naming
- No documentation
- Complex, unclear logic
- No tests
- Magic numbers everywhere
- Dead code or commented-out sections
- Very old code (5+ years, no updates)
- Contradictory patterns
- Business logic unclear

**Examples:**

```javascript
// Legacy pricing module
function calc(x, y, z, f) {
  let r = x * 1.085;
  if (y > 100 && !f) {
    r -= 10;
  } else if (y > 50) {
    r -= 5;
  }
  if (z === 'A' || z === 'B') {
    r *= 0.95;
  }
  // FIXME: This doesn't work for international orders
  return Math.round(r * 100) / 100;
}

// ❌ CONFIDENCE: LOW (35%)
// Evidence:
// - Cryptic naming (x, y, z, f, r - what do these mean?)
// - No documentation
// - Magic numbers (1.085, 10, 5, 0.95)
// - Unclear logic (what is y? what is z?)
// - FIXME comment indicates known issues
// - Math.round suggests currency but not clear

// PRD Documentation:
Feature: Pricing Calculation
Confidence: 35% (Low)

Guesses (HIGH VALIDATION NEEDED):
- x = base price? (multiplied by 1.085 = 8.5% tax?)
- y = quantity? (>100 gets $10 off, >50 gets $5 off)
- z = customer type? ('A' and 'B' get 5% discount)
- f = flag for something? (affects discount logic)
- r = result

Validation Needed (CRITICAL):
❗ What do parameters x, y, z, f represent?
❗ What is 1.085? (tax rate?)
❗ What do values 100, 50, 10, 5 represent?
❗ What are customer types 'A' and 'B'?
❗ Known issue: "doesn't work for international orders" - explain?
❗ Is this code still in use? (marked legacy)

Recommendations:
🚨 HIGH PRIORITY: Interview developers/stakeholders about this logic
🚨 MEDIUM PRIORITY: Check git history for context
🚨 CONSIDER: Refactoring or replacing this code
```

---

## Scoring Factors

### Factor 1: Code Quality (Weight: 30%)

**Score:**
- **High (90-100):** Clean code, good naming, clear structure, modern patterns
- **Medium (60-89):** Decent code, some unclear areas, mixed patterns
- **Low (0-59):** Poor code, cryptic naming, spaghetti logic, legacy patterns

---

### Factor 2: Documentation (Weight: 25%)

**Score:**
- **High (90-100):** Comprehensive docs (JSDoc/docstrings + README + wiki + comments)
- **Medium (60-89):** Partial docs (some functions documented, README exists but incomplete)
- **Low (0-59):** No docs (no comments, no README, no docs)

---

### Factor 3: Test Coverage (Weight: 20%)

**Score:**
- **High (90-100):** Tests exist and pass (behavior verified)
- **Medium (60-89):** Some tests exist but incomplete
- **Low (0-59):** No tests (behavior unverified)

---

### Factor 4: Maintenance Status (Weight: 15%)

**Score:**
- **High (90-100):** Recently updated (<6 months), actively maintained
- **Medium (60-89):** Moderately recent (6-24 months), occasional updates
- **Low (0-59):** Old code (>24 months), no recent changes, possibly abandoned

---

### Factor 5: Consistency (Weight: 10%)

**Score:**
- **High (90-100):** Consistent patterns, uniform style, clear conventions
- **Medium (60-89):** Mostly consistent with some variations
- **Low (0-59):** Inconsistent, mixed patterns, no clear conventions

---

## Calculating Overall Confidence

**Formula:**
```
Confidence = (Code Quality × 0.30) +
             (Documentation × 0.25) +
             (Test Coverage × 0.20) +
             (Maintenance × 0.15) +
             (Consistency × 0.10)
```

**Example Calculation:**

```
Module: User Authentication

Code Quality: 85 (decent code, clear logic, some magic numbers)
Documentation: 70 (README exists, some JSDoc, but incomplete)
Test Coverage: 90 (comprehensive tests for auth flows)
Maintenance: 95 (updated last month, actively maintained)
Consistency: 80 (mostly consistent, some old patterns remain)

Overall Confidence:
= (85 × 0.30) + (70 × 0.25) + (90 × 0.20) + (95 × 0.15) + (80 × 0.10)
= 25.5 + 17.5 + 18 + 14.25 + 8
= 83.25 ≈ 83% (Medium-High Confidence)

Rating: MEDIUM (83%)
Validation: Low priority (mostly clear, minor questions)
```

---

## Assigning Confidence to Different Elements

### Feature-Level Confidence

**High Confidence Feature:**
```markdown
### Feature: User Authentication

**Confidence:** 95% (High)

**Evidence:**
- ✅ Clear implementation (auth/service.js well-documented)
- ✅ Comprehensive tests (90% coverage)
- ✅ Recent updates (last updated 2 weeks ago)
- ✅ Type definitions (TypeScript)
- ✅ Integration tested (E2E tests pass)

**Capabilities:**
- Email/password signup
- Login with JWT tokens
- Password reset flow
- Session management (Redis)

**Validation Needed:** None (implementation clear and tested)
```

**Medium Confidence Feature:**
```markdown
### Feature: Subscription Billing

**Confidence:** 70% (Medium)

**Evidence:**
- ⚠️ Logic understandable but complex
- ⚠️ Partial documentation (no README for billing module)
- ⚠️ Few tests (only happy path tested)
- ✅ Recent updates (maintained)

**Capabilities:**
- Monthly and annual subscriptions
- Stripe integration for payments
- Subscription status management

**Validation Needed:**
❓ How are failed payments handled? (no tests found)
❓ What is grace period for expired subscriptions? (hardcoded 7 days, not documented)
❓ Are partial refunds supported? (unclear from code)

**Assumptions (to validate):**
- 7-day grace period for expired subs (based on hardcoded value)
- No partial refunds (no code found for this)
```

**Low Confidence Feature:**
```markdown
### Feature: Referral System

**Confidence:** 40% (Low)

**Evidence:**
- ❌ Cryptic code in referral/legacy.js
- ❌ No documentation
- ❌ No tests
- ❌ Last updated 3 years ago
- ❌ Conflicting logic in referral/new.js (v2?)

**Guesses (HIGH VALIDATION NEEDED):**
- Referrer gets $10 credit? (based on magic number)
- Referee gets $5 credit? (another magic number)
- Credits expire after 30 days? (found in legacy code)

**Validation Needed (CRITICAL):**
❗ Is referral system still active? (low usage suspected)
❗ Which implementation is live? (legacy.js or new.js?)
❗ What are actual credit amounts?
❗ Do credits expire?
❗ How is abuse prevented?

**Recommendations:**
🚨 HIGH PRIORITY: Validate with stakeholders if feature is still used
🚨 CONSIDER: Deprecating or rewriting this feature
```

---

## Validation Priority Matrix

| Confidence | Priority | Action |
|------------|----------|--------|
| 90-100% (High) | Low | Trust the analysis, minimal validation needed |
| 75-89% (Medium-High) | Medium | Spot-check key assumptions |
| 60-74% (Medium) | Medium-High | Validate assumptions with stakeholders |
| 40-59% (Medium-Low) | High | Extensive validation required |
| 0-39% (Low) | Critical | Do not trust, must validate everything |

---

## Documenting Confidence in PRD

### Template: Feature with Confidence

```markdown
### Feature: [Feature Name]

**Category:** Core | Secondary | Legacy
**Confidence:** [%] - High | Medium | Low

**Description:**
[What the feature does]

**User Value:**
[Why users care about this feature]

**Technical Implementation:**
[How it works - based on code analysis]

**Evidence for Confidence Score:**
- [Evidence 1: e.g., Clear code with TypeScript]
- [Evidence 2: e.g., Comprehensive test coverage]
- [Evidence 3: e.g., Recent updates]
- [Issue 1: e.g., No documentation for edge cases]

**Validation Needed:**
- ❓ [Question 1 if Medium confidence]
- ❗ [Critical question if Low confidence]

**Assumptions (to validate):**
- [Assumption 1 based on code analysis]
- [Assumption 2 inferred from patterns]
```

---

## Confidence Red Flags

Watch for these warning signs that should lower confidence:

- ⚠️ **Magic Numbers** - Hardcoded values with no explanation (1.085, 30, 0.95)
- ⚠️ **TODOs/FIXMEs** - Unresolved issues in code
- ⚠️ **Dead Code** - Commented-out sections, unused functions
- ⚠️ **Inconsistent Patterns** - Feature A uses pattern X, feature B uses pattern Y
- ⚠️ **No Error Handling** - Missing try/catch, no validation
- ⚠️ **Cryptic Naming** - x, foo, tmp, data, info (meaningless names)
- ⚠️ **Old Dependencies** - Packages 5+ major versions behind
- ⚠️ **No Tests** - Can't verify behavior

---

## Improving Confidence

**If confidence is low, try:**

1. **Check Git History**
   ```bash
   git log -p --follow path/to/file.js
   # Look for commit messages explaining changes
   ```

2. **Search for Documentation**
   ```bash
   grep -r "feature-name" docs/
   find . -name "*README*" -o -name "*CHANGELOG*"
   ```

3. **Interview Developers**
   - Ask about unclear business logic
   - Request clarification on magic numbers
   - Validate assumptions

4. **Check Issue Tracker**
   - Search for related issues/PRs
   - Look for feature discussions
   - Find user feedback

5. **Run the Code**
   - Test locally if possible
   - Observe actual behavior
   - Validate assumptions

---

## Confidence Scoring Checklist

For each feature analyzed:

- [ ] Code quality assessed (naming, structure, patterns)
- [ ] Documentation reviewed (comments, README, wiki)
- [ ] Tests checked (unit, integration, E2E)
- [ ] Maintenance status verified (git log, last update)
- [ ] Consistency evaluated (compared to codebase patterns)
- [ ] Overall confidence calculated (weighted formula)
- [ ] Confidence level assigned (High/Medium/Low)
- [ ] Evidence documented (why this confidence score?)
- [ ] Validation needs identified (what requires confirmation?)
- [ ] Assumptions stated explicitly (what are we inferring?)

---

## Example: Complete Feature Analysis with Confidence

```markdown
## Feature Analysis: Product Search

### Confidence Assessment

**Overall Confidence:** 78% (Medium-High)

**Breakdown:**
- Code Quality: 85% (clear logic, good naming, some complex parts)
- Documentation: 60% (README exists but incomplete, no API docs)
- Test Coverage: 80% (good unit tests, missing integration tests)
- Maintenance: 90% (updated last week, actively maintained)
- Consistency: 75% (mostly consistent with some legacy patterns)

**Calculation:**
= (85 × 0.30) + (60 × 0.25) + (80 × 0.20) + (90 × 0.15) + (75 × 0.10)
= 25.5 + 15 + 16 + 13.5 + 7.5
= 77.5 ≈ 78%

### Feature Documentation

**Category:** Core
**Confidence:** 78% (Medium-High)

**Description:**
Users can search for products by keyword, category, and filters (price range, availability).

**Technical Implementation:**
- Search engine: Elasticsearch 7.x
- Indexing: Real-time (on product create/update)
- Query: Multi-field match (name, description, tags)
- Filters: Price range, stock status, category
- Sorting: Relevance, price (asc/desc), newest

**Evidence:**
✅ Clear implementation in src/search/service.js
✅ Good unit test coverage (80%)
✅ Recently updated (last week)
⚠️ No API documentation
⚠️ Missing integration tests with Elasticsearch

**Validation Needed:**
❓ Are synonym searches supported? (code suggests yes, but not tested)
❓ What's the behavior for misspellings? (fuzzy match found, but threshold unclear)
❓ Search analytics tracked? (no instrumentation found)

**Assumptions:**
- Synonym matching enabled (found in Elasticsearch config)
- Fuzzy match tolerance: 2 characters (default setting)
- No search analytics (no tracking code found)

**Recommendations:**
📝 MEDIUM PRIORITY: Add API documentation for search endpoints
📝 MEDIUM PRIORITY: Add integration tests
📝 LOW PRIORITY: Consider adding search analytics
```

---

**Confidence Scoring Guide - Part of create-brownfield-prd skill**
**Use this framework to quantify certainty and guide validation efforts**
