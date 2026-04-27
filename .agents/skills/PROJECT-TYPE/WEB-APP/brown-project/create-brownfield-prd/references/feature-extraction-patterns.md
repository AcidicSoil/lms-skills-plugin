# Feature Extraction Patterns

## Overview

Feature extraction is the process of transforming technical code components (routes, controllers, services, UI components) into user-facing product features. This guide provides systematic patterns for mapping code to features with appropriate categorization and confidence scoring.

---

## Core Principle: Code → User Value

**Translation Framework:**
```
Technical Component → User-Facing Feature → Business Value

Example:
Code: POST /api/orders endpoint
Feature: "Place Order"
Value: "Customers can complete purchases"
```

**Key Questions:**
1. What can users DO with this code?
2. What problem does this solve for users?
3. How does this contribute to product goals?

---

## Pattern 1: Route-Based Extraction (Web/API)

### REST API Endpoints

**Mapping Strategy:**
```
HTTP Method + Route → User Capability

GET    /api/products         → Browse Products
GET    /api/products/:id     → View Product Details
POST   /api/products         → Create Product (Admin)
PUT    /api/products/:id     → Update Product (Admin)
DELETE /api/products/:id     → Delete Product (Admin)
POST   /api/cart             → Add to Cart
GET    /api/cart             → View Cart
POST   /api/checkout         → Complete Purchase
```

**Grouping Related Endpoints:**
```
Feature: Product Catalog Management
└─ Browse products (GET /api/products)
└─ Search products (GET /api/products?search=...)
└─ Filter products (GET /api/products?category=...)
└─ View details (GET /api/products/:id)

Confidence: HIGH (clear CRUD operations, well-structured)
Category: Core (business-critical functionality)
```

**Example Analysis:**

```javascript
// routes/orders.js
router.get('/api/orders', authMiddleware, getOrders);
router.get('/api/orders/:id', authMiddleware, getOrderDetails);
router.post('/api/orders', authMiddleware, createOrder);
router.patch('/api/orders/:id/cancel', authMiddleware, cancelOrder);

// Extract:
Feature: Order Management
├─ View order history (GET /api/orders)
├─ View order details (GET /api/orders/:id)
├─ Place new order (POST /api/orders)
└─ Cancel order (PATCH /api/orders/:id/cancel)

Confidence: 90% (High)
- ✅ Clear RESTful structure
- ✅ Authentication required (authMiddleware)
- ✅ Standard CRUD operations
- ⚠️ Validation: Can all orders be cancelled? (need business rule validation)

Category: Core (essential e-commerce functionality)
User Value: Customers can track and manage their purchases
```

---

### GraphQL Schemas

**Mapping Strategy:**
```
Query/Mutation → User Capability

Queries (Read):
query products → Browse Products
query product(id) → View Product Details
query userOrders → View Order History

Mutations (Write):
mutation createOrder → Place Order
mutation updateProfile → Edit Profile
mutation addReview → Leave Product Review
```

**Example:**

```graphql
type Query {
  products(category: String, search: String): [Product!]!
  product(id: ID!): Product
  cart: Cart
  orders: [Order!]!
}

type Mutation {
  addToCart(productId: ID!, quantity: Int!): Cart
  removeFromCart(itemId: ID!): Cart
  checkout(shippingAddress: AddressInput!, paymentMethod: PaymentMethodInput!): Order
  cancelOrder(orderId: ID!): Order
}

// Extract:
Feature Set: E-commerce Shopping

Core Features:
1. Product Discovery
   - Browse products (products query)
   - Search products (products with search param)
   - Filter by category (products with category param)
   - View details (product query)
   Confidence: 95% (High) - Clear schema, type-safe

2. Shopping Cart
   - View cart (cart query)
   - Add items (addToCart mutation)
   - Remove items (removeFromCart mutation)
   Confidence: 90% (High) - Standard cart operations

3. Checkout & Orders
   - Complete purchase (checkout mutation)
   - View orders (orders query)
   - Cancel order (cancelOrder mutation)
   Confidence: 85% (High) - Need validation on cancellation rules

All Core Features (business-critical)
```

---

## Pattern 2: UI Component-Based Extraction (Frontend)

### Component Structure Analysis

