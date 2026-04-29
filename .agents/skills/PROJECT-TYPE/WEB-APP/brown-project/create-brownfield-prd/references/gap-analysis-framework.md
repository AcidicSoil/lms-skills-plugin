# Gap Analysis Framework

## Overview

Gap analysis identifies the delta between current state and desired state. For brownfield PRDs, gaps fall into six categories: functional gaps (missing features), technical debt, performance issues, security concerns, UX problems, and scalability limitations.

---

## Gap Category 1: Functional Gaps

### What Are Functional Gaps?

**Definition:** Features or capabilities that should exist but don't, based on:
- Industry standards (competitors have it)
- User expectations (common e-commerce patterns)
- Business requirements (needed for growth)
- Incomplete implementations (started but not finished)

---

### Detection Techniques

#### Technique 1: Comparative Analysis

**Pattern: Feature Parity Check**

```
Your Product vs Competitors:

✅ Product catalog
✅ Shopping cart
✅ Checkout
✅ Payment processing
❌ Wishlist (Competitor A, B, C all have this)
❌ Product reviews (Competitor A, C have this)
❌ Gift cards (Competitor B, C have this)
✅ Order tracking
❌ Subscription orders (Competitor C has this)

Functional Gaps Identified:
1. Wishlist feature (HIGH priority - industry standard)
2. Product reviews (MEDIUM priority - social proof)
3. Gift card system (LOW priority - niche feature)
4. Subscription orders (MEDIUM priority - recurring revenue opportunity)
```

**Gap Documentation Template:**

```markdown
### Gap 1: Wishlist Feature Missing

**Category:** Functional Gap
**Priority:** HIGH
**Confidence:** 95% (High) - Feature completely absent

**Current State:**
- No wishlist table in database
- No wishlist UI components
- No wishlist API endpoints
- Users cannot save products for later

**Desired State:**
- Users can add/remove products to wishlist
- Wishlist persists across sessions
- Users can move items from wishlist to cart
- Wishlist shareable (optional advanced feature)

**Business Impact:**
- Lost sales (users forget about products)
- Reduced engagement (no reason to return)
- Competitive disadvantage (industry standard)

**Implementation Estimate:** 2-3 weeks
- Database: Add wishlists table (1 day)
- API: CRUD endpoints (2 days)
- Frontend: Wishlist page + buttons (5 days)
- Testing: Unit + integration tests (2 days)

**Recommendation:** Add to v1.1 roadmap (post-launch priority)
```

---

#### Technique 2: Incomplete Implementation Detection

**Pattern: Half-Built Features**

```javascript
// Found in codebase: Subscription-related code

// models/Subscription.js (exists but minimal)
const subscriptionSchema = new Schema({
  userId: { type: ObjectId, ref: 'User' },
  productId: { type: ObjectId, ref: 'Product' },
  interval: { type: String, enum: ['monthly', 'yearly'] },
  status: { type: String, enum: ['active', 'cancelled'] },
  // TODO: Add billing date, payment method, etc.
});

// routes/subscriptions.js (found but commented out)
// router.post('/api/subscriptions', createSubscription);
// router.get('/api/subscriptions', getUserSubscriptions);
// router.delete('/api/subscriptions/:id', cancelSubscription);

// UI component exists but not used
// components/SubscriptionForm.jsx (exists but not imported anywhere)

// Analysis:
Functional Gap: Subscription Feature Incomplete
Confidence: 80% (High) - Code exists but disabled
Status: Started but abandoned or deprioritized

Evidence:
✅ Database model exists (basic structure)
⚠️ TODOs indicate incomplete
❌ Routes commented out (disabled)
❌ UI component not integrated
❌ No tests found

Current State: Non-functional (0% complete)
Required to Complete:
1. Finish database model (billing fields)
2. Implement subscription business logic (recurring billing)
3. Integrate payment processor (Stripe subscriptions API)
4. Build/integrate UI components
5. Add tests

Recommendation: Either complete or remove dead code
- Option A: Complete feature (4-6 weeks effort)
- Option B: Remove all subscription code (clean up tech debt)
- Decision depends on business priority
```

