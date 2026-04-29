# Brownfield PRD Template

## Document Information

**Product Name:** [Product Name] (Existing System)
**Analysis Date:** [Date]
**Analyzer:** [Name/Role]
**Codebase Version:** [Git commit hash, tag, or "current"]
**Overall Confidence:** [%] (High/Medium/Low)
**Status:** [Draft | Under Validation | Approved]

---

## 1. Executive Summary

### Current State Overview

[1-2 paragraphs describing what the product does today, who uses it, and its core value proposition]

**Example:**
```
ShopNow is an e-commerce platform built in 2019 using Node.js/Express backend and React frontend. Currently serves 5,000 monthly active customers across 200 small retail businesses. Platform enables merchants to create online stores, manage inventory, process orders, and accept payments via Stripe integration.
```

### Key Findings

**Features Identified:**
- **Core Features:** [X] features (business-critical capabilities)
- **Secondary Features:** [Y] features (important but not critical)
- **Legacy Features:** [Z] features (deprecated or low-usage)

**Overall Confidence:** [%]
- High Confidence: [%] of features
- Medium Confidence: [%] of features
- Low Confidence: [%] of features (requires validation)

**Technology Stack:**
- Backend: [Languages/Frameworks]
- Frontend: [Frameworks/Libraries]
- Database: [Database systems]
- Infrastructure: [Hosting/Cloud]

**Example:**
```
Features Identified:
- Core Features: 12 (product catalog, orders, payments, inventory)
- Secondary Features: 8 (reviews, wishlists, analytics, email notifications)
- Legacy Features: 3 (social login v1, old

 checkout flow, deprecated API)

Overall Confidence: 76% (Medium-High)
- High Confidence: 65% of features (clear implementation, well-tested)
- Medium Confidence: 30% of features (understandable but needs validation)
- Low Confidence: 5% of features (requires stakeholder input)

Technology Stack:
- Backend: Node.js 16, Express 4.18, TypeScript 4.9
- Frontend: React 18, Redux Toolkit, Tailwind CSS
- Database: PostgreSQL 14, Redis 7 (sessions/cache)
- Infrastructure: AWS (EC2, RDS, S3), Docker
```

### Top Modernization Priorities

[3-5 highest-priority improvements identified]

**Example:**
```
1. **Upgrade Payment Processing** (High Impact, High Confidence)
   - Current: Stripe API v1 (deprecated)
   - Opportunity: Migrate to Stripe v3, add Apple Pay/Google Pay
   - Impact: Reduce payment failures by ~20%, increase conversions

2. **Fix Performance Bottlenecks** (High Impact, Medium Confidence)
   - Current: Slow product search (3-5s), no caching
   - Opportunity: Implement Elasticsearch, Redis caching
   - Impact: Reduce search time to <500ms, improve UX

3. **Mobile Optimization** (Medium Impact, High Confidence)
   - Current: Desktop-only design, poor mobile UX
   - Opportunity: Responsive design, mobile-first approach
   - Impact: Capture 40% mobile traffic (currently 10% conversion)
```

---

## 2. Product Overview (As-Is)

### What It Does

[Clear, comprehensive description of product functionality]

**Example:**
```
ShopNow is an e-commerce platform for small retail businesses to sell products online. Merchants can:
- Create and manage online stores with custom branding
- Add products with images, descriptions, and pricing
- Manage inventory across multiple locations
- Process orders and track fulfillment
- Accept payments via credit card (Stripe)
- Generate sales reports and analytics

Customers can:
- Browse products by category
- Search for products
- Add items to cart
- Checkout with credit card or saved payment
- View order history
- Leave product reviews
```

### Current Users (Inferred)

**Merchant Persona:**
- **Type:** Small retail business owners (2-10 employees)
- **Goal:** Sell products online without technical expertise
- **Pain:** Limited budget, need simple solution
- **Behavior:** Use admin dashboard daily, mobile access for order management

**Customer Persona:**
- **Type:** General consumers, various demographics
- **Goal:** Browse and purchase products conveniently
- **Pain:** Expect fast, mobile-friendly experience
- **Behavior:** 60% desktop, 40% mobile traffic

### Technology Stack

**Backend:**
- **Runtime:** Node.js 16.x
- **Framework:** Express 4.18
- **Language:** TypeScript 4.9 (90% coverage, some legacy JS)
- **API:** REST (JSON)

**Frontend:**
- **Framework:** React 18
- **State:** Redux Toolkit
- **Styling:** Tailwind CSS
- **Build:** Webpack 5