**Mapping Strategy:**
```
Component/Screen → User Feature

Example (React):
components/
├── ProductList.jsx       → Browse Products
├── ProductDetail.jsx     → View Product Details
├── ShoppingCart.jsx      → Manage Cart
├── Checkout.jsx          → Complete Purchase
├── OrderHistory.jsx      → View Orders
└── UserProfile.jsx       → Manage Profile
```

**Example Analysis:**

```javascript
// ProductList.jsx
function ProductList() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting, pagination, filtering logic

  return (
    <div>
      <SearchBar onSearch={setSearchQuery} />
      <FilterPanel filters={filters} onFilterChange={setFilters} />
      <SortDropdown onSort={handleSort} />
      <ProductGrid products={products} />
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}

// Extract:
Feature: Product Discovery & Browsing
├─ Search products (SearchBar component)
├─ Filter products (FilterPanel component)
├─ Sort products (SortDropdown component)
├─ View as grid (ProductGrid component)
└─ Navigate pages (Pagination component)

Confidence: 85% (High)
- ✅ Clear component structure
- ✅ State management visible
- ✅ User interactions defined
- ⚠️ Validation: What filter options exist? (need to examine FilterPanel)

Category: Core (primary user workflow)
User Value: Customers can find products easily
```

**Form Components → Features:**

```javascript
// Checkout.jsx
function Checkout() {
  return (
    <div>
      <CartSummary />
      <ShippingAddressForm />
      <PaymentMethodForm />
      <OrderReviewSection />
      <PlaceOrderButton />
    </div>
  );
}

// Extract:
Feature: Checkout Process
Steps:
1. Review cart summary
2. Enter shipping address
3. Enter payment information
4. Review order
5. Place order

Confidence: 90% (High)
- ✅ Clear multi-step flow
- ✅ Form components for data collection
- ⚠️ Validation: Guest checkout supported? (need auth analysis)

Category: Core (critical conversion point)
User Value: Customers can complete purchases securely
```

---

### Navigation Structure → User Flows

**Mapping Strategy:**

```javascript
// React Router example
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/products" element={<ProductList />} />
  <Route path="/products/:id" element={<ProductDetail />} />
  <Route path="/cart" element={<ShoppingCart />} />
  <Route path="/checkout" element={<Checkout />} />
  <Route path="/orders" element={<OrderHistory />} />
  <Route path="/profile" element={<UserProfile />} />
  <Route path="/admin" element={<AdminDashboard />}>
    <Route path="products" element={<ProductManagement />} />
    <Route path="orders" element={<OrderManagement />} />
  </Route>
</Routes>

// Extract User Personas:
PERSONA 1: Customer
Entry Points: / (home), /products
Main Flow: Home → Products → Product Detail → Cart → Checkout → Orders
Features Used: Browse, Search, Cart, Checkout, Order History

PERSONA 2: Admin
Entry Point: /admin
Main Flow: Admin Dashboard → Product/Order Management
Features Used: Product CRUD, Order Management

Confidence: 95% (High) - Clear routing structure
```

---

## Pattern 3: Service/Business Logic Extraction

### Service Layer Analysis

**Mapping Strategy:**
```
Service Methods → Business Capabilities

Example:
class OrderService {
  createOrder()      → Place Order
  calculateTotal()   → Pricing/Tax Calculation
  applyDiscount()    → Discount System
  processPayment()   → Payment Processing
  sendConfirmation() → Order Notifications
}
```

**Example Analysis:**