---

#### Technique 3: User Flow Gap Analysis

**Pattern: Missing Steps in User Journeys**

```
Current User Flow: Product Return Process

Current Implementation:
1. User views order history ✅
2. User clicks "Return Item" button ✅
3. ... [Gap: No return flow exists] ❌
4. User manually contacts support ⚠️

Expected Flow (Industry Standard):
1. User views order history
2. User clicks "Return Item"
3. User selects return reason
4. User prints return label
5. System creates return request
6. Warehouse processes return
7. Refund issued automatically

Functional Gaps:
- No return reason selection
- No return label generation
- No return request tracking
- No automated refund processing
- Manual process only (high support cost)

Impact:
- Poor UX (manual process)
- High support burden (every return requires agent)
- Slow refunds (manual approval)
- No return analytics (can't track common return reasons)
```

---

### Common Functional Gaps

**1. Search & Discovery Gaps**
```
❌ No autocomplete/suggestions
❌ No typo tolerance (fuzzy search)
❌ No search filters
❌ No saved searches
❌ No search history
```

**2. Account Management Gaps**
```
❌ No password reset flow
❌ No email verification
❌ No social login (Google, Facebook)
❌ No two-factor authentication
❌ No account deletion (GDPR requirement)
```

**3. Communication Gaps**
```
❌ No in-app notifications
❌ No SMS notifications
❌ No email preferences (opt-in/out)
❌ No notification history
```

**4. Admin/Management Gaps**
```
❌ No bulk operations (bulk edit, bulk delete)
❌ No export functionality (CSV, PDF)
❌ No advanced analytics
❌ No audit logs
❌ No user impersonation (support tool)
```

---

## Gap Category 2: Technical Debt

### What Is Technical Debt?

**Definition:** Code or architecture that works today but creates problems tomorrow:
- Outdated dependencies (security risks, lack of support)
- Deprecated APIs (will break in future)
- Code duplication (maintenance burden)
- Missing tests (fragile codebase)
- Poor architecture (scalability limits)

---

### Detection Techniques

#### Technique 1: Dependency Audit

```bash
# Check for outdated dependencies
npm outdated

# Example output:
Package         Current   Wanted   Latest   Location
express         4.17.1    4.18.2   4.18.2   node_modules/express
stripe          8.222.0   8.222.0  12.3.0   node_modules/stripe  # ⚠️ Major version behind
lodash          4.17.19   4.17.21  4.17.21  node_modules/lodash  # ⚠️ Security update
react           16.14.0   16.14.0  18.2.0   node_modules/react   # ⚠️ Two major versions behind

# Technical Debt Identified:

Debt 1: Stripe API Outdated (v8 → v12)
Severity: HIGH
Risk:
- Old API may be deprecated soon
- Missing new features (Apple Pay, Google Pay)
- Potential security vulnerabilities
Effort: 1-2 weeks (migration + testing)
Priority: 🚨 CRITICAL (schedule immediately)

Debt 2: React 16 → React 18
Severity: MEDIUM
Risk:
- Two major versions behind
- Missing performance improvements
- Community support declining
Effort: 2-3 weeks (test all components, refactor lifecycle methods)
Priority: MEDIUM (schedule for v1.1)

Debt 3: Lodash Security Update
Severity: MEDIUM
Risk:
- Known security vulnerability (CVE-XXXX)
- Easy fix (minor version update)
Effort: 1 day (update + test)
Priority: HIGH (quick win, security fix)
```

---

#### Technique 2: Code Smell Detection

**Smell 1: Duplicate Code**