**Database:**
- **Primary:** PostgreSQL 14 (products, orders, users)
- **Cache:** Redis 7 (sessions, product cache)

**Integrations:**
- **Payments:** Stripe API v1 (⚠️ deprecated)
- **Email:** SendGrid
- **Storage:** AWS S3 (product images)
- **Analytics:** Google Analytics

**Infrastructure:**
- **Hosting:** AWS EC2 (t3.medium instances)
- **Database:** AWS RDS PostgreSQL
- **CDN:** CloudFront
- **Container:** Docker

---

## 3. Feature Inventory

### Core Features (Business-Critical)

#### Feature 1: Product Catalog Management

**Confidence:** 90% (High)

**Description:** Merchants can create, edit, and organize products with images, descriptions, pricing, and inventory quantities.

**User Value:** Enables merchants to showcase and sell their products online.

**Technical Implementation:**
- **Database:** `products` table (id, name, description, price, stock, merchant_id)
- **API:** RESTful endpoints (GET/POST/PUT/DELETE /api/products)
- **Storage:** Product images on AWS S3
- **Search:** Basic SQL search (name, description) - ⚠️ performance issue for large catalogs

**Usage Indicators:**
- Most frequently used feature (admin dashboard analytics)
- 50+ API calls per merchant per day
- Recent updates (last updated 2 weeks ago)

**Evidence:**
- ✅ Clear, well-documented code in `src/products/`
- ✅ Comprehensive unit tests (95% coverage)
- ✅ TypeScript type definitions
- ⚠️ Search performance degrades with >1,000 products (known issue in backlog)

**Validation Needed:** None (implementation clear and tested)

---

#### Feature 2: Order Processing

**Confidence:** 85% (High)

**Description:** Customers can place orders, merchants can view and fulfill orders, system tracks order lifecycle.

**User Value:** Core e-commerce functionality - without this, no sales possible.

**Technical Implementation:**
- **Database:** `orders` table (id, customer_id, status, total), `order_items` (product_id, quantity, price)
- **Status Flow:** `pending` → `confirmed` → `shipped` → `delivered` (or `cancelled`)
- **Payment:** Integrated with Stripe (creates PaymentIntent on checkout)
- **Email:** Order confirmation sent via SendGrid

**Usage Indicators:**
- Second most critical feature
- ~200 orders per day across all merchants
- Active development (updates weekly)

**Evidence:**
- ✅ Well-structured code in `src/orders/`
- ✅ Good test coverage (80%)
- ⚠️ No integration tests with Stripe (only mocked)

**Validation Needed:**
- ❓ What happens if payment succeeds but order creation fails? (retry logic unclear)
- ❓ How are partial refunds handled? (code found but not tested)

**Assumptions (to validate):**
- Payments are not retried on failure (no retry logic found)
- Partial refunds are manual process (admin-only feature, no customer-facing UI)

---

### Secondary Features

#### Feature 3: Product Reviews

**Confidence:** 70% (Medium)

**Description:** Customers can leave star ratings and text reviews on products they've purchased.

**User Value:** Social proof, helps customers make informed decisions.

**Technical Implementation:**
- **Database:** `reviews` table (product_id, customer_id, rating, comment, created_at)
- **Validation:** Customers must have purchased product to review
- **Moderation:** No moderation system found (⚠️ potential issue)

**Usage Indicators:**
- ~30% of customers leave reviews
- Moderate code complexity
- Last updated 6 months ago

**Evidence:**
- ⚠️ Code is understandable but lacks documentation
- ⚠️ Limited tests (only happy path covered)
- ❌ No spam/abuse prevention found

**Validation Needed:**
- ❓ Is review moderation handled manually?
- ❓ Can users edit or delete reviews?
- ❓ How is review spam prevented?

**Assumptions:**
- Manual review moderation (no automated system found)
- Reviews cannot be edited after posting (no edit UI or API endpoint)

---

### Legacy Features (Deprecated/Low Usage)

#### Feature 4: Social Login (v1)

**Confidence:** 50% (Medium-Low)

**Description:** Login with Facebook or Google OAuth (old implementation).

**Status:** ⚠️ Appears deprecated - code exists but feature flagged off, replaced by v2

**Technical Implementation:**
- Old OAuth flow in `src/auth/social-legacy.js`
- Feature flag: `ENABLE_SOCIAL_LOGIN_V1 = false`
- New implementation in `src/auth/social.js` (v2)