```javascript
// services/OrderService.js
class OrderService {
  /**
   * Creates a new order from cart items
   */
  async createOrder(userId, cartItems, shippingAddress, paymentMethod) {
    // 1. Validate cart items (stock availability)
    const validation = await this.validateCart(cartItems);
    if (!validation.valid) throw new Error('Cart validation failed');

    // 2. Calculate totals
    const subtotal = this.calculateSubtotal(cartItems);
    const discount = await this.applyDiscount(userId, subtotal);
    const tax = this.calculateTax(subtotal - discount);
    const shipping = this.calculateShipping(shippingAddress);
    const total = subtotal - discount + tax + shipping;

    // 3. Process payment
    const payment = await this.processPayment(paymentMethod, total);
    if (!payment.success) throw new Error('Payment failed');

    // 4. Create order record
    const order = await db.orders.create({
      userId,
      items: cartItems,
      subtotal,
      discount,
      tax,
      shipping,
      total,
      status: 'pending',
      paymentId: payment.id
    });

    // 5. Update inventory
    await this.updateInventory(cartItems);

    // 6. Send notifications
    await this.sendOrderConfirmation(userId, order);
    await this.notifyWarehouse(order);

    return order;
  }

  calculateTax(amount) {
    return amount * 0.085; // 8.5% tax
  }

  calculateShipping(address) {
    if (address.country === 'US') return 5.99;
    return 15.99; // International
  }

  async applyDiscount(userId, subtotal) {
    const user = await db.users.findById(userId);
    if (user.tier === 'premium') return subtotal * 0.1; // 10% off
    if (user.tier === 'gold') return subtotal * 0.15; // 15% off
    return 0;
  }
}

// Extract Business Features:

Feature 1: Order Creation & Processing
Confidence: 85% (High)
Description: System creates orders from cart, processes payment, updates inventory
Technical Details:
- Cart validation (stock checks)
- Payment processing integration
- Automatic inventory updates
- Email notifications
User Value: Seamless order placement and confirmation
Category: Core

Feature 2: Pricing & Tax System
Confidence: 90% (High)
Description: Automatic tax calculation based on location
Business Rules:
- Tax rate: 8.5% (hardcoded) ⚠️ Single rate, no multi-state support
- Shipping: $5.99 US, $15.99 International
User Value: Transparent pricing with taxes included
Category: Core
Validation Needed:
❓ Is 8.5% tax rate correct for all US states?
❓ How are tax exemptions handled (business accounts)?

Feature 3: Discount System
Confidence: 75% (Medium)
Description: Tiered discounts based on user membership level
Business Rules:
- Premium tier: 10% discount
- Gold tier: 15% discount
- Regular tier: No discount
User Value: Loyalty rewards for premium members
Category: Secondary (enhances value but not critical)
Validation Needed:
❓ Can discounts stack with promotional codes?
❓ Maximum discount limit?
❓ Other user tiers exist?

Feature 4: Multi-Channel Notifications
Confidence: 90% (High)
Description: Order confirmations sent to customers and warehouse
Channels:
- Customer email (order confirmation)
- Warehouse notification (fulfillment alert)
User Value: Order visibility and tracking
Category: Core
```

---

## Pattern 4: Database Schema Extraction

### Data Model → Features

**Mapping Strategy:**
```
Tables/Collections → Domain Entities → Features

Example:
users table          → User accounts & authentication
products table       → Product catalog
orders table         → Order management
reviews table        → Product reviews
wishlists table      → Wishlist feature
```

**Example Analysis:**

```sql
-- Database Schema
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category_id INT REFERENCES categories(id),
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES products(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT one_review_per_user UNIQUE(product_id, user_id)
);

CREATE TABLE wishlists (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  product_id INT REFERENCES products(id),
  added_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_wishlist_item UNIQUE(user_id, product_id)
);

-- Extract Features:

Feature 1: Product Catalog
Confidence: 95% (High)
Evidence:
- ✅ Well-structured products table
- ✅ Categories relationship (category_id FK)
- ✅ Stock management (stock INT)
- ✅ Timestamps for tracking
Schema Indicators:
- Stock field → Inventory management feature
- Category relationship → Product categorization
- Image URL → Product images feature
Category: Core
User Value: Browse and discover products

Feature 2: Product Reviews
Confidence: 85% (High)
Evidence:
- ✅ Reviews table exists
- ✅ Rating constraint (1-5 stars)
- ✅ One review per user constraint
- ⚠️ No moderation fields (approved, flagged, etc.)
Business Rules Inferred:
- Users can rate products 1-5 stars
- Users can only review once per product
- Reviews tied to products (cascade delete)
Category: Secondary (social proof, valuable but not critical)
User Value: Read/write product reviews
Validation Needed:
❓ Can users edit/delete their reviews?
❓ Is there review moderation?
❓ Must user purchase product to review?

Feature 3: Wishlist
Confidence: 80% (High)
Evidence:
- ✅ Wishlists table exists
- ✅ Unique constraint (one product per user)
- ⚠️ Basic implementation (no notes, priority, etc.)
Business Rules:
- Users can save products to wishlist
- No duplicate products per user
Category: Secondary (convenience feature)
User Value: Save products for later purchase
Gaps Identified:
- No wishlist sharing capability (no share_token field)
- No priority/notes fields
- Basic implementation (potential enhancement opportunity)
```