```javascript
// File 1: services/UserService.js
async function createUser(email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.users.create({
    email,
    password: hashedPassword,
    createdAt: new Date()
  });
  await sendWelcomeEmail(user);
  return user;
}

// File 2: controllers/AuthController.js
async function signup(req, res) {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // ⚠️ Duplicate
  const user = await db.users.create({
    email,
    password: hashedPassword,
    createdAt: new Date()
  });
  await sendWelcomeEmail(user); // ⚠️ Duplicate
  res.json({ user });
}

// Technical Debt:
Debt: Password Hashing Logic Duplicated
Severity: LOW
Risk:
- If hashing algorithm changes, must update multiple places
- Inconsistent salt rounds possible
- Maintenance burden
Refactor:
// utils/auth.js
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Then use: const hashedPassword = await hashPassword(password);

Effort: 2 hours (extract function, update all usages)
Priority: LOW (nice to have, not critical)
```

**Smell 2: Magic Numbers**

```javascript
// Pricing calculation
function calculateTotal(subtotal, user) {
  let total = subtotal * 1.085; // ⚠️ What is 1.085?

  if (user.tier === 'premium') {
    total *= 0.9; // ⚠️ What is 0.9?
  }

  if (subtotal > 100) {
    total -= 10; // ⚠️ What is 10?
  }

  return total;
}

// Technical Debt:
Debt: Magic Numbers (Unclear Business Rules)
Severity: MEDIUM
Risk:
- Unclear business logic (what do these numbers mean?)
- Hard to change (must search entire codebase)
- No documentation
- Testing difficult (unknown expected values)

Refactor:
// config/pricing.js
export const TAX_RATE = 0.085; // 8.5% sales tax
export const PREMIUM_DISCOUNT = 0.10; // 10% off for premium users
export const BULK_DISCOUNT_THRESHOLD = 100; // Orders over $100
export const BULK_DISCOUNT_AMOUNT = 10; // $10 off

function calculateTotal(subtotal, user) {
  let total = subtotal * (1 + TAX_RATE);

  if (user.tier === 'premium') {
    total *= (1 - PREMIUM_DISCOUNT);
  }

  if (subtotal > BULK_DISCOUNT_THRESHOLD) {
    total -= BULK_DISCOUNT_AMOUNT;
  }

  return total;
}

Effort: 4 hours (extract constants, update all files)
Priority: MEDIUM (improves maintainability)
```

**Smell 3: Missing Tests**

```javascript
// File: services/OrderService.js (320 lines)
// Tests: None found

// Technical Debt:
Debt: No Test Coverage for Order Service
Severity: HIGH
Risk:
- Critical business logic untested
- Refactoring dangerous (could break orders)
- No confidence in changes
- Bugs likely undetected

Recommended:
- Add unit tests for all public methods (40+ hours)
- Add integration tests for order flow (20 hours)
- Achieve 80% coverage minimum

Priority: HIGH (schedule for v1.1, blocks major refactors)
```

---

#### Technique 3: Architectural Debt

```
Current Architecture: Monolithic

Single codebase:
- Frontend (React)
- Backend (Node.js/Express)
- All business logic in one service
- Single database

Technical Debt:
Debt: Monolithic Architecture Limits Scalability
Severity: MEDIUM (not critical now, but future issue)
Risk:
- Cannot scale components independently
- Deploy all or nothing (risky deployments)
- One bug can take down entire system
- Team coordination harder (merge conflicts)

Current Scale: Works fine (5,000 users, 200 orders/day)
Future Scale: Will struggle (50,000+ users, 2,000+ orders/day)

Refactor Options:
Option A: Extract high-traffic services (products, orders) to microservices
- Effort: 3-4 months
- Benefit: Independent scaling, fault isolation
- Cost: Complexity increase (distributed system)

Option B: Keep monolith, optimize (caching, read replicas)
- Effort: 1-2 months
- Benefit: Simpler, buys time
- Cost: Temporary solution (doesn't solve long-term)

Recommendation: Option B now (v1.1), Option A later (v2.0, if scale demands it)
```