**Evidence:**
- ❌ Old code (last updated 2 years ago)
- ❌ Feature flagged off in production
- ✅ New v2 implementation exists and is active

**Validation Needed:**
- ❗ Can legacy code be removed? (breaking change for old accounts?)
- ❗ Have all users migrated to v2?

**Recommendation:**
- 🚨 HIGH PRIORITY: Validate migration status, deprecate and remove legacy code

---

## 4. User Flows (Reconstructed)

### Flow 1: Customer Purchase Journey

**Confidence:** 85% (High)

**Steps:**
1. **Browse Products**
   - Entry: Homepage or category pages
   - Code: `ProductListPage.jsx`, API: `GET /api/products`

2. **View Product Details**
   - Code: `ProductDetailPage.jsx`, API: `GET /api/products/:id`

3. **Add to Cart**
   - Code: `CartService.js`, API: `POST /api/cart`
   - Storage: Redis (session-based cart)

4. **Proceed to Checkout**
   - Code: `CheckoutPage.jsx`
   - Collect: Shipping address, payment method

5. **Complete Payment**
   - Integration: Stripe PaymentIntent API
   - Code: `PaymentService.js`, API: `POST /api/checkout`

6. **Order Confirmation**
   - Creates order record in database
   - Sends confirmation email (SendGrid)
   - Redirects to order success page

**Validation Needed:**
- ❓ Guest checkout supported? (user account required, but flow unclear)
- ❓ What happens if payment succeeds but email fails?

---

## 5. Known Limitations & Technical Debt

### Functional Gaps

**Gap 1: Mobile App**
- **Issue:** No native mobile app, mobile web experience poor
- **Impact:** 40% of traffic is mobile but only 10% conversion (vs 25% desktop)
- **Opportunity:** Build React Native app or improve responsive design

**Gap 2: Multi-Currency Support**
- **Issue:** USD only, no international sales
- **Impact:** Limits market expansion
- **Opportunity:** Add currency conversion, international payment methods

### Technical Debt

**Debt 1: Stripe API v1 (Deprecated)**
- **Issue:** Using deprecated Stripe API, will be sunset in 2024
- **Risk:** HIGH - payments will break when API deprecated
- **Effort:** ~2 weeks to migrate to Stripe v3
- **Priority:** 🚨 CRITICAL - Must address before Q4 2024

**Debt 2: No Caching Strategy**
- **Issue:** Database queries on every request, no caching
- **Impact:** Slow page load times (3-5s), poor UX
- **Opportunity:** Implement Redis caching for products, reduce DB load by 80%

**Debt 3: Monolithic Architecture**
- **Issue:** Single codebase, tightly coupled
- **Impact:** Difficult to scale, long deploy times
- **Opportunity:** Consider microservices for high-traffic features (products, orders)

### Performance Issues

**Issue 1: Product Search Performance**
- **Symptom:** Search takes 3-5 seconds for catalogs >1,000 products
- **Root Cause:** Using SQL LIKE queries, no indexing
- **Solution:** Implement Elasticsearch, add Redis caching
- **Estimated Impact:** <500ms search time, 90% improvement

**Issue 2: Image Loading**
- **Symptom:** Product images slow to load (2-3s each)
- **Root Cause:** Images not optimized, no lazy loading
- **Solution:** Image optimization, lazy loading, CDN
- **Estimated Impact:** 50% faster page loads

### Security Concerns

**Concern 1: No Rate Limiting**
- **Issue:** No rate limiting on API endpoints
- **Risk:** Vulnerable to DDoS, brute force attacks
- **Priority:** MEDIUM - Add rate limiting middleware

**Concern 2: Weak Password Policy**
- **Issue:** Minimum 6 characters, no complexity requirements
- **Risk:** Account compromise
- **Priority:** LOW - Update to 8+ chars with complexity

---

## 6. Modernization Opportunities

### Priority 1: High Impact, High Confidence

**Opportunity 1: Upgrade Stripe API**
- **Current:** Stripe API v1 (deprecated, sunset 2024)
- **Proposed:** Migrate to Stripe v3, add Apple Pay/Google Pay
- **Impact:** 🚨 CRITICAL - Prevent payment breakage, increase payment methods
- **Effort:** 2 weeks
- **Confidence:** 95% (clear migration path)