---

## Pattern 5: Feature Categorization Framework

### Core vs Secondary vs Legacy

**Decision Tree:**

```
Is feature directly required for primary user goal?
├─ YES → Is it frequently used?
│  ├─ YES → CORE
│  └─ NO → Evaluate further
└─ NO → Is it valuable enhancement?
   ├─ YES → SECONDARY
   └─ NO → Is it still maintained?
      ├─ YES → COULD HAVE
      └─ NO → LEGACY
```

**Categorization Criteria:**

```
CORE FEATURES:
✓ Directly enables primary product value
✓ Frequently accessed (evidence: route usage, database activity)
✓ Complex business logic (significant code investment)
✓ Recent updates (actively maintained, updated <6 months)
✓ Multiple database tables involved
✓ Authentication/authorization required (important enough to protect)

Examples:
- User Authentication (can't use product without it)
- Product Catalog (core e-commerce function)
- Checkout Process (critical conversion point)
- Payment Processing (revenue-generating)

SECONDARY FEATURES:
✓ Enhances but doesn't enable core value
✓ Moderate complexity
✓ Some user requests for improvement
✓ Occasionally updated
✓ Single table or simple relationships

Examples:
- Product Reviews (valuable but not required to purchase)
- Wishlist (convenience feature)
- Email Notifications (helpful but not critical)
- User Profile Customization (nice-to-have)

LEGACY FEATURES:
✓ Old code (>2 years, no recent updates)
✓ Feature flags marking deprecated
✓ Commented-out code sections
✓ TODO comments suggesting removal
✓ No test coverage
✓ Replaced by newer implementation

Examples:
- Old API versions (v1 when v3 exists)
- Deprecated social login (OAuth 1.0 replaced by 2.0)
- Old checkout flow (replaced by new flow)
- Legacy admin UI (replaced by new dashboard)
```

**Example Categorization:**

```javascript
// E-commerce Platform Feature Analysis

CORE FEATURES (8):
1. User Authentication & Authorization (Confidence: 95%)
2. Product Catalog Management (Confidence: 90%)
3. Shopping Cart (Confidence: 90%)
4. Checkout Process (Confidence: 85%)
5. Payment Processing (Confidence: 80% - Stripe integration)
6. Order Management (Confidence: 85%)
7. Inventory Tracking (Confidence: 90%)
8. Admin Dashboard (Confidence: 85%)

SECONDARY FEATURES (6):
1. Product Reviews (Confidence: 70%)
2. Wishlist (Confidence: 75%)
3. Email Notifications (Confidence: 85%)
4. Search & Filtering (Confidence: 80%)
5. User Profile Management (Confidence: 90%)
6. Order History (Confidence: 85%)

LEGACY FEATURES (3):
1. Social Login v1 (Confidence: 50% - feature flagged off)
2. Old Checkout Flow (Confidence: 40% - replaced)
3. Legacy Analytics (Confidence: 30% - migrated to GA4)

FEATURE COUNT: 17 total
CONFIDENCE DISTRIBUTION:
- High (90-100%): 8 features (47%)
- Medium (60-89%): 7 features (41%)
- Low (0-59%): 2 features (12%)
```

---

## Pattern 6: Integration-Based Extraction

### Third-Party Integrations → Features

**Mapping Strategy:**
```
External Service → Product Feature

Stripe           → Payment Processing
SendGrid         → Email Notifications
AWS S3           → File/Image Storage
Twilio           → SMS Notifications
Google Analytics → Usage Analytics
Auth0            → Authentication
```

**Example Analysis:**