---

## Gap Category 3: Performance Issues

### Detection Techniques

#### Technique 1: Slow Query Analysis

```sql
-- Found in logs: Slow query (3.5 seconds)
SELECT * FROM products
WHERE name LIKE '%search_term%' OR description LIKE '%search_term%'
ORDER BY created_at DESC
LIMIT 20;

-- Performance Gap:
Gap: Product Search Performance
Current: 3-5 seconds for search queries
Expected: <500ms (industry standard)
Impact: Poor UX, cart abandonment

Root Cause:
- Using SQL LIKE queries (full table scan)
- No indexes on name/description columns
- No search-optimized database (PostgreSQL full-text search or Elasticsearch)

Solutions:
Option A: Add PostgreSQL full-text search
- Effort: 1 week
- Result: <1s search times
- Cost: Complexity increase (maintain search indexes)

Option B: Integrate Elasticsearch
- Effort: 2-3 weeks
- Result: <100ms search times
- Cost: New infrastructure (Elasticsearch cluster)

Recommendation: Option A for v1.1 (quick win), Option B for v2.0 (if needed)
```

#### Technique 2: N+1 Query Detection

```javascript
// Found in code: N+1 query problem

async function getOrders(userId) {
  const orders = await db.orders.find({ userId }); // 1 query

  for (let order of orders) {
    // N queries (one per order)
    order.items = await db.orderItems.find({ orderId: order.id });
  }

  return orders;
}

// Performance Gap:
Gap: N+1 Query in Order Listing
Current: 1 + N queries (1 + 20 = 21 queries for 20 orders)
Expected: 2 queries (orders + all items in one query)
Impact: Slow order history page (2-3 seconds)

Solution:
async function getOrders(userId) {
  const orders = await db.orders.find({ userId });
  const orderIds = orders.map(o => o.id);

  // Single query for all items
  const allItems = await db.orderItems.find({ orderId: { $in: orderIds } });

  // Group items by orderId
  const itemsByOrder = _.groupBy(allItems, 'orderId');

  orders.forEach(order => {
    order.items = itemsByOrder[order.id] || [];
  });

  return orders;
}

Effort: 2 hours (refactor query logic)
Impact: 10x performance improvement (21 queries → 2 queries)
Priority: HIGH (quick win, big impact)
```

---

## Gap Category 4: Security Concerns

### Detection Techniques

#### Technique 1: Security Audit Checklist

```markdown
Security Audit Results:

Authentication & Authorization:
✅ Passwords hashed (bcrypt)
✅ HTTPS enforced (production)
⚠️ No rate limiting on login (brute force risk)
⚠️ Weak password policy (min 6 chars, no complexity)
❌ No two-factor authentication
❌ No session timeout (sessions never expire)

API Security:
✅ JWT tokens used
⚠️ No API rate limiting (DDoS risk)
❌ No input validation on many endpoints (injection risk)
❌ No CORS configuration (accepts all origins)
❌ No request size limits (large payload DoS)

Data Security:
✅ Database credentials in environment variables
⚠️ No encryption at rest (database not encrypted)
❌ No PII data encryption (credit cards tokenized but addresses plain text)
❌ No data retention policy (GDPR compliance risk)

Security Gaps Identified:

Gap 1: No Rate Limiting
Severity: HIGH
Risk: Brute force attacks, DDoS
Solution: Add express-rate-limit middleware
Effort: 1 day
Priority: 🚨 CRITICAL

Gap 2: Weak Password Policy
Severity: MEDIUM
Risk: Account compromise
Solution: Enforce 8+ chars, require uppercase/lowercase/number
Effort: 4 hours
Priority: HIGH

Gap 3: No Two-Factor Authentication
Severity: MEDIUM
Risk: Account takeover
Solution: Implement TOTP (Google Authenticator)
Effort: 2 weeks
Priority: MEDIUM (v1.1)

Gap 4: No Input Validation
Severity: HIGH
Risk: SQL injection, XSS
Solution: Add validation middleware (Joi, express-validator)
Effort: 1 week (validate all endpoints)
Priority: 🚨 CRITICAL
```