**Opportunity 2: Implement Product Search with Elasticsearch**
- **Current:** SQL LIKE queries, slow for large catalogs (3-5s)
- **Proposed:** Elasticsearch integration with Redis caching
- **Impact:** 90% faster search (<500ms), better UX, increased conversions
- **Effort:** 3 weeks
- **Confidence:** 90% (proven solution)

### Priority 2: Medium Impact, High Confidence

**Opportunity 3: Responsive Design for Mobile**
- **Current:** Desktop-only, poor mobile experience (10% conversion)
- **Proposed:** Mobile-first responsive design
- **Impact:** Capture 40% mobile traffic, 2-3x mobile conversions
- **Effort:** 4-6 weeks
- **Confidence:** 90%

**Opportunity 4: Implement Caching Strategy**
- **Current:** No caching, every request hits database
- **Proposed:** Redis caching for products, user sessions, API responses
- **Impact:** 50-70% faster page loads, reduced DB load
- **Effort:** 2 weeks
- **Confidence:** 95%

### Priority 3: Lower Priority Improvements

**Opportunity 5: Multi-Currency Support**
- **Impact:** Enable international expansion
- **Effort:** 6-8 weeks
- **Confidence:** 70% (requires payment provider support)

---

## 7. Integration Map

### External Integrations

| Service | Purpose | Version | Status | Risk |
|---------|---------|---------|--------|------|
| Stripe | Payment processing | v1 | ⚠️ Deprecated | HIGH (sunset 2024) |
| SendGrid | Transactional emails | v3 | ✅ Current | LOW |
| AWS S3 | Image storage | Current | ✅ Stable | LOW |
| Google Analytics | Usage analytics | UA | ⚠️ Sunset (migrate to GA4) | MEDIUM |

---

## 8. Validation Checklist

### High Priority Validation

- [ ] **Stripe Migration:** Confirm sunset timeline with Stripe support
- [ ] **Payment Flow:** Validate retry/fallback logic with stakeholders
- [ ] **Mobile Strategy:** Confirm responsive web vs native app decision
- [ ] **Legacy Social Login:** Verify all users migrated to v2

### Medium Priority Validation

- [ ] **Review Moderation:** How is spam currently handled?
- [ ] **Search Requirements:** What search features do merchants need?
- [ ] **Multi-Currency:** Is international expansion planned?

### Low Priority Validation

- [ ] **Guest Checkout:** Should this be enabled?
- [ ] **Product Variants:** Are size/color variants needed?

---

## 9. Recommendations

### Immediate Actions (0-3 months)

1. **Migrate to Stripe API v3** (🚨 CRITICAL, 2 weeks)
2. **Implement Elasticsearch for Search** (HIGH, 3 weeks)
3. **Add Redis Caching** (MEDIUM, 2 weeks)
4. **Responsive Mobile Design** (HIGH, 6 weeks)

### Medium-Term (3-6 months)

5. **Remove Legacy Social Login Code** (LOW, 1 week)
6. **Image Optimization** (MEDIUM, 2 weeks)
7. **Rate Limiting** (MEDIUM, 1 week)
8. **Migrate to Google Analytics 4** (LOW, 1 week)

### Long-Term (6-12 months)

9. **Multi-Currency Support** (6-8 weeks)
10. **Microservices Architecture** (12-16 weeks, major refactor)

### Do Not Invest

- **Legacy Social Login v1** - Deprecated, remove instead
- **Old Checkout Flow** - Replaced by new flow, can be removed

---

## 10. Appendices

### Appendix A: Confidence Score Distribution

```
Features by Confidence:
- High (90-100%): 13 features (65%)
- Medium (60-89%): 6 features (30%)
- Low (0-59%): 1 feature (5%)

Areas Requiring Validation:
- Payment error handling (medium confidence)
- Review moderation process (medium confidence)
- Legacy feature migration status (low confidence)
```

### Appendix B: Technology Debt

```
Deprecated/EOL Technology:
- Stripe API v1 (sunset 2024) 🚨
- Google Analytics UA (sunset 2023) ⚠️

Outdated Dependencies:
- React 16 → 18 (migrated)
- Node 14 → 16 (migrated)
```

### Appendix C: Analysis Methodology

```
Analysis Date: [Date]
Codebase Version: [Git hash]
Tools Used:
- document-project skill for architecture
- Manual code review for features
- Git history for maintenance status
- Test coverage reports

Time Spent: [X hours]
```

---

**END OF BROWNFIELD PRD TEMPLATE**

**Use this template to document existing systems systematically with confidence scoring**