```javascript
// Environment Variables
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
SENDGRID_API_KEY=SG...
AWS_S3_BUCKET=my-app-uploads
AWS_S3_REGION=us-east-1
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

// package.json
"dependencies": {
  "stripe": "^12.0.0",
  "@sendgrid/mail": "^7.7.0",
  "aws-sdk": "^2.1400.0",
  "twilio": "^4.10.0"
}

// Extract Features:

Feature 1: Payment Processing
Confidence: 90% (High)
Evidence:
- ✅ Stripe SDK integrated (v12)
- ✅ API keys in environment
- ✅ Production keys (sk_live_...) → Live feature
Integration: Stripe (payment processor)
User Value: Secure credit card payments
Category: Core (revenue-generating)
Validation Needed:
❓ Payment methods supported? (credit card, Apple Pay, Google Pay?)
❓ International currencies supported?

Feature 2: Transactional Emails
Confidence: 85% (High)
Evidence:
- ✅ SendGrid SDK integrated
- ✅ API key configured
Integration: SendGrid (email service)
User Value: Order confirmations, password resets, notifications
Category: Core (critical communications)
Validation Needed:
❓ Email templates exist?
❓ What triggers emails? (order, signup, reset, etc.)

Feature 3: Image/File Storage
Confidence: 90% (High)
Evidence:
- ✅ AWS S3 SDK integrated
- ✅ Bucket and region configured
Integration: AWS S3 (cloud storage)
User Value: Product images, user uploads
Category: Core (essential for product catalog)

Feature 4: SMS Notifications
Confidence: 70% (Medium)
Evidence:
- ✅ Twilio SDK integrated
- ✅ Account credentials configured
- ⚠️ No code found using Twilio (search needed)
Integration: Twilio (SMS service)
User Value: Order updates, delivery notifications
Category: Secondary (enhancement, not critical)
Validation Needed:
❗ Is SMS actually used? (credentials exist but no usage found in code search)
❗ What triggers SMS? (order shipped, delivery, etc.)
```

---

## Pattern 7: State Machine Extraction

### Status/State Fields → Workflows

**Mapping Strategy:**
```
Status Enum → Feature Workflow

Example:
order_status: pending → confirmed → shipped → delivered
              ↓
           cancelled

Feature: Order Lifecycle Management
```

**Example Analysis:**

```javascript
// models/Order.js
const OrderStatus = {
  PENDING: 'pending',
  PAYMENT_PROCESSING: 'payment_processing',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

const orderStateMachine = {
  pending: ['payment_processing', 'cancelled'],
  payment_processing: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: []
};

// Extract Feature:

Feature: Order Lifecycle Management
Confidence: 90% (High)

Workflow:
1. Order Created → PENDING
2. Payment Initiated → PAYMENT_PROCESSING
3. Payment Success → CONFIRMED
4. Warehouse Processing → PREPARING
5. Package Shipped → SHIPPED
6. Customer Receives → DELIVERED

Cancellation Rules:
- Can cancel: PENDING, PAYMENT_PROCESSING, CONFIRMED, PREPARING
- Cannot cancel: SHIPPED, DELIVERED
- Refund available: DELIVERED (post-delivery refunds)

Business Rules Identified:
✅ Orders can be cancelled before shipment
✅ Delivered orders can be refunded (return process)
✅ No cancellation after shipment (customer must request return)

Category: Core (order management is business-critical)
User Value: Track order status and manage orders
Validation Needed:
❓ Who can cancel orders? (customer only, or admin too?)
❓ What triggers automatic state transitions?
❓ Are notifications sent on status changes?
```

---

## Pattern 8: Mobile App Structure Extraction

### Screen/Navigation → Features

**React Native Example:**