---

## Gap Category 5: UX Problems

### Detection Techniques

#### Technique 1: User Flow Analysis

```markdown
UX Gap: Unclear Order Status

Current Implementation:
- Order status: "pending" | "confirmed" | "shipped" | "delivered"
- Status displayed as plain text: "Your order is pending"
- No visual indicator (no icons, colors)
- No progress bar
- No estimated delivery date
- No tracking link (even when shipped)

Expected UX (Industry Standard):
- Visual progress bar (Order Placed → Confirmed → Shipped → Delivered)
- Icons for each status
- Color coding (yellow = pending, green = confirmed, blue = shipped)
- Estimated delivery date
- Tracking link when shipped
- Email updates on status changes

Impact:
- Users confused about order status
- "Where is my order?" support tickets
- Poor post-purchase experience

Solution:
1. Add OrderStatusTimeline component
2. Add status icons and colors
3. Calculate/display estimated delivery
4. Integrate tracking API (Shippo, EasyPost)
5. Add email notifications on status changes

Effort: 1 week (frontend + backend)
Priority: HIGH (customer-facing, high support burden)
```

#### Technique 2: Error Message Analysis

```javascript
// Current error handling
if (!user) {
  return res.status(401).json({ error: 'Unauthorized' }); // ⚠️ Vague
}

if (!product) {
  return res.status(404).json({ error: 'Not found' }); // ⚠️ Vague
}

if (payment.failed) {
  return res.status(500).json({ error: 'Error' }); // ⚠️ Useless
}

// UX Gap:
Gap: Vague Error Messages
Impact:
- Users don't know what went wrong
- Users don't know how to fix it
- Support burden (users contact support for resolvable errors)

Expected Error Messages:
if (!user) {
  return res.status(401).json({
    error: 'AUTHENTICATION_REQUIRED',
    message: 'Please log in to continue',
    action: 'redirect_to_login'
  });
}

if (!product) {
  return res.status(404).json({
    error: 'PRODUCT_NOT_FOUND',
    message: 'This product is no longer available',
    suggestion: 'Browse similar products'
  });
}

if (payment.failed) {
  return res.status(402).json({
    error: 'PAYMENT_DECLINED',
    message: 'Your payment was declined. Please check your card details or try a different payment method.',
    retry: true
  });
}

Effort: 2 days (update all error responses)
Priority: MEDIUM (UX improvement, reduces support)
```

---

## Gap Category 6: Scalability Limitations

### Detection Techniques

#### Technique 1: Load Analysis

```markdown
Current Scale:
- Users: 5,000 MAU (monthly active users)
- Orders: 200/day average, 500/day peak
- Products: 1,000 SKUs
- Database: 50GB

Performance at Current Scale:
✅ Response times: <500ms (acceptable)
✅ Uptime: 99.5% (acceptable)
✅ Database queries: Fast enough

Projected Growth (12 months):
- Users: 50,000 MAU (10x growth)
- Orders: 2,000/day average, 5,000/day peak (10x growth)
- Products: 10,000 SKUs (10x growth)
- Database: 500GB (10x growth)

Scalability Gaps:

Gap 1: Database Will Bottleneck
Current: Single PostgreSQL instance
Projected Load: 10x queries/second
Risk: Database becomes bottleneck, slow queries, downtime
Solution Options:
- Option A: Read replicas (distribute read load)
- Option B: Database sharding (horizontal scaling)
- Option C: Move to managed DB (AWS RDS, Aurora) with auto-scaling

Gap 2: No Caching Layer
Current: Every request hits database
Projected Impact: 10x database load
Risk: Slow response times, database overload
Solution: Implement Redis caching
- Cache product catalog (95% of reads)
- Cache user sessions
- Cache API responses (5 min TTL)
Impact: Reduce DB load by 70-80%

Gap 3: Single Server Deployment
Current: One EC2 instance
Risk: Single point of failure, cannot scale horizontally
Solution: Load-balanced auto-scaling group
- Deploy 3+ instances behind load balancer
- Auto-scale based on CPU/traffic
- Zero-downtime deployments

Priority:
- Gap 2 (Caching): HIGH - implement in v1.1 (quick win, big impact)
- Gap 3 (Load balancing): MEDIUM - implement in v1.2
- Gap 1 (DB scaling): LOW - implement when needed (v2.0+)
```

---

## Gap Prioritization Matrix

### Prioritization Framework

```
Priority = (Impact × Urgency) / Effort

Impact: 1-10 (how much does this matter?)
Urgency: 1-10 (how soon does this need fixing?)
Effort: 1-10 (how hard is this to fix?)

HIGH Priority: Score > 7
MEDIUM Priority: Score 4-7
LOW Priority: Score < 4
```

**Example Prioritization:**

```markdown
Gap: Stripe API Outdated (v8 → v12)
Impact: 9 (payments critical, security risk)
Urgency: 10 (will be deprecated soon)
Effort: 5 (2 weeks migration)
Priority: (9 × 10) / 5 = 18 → 🚨 CRITICAL

Gap: Wishlist Feature Missing
Impact: 6 (nice to have, competitive feature)
Urgency: 4 (not urgent)
Effort: 7 (2-3 weeks)
Priority: (6 × 4) / 7 = 3.4 → LOW (v1.2+)

Gap: No Rate Limiting (Security)
Impact: 8 (security risk)
Urgency: 8 (exposed to attacks)
Effort: 2 (1 day fix)
Priority: (8 × 8) / 2 = 32 → 🚨 CRITICAL

Gap: React 16 → React 18 Upgrade
Impact: 5 (performance, future-proofing)
Urgency: 3 (not urgent)
Effort: 8 (2-3 weeks, risky)
Priority: (5 × 3) / 8 = 1.9 → LOW (v1.2+)
```

---

## Gap Documentation Template

```markdown
## Gap: [Gap Name]

**Category:** Functional | Technical Debt | Performance | Security | UX | Scalability
**Priority:** CRITICAL | HIGH | MEDIUM | LOW
**Confidence:** [X%] (High | Medium | Low)

### Current State
[What exists today]

### Desired State
[What should exist]

### Impact
**User Impact:** [How this affects users]
**Business Impact:** [How this affects business]
**Technical Impact:** [How this affects system]

### Root Cause
[Why does this gap exist?]

### Solutions
**Option A:** [Solution 1]
- Effort: [Time estimate]
- Pros: [Benefits]
- Cons: [Drawbacks]

**Option B:** [Solution 2]
- Effort: [Time estimate]
- Pros: [Benefits]
- Cons: [Drawbacks]

### Recommendation
[Recommended solution and timing]

### Dependencies
[What must be done first, or what depends on this]

### Risk if Not Addressed
[What happens if we don't fix this]
```

---

## Gap Analysis Checklist

Before completing gap analysis:

- [ ] Functional gaps identified (missing features)
- [ ] Technical debt catalogued (outdated code, dependencies)
- [ ] Performance issues documented (slow queries, bottlenecks)
- [ ] Security concerns flagged (vulnerabilities, compliance)
- [ ] UX problems noted (poor user experience)
- [ ] Scalability limitations assessed (future growth)
- [ ] All gaps prioritized (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Solutions proposed for high-priority gaps
- [ ] Effort estimates provided
- [ ] Quick wins identified (high impact, low effort)
- [ ] Risks documented (what happens if not addressed)
- [ ] Dependencies mapped (what must be done first)

---

**Gap Analysis Framework - Part of create-brownfield-prd skill**
**Use this framework to systematically identify and prioritize gaps**