```javascript
// App.js
const AppNavigator = createStackNavigator({
  // Auth Flow
  Login: LoginScreen,
  Signup: SignupScreen,
  ForgotPassword: ForgotPasswordScreen,

  // Main Flow
  Home: HomeScreen,
  ProductList: ProductListScreen,
  ProductDetail: ProductDetailScreen,
  Cart: CartScreen,
  Checkout: CheckoutScreen,
  OrderConfirmation: OrderConfirmationScreen,

  // Profile Flow
  Profile: ProfileScreen,
  EditProfile: EditProfileScreen,
  OrderHistory: OrderHistoryScreen,
  OrderDetail: OrderDetailScreen,

  // Settings
  Settings: SettingsScreen,
  Notifications: NotificationsScreen
});

// Extract Features:

FEATURE SET 1: Authentication
Screens: Login, Signup, ForgotPassword
Confidence: 95% (High)
Flow:
1. Login → Enter credentials → Home
2. Signup → Create account → Home
3. ForgotPassword → Reset link → Login
Category: Core

FEATURE SET 2: Product Discovery & Shopping
Screens: Home, ProductList, ProductDetail, Cart
Confidence: 90% (High)
Flow:
1. Home → Browse featured products
2. ProductList → Search/filter products
3. ProductDetail → View details, add to cart
4. Cart → Review items, proceed to checkout
Category: Core

FEATURE SET 3: Checkout & Orders
Screens: Checkout, OrderConfirmation, OrderHistory, OrderDetail
Confidence: 90% (High)
Flow:
1. Checkout → Enter shipping/payment → Submit
2. OrderConfirmation → Order placed successfully
3. OrderHistory → View past orders
4. OrderDetail → Track specific order
Category: Core

FEATURE SET 4: User Profile
Screens: Profile, EditProfile, Settings, Notifications
Confidence: 85% (High)
Capabilities:
- View/edit profile
- Manage settings
- Configure notifications
Category: Secondary (important but not critical to shopping)
```

---

## Confidence Scoring During Extraction

### Scoring Checklist

For each extracted feature:

```
CODE QUALITY (30%):
- [ ] Clear, descriptive naming
- [ ] Reasonable structure and organization
- [ ] Modern patterns (not legacy code)

DOCUMENTATION (25%):
- [ ] Comments or docstrings present
- [ ] README or wiki mentions feature
- [ ] API documentation exists

TEST COVERAGE (20%):
- [ ] Unit tests exist
- [ ] Integration tests exist
- [ ] Tests pass and are maintained

MAINTENANCE (15%):
- [ ] Updated recently (<6 months)
- [ ] Active development evident
- [ ] Bug fixes/improvements committed

CONSISTENCY (10%):
- [ ] Follows codebase conventions
- [ ] Consistent with other features
- [ ] No conflicting implementations

CONFIDENCE SCORE: Sum of weighted percentages
- 90-100%: HIGH (trust the analysis)
- 60-89%: MEDIUM (validate assumptions)
- 0-59%: LOW (extensive validation required)
```

---

## Common Extraction Challenges

### Challenge 1: Ambiguous Feature Boundaries

**Problem:** Hard to tell where one feature ends and another begins

**Solution:** Group by user goal

```
Instead of:
- "Product search" (feature)
- "Product filtering" (feature)
- "Product sorting" (feature)

Group as:
Feature: Product Discovery
├─ Search by keyword
├─ Filter by attributes (category, price, rating)
└─ Sort results (relevance, price, newest)

Rationale: All serve single user goal (find products)
```

### Challenge 2: Technical vs User Features

**Problem:** Technical components don't map cleanly to user features

**Solution:** Focus on user value

```
Technical: "JWT token management service"
User Feature: "Secure Login & Session Management"

Technical: "Redis caching layer"
User Feature: "Fast Page Load Times" (non-functional feature)

Technical: "Webhook listener for Stripe events"
User Feature: "Payment Processing" (part of checkout feature)
```

### Challenge 3: Hidden Features

**Problem:** Features exist but not obvious from code structure

**Solution:** Multiple discovery techniques

```
Check:
1. Database triggers (automated features)
2. Background jobs (scheduled features)
3. Webhooks (integration features)
4. Event listeners (reactive features)
5. Cron jobs (periodic features)

Example:
Found: db.events.onCreate('order', sendToWarehouse)
Extract: "Automatic Warehouse Notification" (hidden feature)
```

---

## Feature Extraction Checklist

Before completing feature extraction:

- [ ] All major routes/endpoints analyzed
- [ ] UI components and screens reviewed
- [ ] Service layer business logic examined
- [ ] Database schema analyzed for entities
- [ ] Third-party integrations identified
- [ ] State machines and workflows documented
- [ ] Features categorized (Core/Secondary/Legacy)
- [ ] Confidence scores assigned to all features
- [ ] User value articulated for each feature
- [ ] Validation needs flagged for uncertain areas
- [ ] Feature relationships mapped (dependencies)
- [ ] Missing features noted (gaps in implementation)

---

**Feature Extraction Patterns - Part of create-brownfield-prd skill**
**Use these patterns to systematically transform code into product features**
