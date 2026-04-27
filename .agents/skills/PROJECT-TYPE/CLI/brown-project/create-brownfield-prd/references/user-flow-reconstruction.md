# User Flow Reconstruction Guide

## Overview

User flow reconstruction is the process of reverse-engineering user journeys from code structure. By analyzing routes, navigation patterns, API calls, and state transitions, we can reconstruct how users interact with the system end-to-end.

---

## Core Principle: Code Paths → User Journeys

**Reconstruction Framework:**
```
Code Structure → Technical Flow → User Journey → User Value

Example:
Code: Route chain (/, /products, /products/:id, /cart, /checkout)
Technical: HTTP requests and page loads
User Journey: Browse → View Details → Add to Cart → Purchase
User Value: "Customer completes a purchase"
```

---

## Technique 1: Route Chain Analysis

### Web Application Routes

**Pattern: Sequential Route Access**

```javascript
// routes/index.js
app.get('/', homeController);
app.get('/products', productListController);
app.get('/products/:id', productDetailController);
app.post('/cart', authMiddleware, addToCartController);
app.get('/cart', authMiddleware, viewCartController);
app.get('/checkout', authMiddleware, checkoutController);
app.post('/checkout', authMiddleware, processCheckoutController);
app.get('/orders/:id', authMiddleware, orderConfirmationController);

// Reconstruct User Flow:

FLOW 1: New Customer Purchase Journey
Confidence: 90% (High)

Steps:
1. Landing
   - Route: GET /
   - Page: Homepage
   - User Action: Browse featured products, see promotions

2. Browse Products
   - Route: GET /products
   - Page: Product listing with search/filters
   - User Action: Search or filter products

3. View Product Details
   - Route: GET /products/:id
   - Page: Product detail page
   - User Action: Read description, see images, check reviews
   - Decision Point: Add to cart or continue browsing

4. Add to Cart
   - Route: POST /cart (requires auth)
   - Action: Item added to session cart
   - User Action: Click "Add to Cart" button
   - Note: Auth required (user must login/signup)

5. Review Cart
   - Route: GET /cart (requires auth)
   - Page: Shopping cart page
   - User Action: Review items, adjust quantities
   - Decision Point: Proceed to checkout or continue shopping

6. Checkout
   - Route: GET /checkout (requires auth)
   - Page: Checkout form (shipping, payment)
   - User Action: Enter shipping address, payment details

7. Complete Purchase
   - Route: POST /checkout (requires auth)
   - Action: Process payment, create order
   - Backend: Payment API call, inventory update

8. Order Confirmation
   - Route: GET /orders/:id (requires auth)
   - Page: Order confirmation with order number
   - User Action: View order details, receive email confirmation

Validation Needed:
❓ Guest checkout supported? (authMiddleware on cart/checkout suggests no)
❓ What happens if payment fails? (error handling flow unclear)
❓ Can users save cart and return later? (session-based or persistent?)
```

---

### API Flow Analysis

```javascript
// Frontend API calls (from React app)
// HomePage.jsx
useEffect(() => {
  api.get('/api/featured-products'); // Load featured items
}, []);

// ProductListPage.jsx
useEffect(() => {
  api.get(`/api/products?category=${category}&search=${search}`);
}, [category, search]);

// ProductDetailPage.jsx
useEffect(() => {
  api.get(`/api/products/${productId}`);
  api.get(`/api/products/${productId}/reviews`);
  api.get(`/api/products/${productId}/related`);
}, [productId]);

// CheckoutPage.jsx
const handleCheckout = async () => {
  // 1. Validate cart
  await api.get('/api/cart/validate');

  // 2. Calculate final total
  const pricing = await api.post('/api/checkout/calculate', { items, shipping });

  // 3. Process payment
  const payment = await api.post('/api/payments/process', { paymentMethod });

  // 4. Create order
  const order = await api.post('/api/orders', { items, shipping, paymentId: payment.id });

  // 5. Clear cart
  await api.delete('/api/cart');

  // 6. Navigate to confirmation
  navigate(`/orders/${order.id}`);
};

// Reconstruct Backend Flow:

FLOW 2: Checkout Backend Process
Confidence: 85% (High)

Technical Steps:
1. Cart Validation
   - Endpoint: GET /api/cart/validate
   - Purpose: Check stock availability, valid items
   - Response: {valid: true} or {valid: false, issues: [...]}

2. Price Calculation
   - Endpoint: POST /api/checkout/calculate
   - Input: {items, shipping}
   - Purpose: Calculate subtotal, tax, shipping, discounts
   - Response: {subtotal, tax, shipping, discount, total}

3. Payment Processing
   - Endpoint: POST /api/payments/process
   - Integration: External payment API (Stripe?)
   - Purpose: Charge customer payment method
   - Response: {paymentId, status}

4. Order Creation
   - Endpoint: POST /api/orders
   - Input: {items, shipping, paymentId}
   - Purpose: Create order record in database
   - Side Effects:
     * Inventory decremented
     * Email confirmation sent
     * Warehouse notified
   - Response: {orderId, orderNumber, estimatedDelivery}

5. Cart Cleanup
   - Endpoint: DELETE /api/cart
   - Purpose: Clear user's shopping cart
   - Response: 204 No Content

User Experience:
✅ Multi-step validation (cart → pricing → payment → order)
✅ Atomic transaction (payment success → order creation)
⚠️ Error handling unclear (what if step 3 succeeds but step 4 fails?)

Validation Needed:
❓ Payment retry logic? (if payment API times out)
❓ Inventory reservation? (prevent race condition between validation and purchase)
❓ Rollback strategy? (if order creation fails after payment)
```

---

## Technique 2: Navigation Structure Analysis

### React Navigation Example

```javascript
// App.js - Main navigation structure
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigation
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main app navigator
function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Auth flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />

        {/* Main app */}
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />

        {/* Detail screens */}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Reconstruct User Flows:

FLOW 1: First Launch Experience
Confidence: 95% (High)

1. App Launch → Splash Screen
   - Purpose: Load app, check auth status
   - Decision: If logged in → Main, else → Login

2a. Not Authenticated → Login Screen
   - Options: Login with existing account OR Signup
   - Login success → Main (Home tab)
   - Signup → Create account → Main (Home tab)

2b. Already Authenticated → Main (Home tab)
   - Direct access to app

Navigation Structure:
✅ Tab-based navigation (Home, Search, Cart, Profile)
✅ Stack navigation for detail screens
✅ Auth gate (Splash → Login/Signup → Main)

FLOW 2: Product Discovery & Purchase
Confidence: 90% (High)

1. Home Tab
   - Entry: Featured products, promotions
   - Action: Browse or tap "Search" tab

2. Search Tab
   - Action: Search by keyword or category
   - Result: Product list

3. Product Card Tap → ProductDetail Screen
   - Stack navigation (pushes onto stack)
   - Action: View details, read reviews
   - CTA: "Add to Cart" button

4. Add to Cart → Cart Tab Badge Updates
   - Badge: Cart item count increases
   - No navigation (stays on ProductDetail)

5. Cart Tab
   - View: All cart items
   - Action: Review quantities, remove items
   - CTA: "Checkout" button

6. Checkout Screen
   - Stack navigation (pushes onto stack)
   - Form: Shipping address, payment method
   - Action: Submit order

7. OrderConfirmation Screen
   - Stack navigation (pushes onto stack)
   - View: Order number, estimated delivery
   - Action: "View Order" or "Continue Shopping"

8a. View Order → OrderDetail Screen
   - Stack navigation
   - View: Order status, tracking

8b. Continue Shopping → Navigate back to Home tab
   - Reset stack or pop to Main

User Experience:
✅ Persistent bottom tabs (always accessible)
✅ Stack navigation for detail views (natural back button behavior)
✅ Cart badge provides status indicator
⚠️ Deep linking unclear (can users open specific product from push notification?)

Validation Needed:
❓ What happens after logout? (navigate back to Login?)
❓ Can users navigate back after order placed? (prevent duplicate orders?)
❓ Deep linking supported? (URLs → specific screens)
```

---

## Technique 3: State Machine Flow Analysis

### Order Status Workflow

```javascript
// models/Order.js
const ORDER_STATES = {
  DRAFT: 'draft',               // Cart not yet checked out
  PENDING: 'pending',           // Order placed, payment processing
  CONFIRMED: 'confirmed',       // Payment successful
  PREPARING: 'preparing',       // Warehouse packing
  SHIPPED: 'shipped',           // Package shipped
  DELIVERED: 'delivered',       // Customer received
  CANCELLED: 'cancelled',       // Order cancelled
  REFUNDED: 'refunded'          // Order refunded
};

const STATE_TRANSITIONS = {
  draft: {
    next: ['pending', 'cancelled'],
    actions: ['checkout', 'abandon']
  },
  pending: {
    next: ['confirmed', 'cancelled'],
    actions: ['paymentSuccess', 'paymentFailed']
  },
  confirmed: {
    next: ['preparing', 'cancelled'],
    actions: ['startPreparation', 'customerCancel']
  },
  preparing: {
    next: ['shipped', 'cancelled'],
    actions: ['ship', 'customerCancel']
  },
  shipped: {
    next: ['delivered'],
    actions: ['confirmDelivery']
  },
  delivered: {
    next: ['refunded'],
    actions: ['processRefund']
  },
  cancelled: {
    next: [],
    actions: []
  },
  refunded: {
    next: [],
    actions: []
  }
};

// Event handlers
async function transitionOrder(orderId, newState, triggeredBy) {
  const order = await db.orders.findById(orderId);
  const allowedTransitions = STATE_TRANSITIONS[order.status].next;

  if (!allowedTransitions.includes(newState)) {
    throw new Error(`Invalid transition from ${order.status} to ${newState}`);
  }

  // Update order status
  await db.orders.update(orderId, { status: newState });

  // Side effects based on new state
  switch(newState) {
    case 'confirmed':
      await sendOrderConfirmationEmail(order);
      await notifyWarehouse(order);
      break;
    case 'shipped':
      await sendShippingNotification(order);
      await updateTrackingInfo(order);
      break;
    case 'delivered':
      await sendDeliveryConfirmation(order);
      await requestReview(order);
      break;
    case 'cancelled':
      await refundPayment(order);
      await restoreInventory(order);
      await sendCancellationEmail(order);
      break;
    case 'refunded':
      await refundPayment(order);
      await sendRefundConfirmation(order);
      break;
  }

  // Log transition
  await db.orderHistory.create({
    orderId,
    fromState: order.status,
    toState: newState,
    triggeredBy,
    timestamp: new Date()
  });
}

// Reconstruct User Flow:

FLOW: Order Lifecycle (Customer Perspective)
Confidence: 85% (High)

1. Shopping Cart (DRAFT)
   - User: Adding items to cart
   - System: Cart persisted as draft order
   - Actions Available: Checkout, Abandon cart

2. Order Placed (PENDING)
   - User: Clicked "Place Order"
   - System: Processing payment
   - Actions Available: None (waiting for payment)
   - User Experience: Loading spinner, "Processing your order..."

3. Order Confirmed (CONFIRMED)
   - User: Receives confirmation email
   - System: Payment successful, warehouse notified
   - Actions Available: Cancel order (window: before preparing)
   - Notifications: Email confirmation sent

4. Preparing for Shipment (PREPARING)
   - User: Order being packed
   - System: Warehouse processing
   - Actions Available: Cancel order (urgent cancellation)
   - User Experience: Status shows "Preparing shipment"

5. Order Shipped (SHIPPED)
   - User: Receives shipping notification with tracking
   - System: Package in transit
   - Actions Available: None (can't cancel after shipment)
   - Notifications: Shipping email with tracking link
   - User Experience: Track package button

6. Order Delivered (DELIVERED)
   - User: Package received
   - System: Delivery confirmed (carrier update or customer confirmation)
   - Actions Available: Request refund/return
   - Notifications: Delivery confirmation, review request
   - User Experience: "Rate your purchase" prompt

7a. Order Cancelled (CANCELLED)
   - User: Cancelled before shipment
   - System: Payment refunded, inventory restored
   - Terminal State: No further actions
   - Notifications: Cancellation confirmation, refund email

7b. Order Refunded (REFUNDED)
   - User: Returned after delivery
   - System: Refund processed
   - Terminal State: No further actions
   - Notifications: Refund confirmation

Business Rules Identified:
✅ Cancellation allowed: DRAFT, PENDING, CONFIRMED, PREPARING
✅ Cancellation not allowed: SHIPPED, DELIVERED (must request return)
✅ Automatic notifications: Confirmed, Shipped, Delivered, Cancelled, Refunded
✅ Inventory management: Restored on cancellation
✅ Payment handling: Refunded on cancellation or return

Validation Needed:
❓ Cancellation window after CONFIRMED? (e.g., 1 hour?)
❓ Partial refunds supported? (return some items)
❓ Who can cancel PREPARING orders? (customer? admin only?)
❓ Failed delivery handling? (reroute to PREPARING or CANCELLED?)
```

---

## Technique 4: Form Flow Analysis

### Multi-Step Forms

```javascript
// CheckoutPage.jsx
function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    shipping: {},
    billing: {},
    payment: {}
  });

  const steps = [
    { id: 1, name: 'Shipping', component: ShippingForm },
    { id: 2, name: 'Billing', component: BillingForm },
    { id: 3, name: 'Payment', component: PaymentForm },
    { id: 4, name: 'Review', component: OrderReview }
  ];

  const handleNext = async () => {
    // Validate current step
    const valid = await validateStep(step, formData);
    if (!valid) return;

    // Save progress
    await api.post('/api/checkout/save-progress', { step, data: formData });

    // Move to next step
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    // Final validation
    const valid = await validateAllSteps(formData);
    if (!valid) return;

    // Submit order
    try {
      const order = await api.post('/api/orders', formData);
      navigate(`/orders/${order.id}`);
    } catch (error) {
      showError('Order failed. Please try again.');
    }
  };

  return (
    <div>
      <ProgressIndicator currentStep={step} totalSteps={4} />
      <StepComponent step={step} data={formData} onChange={setFormData} />
      <ButtonGroup>
        {step > 1 && <Button onClick={handleBack}>Back</Button>}
        {step < 4 && <Button onClick={handleNext}>Next</Button>}
        {step === 4 && <Button onClick={handleSubmit}>Place Order</Button>}
      </ButtonGroup>
    </div>
  );
}

// Reconstruct User Flow:

FLOW: Checkout Process
Confidence: 90% (High)

Step 1: Shipping Information
- Fields: Name, address, city, state, zip, country
- Validation: Required fields, valid address format
- Optional: Save address to profile
- Action: "Next" button → Save progress, move to Step 2
- User Can: Go back to cart (abandon checkout)

Step 2: Billing Information
- Options: "Same as shipping" OR enter different billing address
- Fields: (if different) Name, address, city, state, zip, country
- Validation: Required fields if different from shipping
- Action: "Next" button → Save progress, move to Step 3
- User Can: Go back to Step 1 (edit shipping)

Step 3: Payment Information
- Fields: Card number, expiry, CVV, cardholder name
- Integration: Stripe.js (tokenize payment securely)
- Validation: Valid card number, expiry not past, CVV format
- Action: "Next" button → Tokenize payment, move to Step 4
- User Can: Go back to Step 2 (edit billing)
- Note: No payment charged yet (only tokenized)

Step 4: Order Review
- Display:
  * Cart summary (items, quantities, prices)
  * Shipping address
  * Billing address
  * Payment method (last 4 digits)
  * Order total (subtotal, tax, shipping, total)
- Action: "Place Order" button → Submit order
- User Can: Go back to any previous step (edit details)
- Backend Process:
  1. Final validation (all steps)
  2. Charge payment (Stripe API)
  3. Create order record
  4. Send confirmation email
  5. Redirect to order confirmation page

Progress Persistence:
✅ Progress saved on each step (auto-save)
✅ User can navigate back/forward
✅ Data persists if user leaves and returns (session-based)

Error Handling:
⚠️ Payment failure: Show error, stay on Step 4, allow retry
⚠️ Order creation failure: Payment succeeded but order failed (unclear handling - critical gap!)

User Experience:
✅ Progress indicator (visual feedback)
✅ Back/Next navigation (user control)
✅ Inline validation (immediate feedback)
✅ Review before submit (confidence)

Validation Needed:
❗ What if payment succeeds but order creation fails? (refund? retry? error state?)
❓ Can user save incomplete checkout and return later?
❓ Timeout for saved checkout progress? (expires after 30 min?)
❓ Guest checkout supported? (appears no, auth required)
```

---

## Technique 5: Authentication Flow Analysis

```javascript
// AuthContext.js
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (restore session)
    const checkAuth = async () => {
      try {
        const response = await api.get('/api/auth/me');
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    setUser(response.data.user);
    // Token stored in httpOnly cookie by backend
  };

  const signup = async (email, password, name) => {
    const response = await api.post('/api/auth/signup', { email, password, name });
    setUser(response.data.user);
    // Auto-login after signup
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    // Clear token cookie
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ProtectedRoute.js
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  return children;
}

// App.js
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />

  <Route path="/cart" element={
    <ProtectedRoute><CartPage /></ProtectedRoute>
  } />
  <Route path="/checkout" element={
    <ProtectedRoute><CheckoutPage /></ProtectedRoute>
  } />
  <Route path="/orders" element={
    <ProtectedRoute><OrderHistoryPage /></ProtectedRoute>
  } />
</Routes>

// Reconstruct Auth Flows:

FLOW 1: New User Signup & First Purchase
Confidence: 95% (High)

1. User lands on site (not authenticated)
   - Can browse: Home, Products, Product Details (public)
   - Cannot access: Cart, Checkout, Orders, Profile (protected)

2. User adds item to cart
   - Action: Click "Add to Cart"
   - Result: Redirect to /login (auth required)
   - Context: Attempted action remembered (return to cart after login)

3. User clicks "Sign Up"
   - Navigate: /login → /signup
   - Form: Email, password, name
   - Validation: Email format, password strength (8+ chars)

4. User submits signup
   - Backend: Create account, hash password, create session
   - Frontend: Store user in context, receive httpOnly cookie
   - Auto-login: User automatically logged in after signup
   - Redirect: Back to cart (original intent)

5. User continues to checkout
   - Access granted: Now authenticated
   - Flow: Cart → Checkout → Order Confirmation

FLOW 2: Returning User Login
Confidence: 95% (High)

1. User visits site
   - Loading: Check auth status (GET /api/auth/me)
   - Result A: Valid session → Auto-login (proceed to app)
   - Result B: No session → Public view (login required for protected routes)

2. User attempts protected action
   - Example: View cart, access profile
   - Redirect: Navigate to /login
   - Context: Remember attempted route (redirect after login)

3. User logs in
   - Form: Email, password
   - Backend: Verify credentials, create session
   - Frontend: Store user in context, receive httpOnly cookie
   - Redirect: Back to originally attempted route

FLOW 3: Session Management
Confidence: 85% (High)

Session Creation:
- Trigger: Successful login or signup
- Storage: httpOnly cookie (secure, not accessible via JS)
- Duration: Unclear (validation needed)

Session Validation:
- Every page load: GET /api/auth/me
- Protected routes: Check user context, redirect if null
- API requests: Cookie automatically sent with requests

Session Termination:
- Explicit: User clicks "Logout" → POST /api/auth/logout
- Implicit: Session expires (duration unknown)
- Result: Clear cookie, clear user context, redirect to login

Security Features:
✅ httpOnly cookies (XSS protection)
✅ Password hashing (not stored plain text)
✅ Auth required for sensitive routes
⚠️ Session duration unclear
⚠️ Refresh token mechanism unclear
⚠️ CSRF protection unclear

Validation Needed:
❓ Session duration/expiry? (30 min? 7 days?)
❓ "Remember me" option? (extend session)
❓ Refresh token for extending sessions?
❓ CSRF token validation?
❓ Rate limiting on login attempts? (brute force protection)
```

---

## Technique 6: Error Flow Analysis

```javascript
// Error handling in checkout process
async function processCheckout(req, res) {
  const { items, shipping, payment } = req.body;

  try {
    // Step 1: Validate cart
    const validation = await validateCart(items);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'INVALID_CART',
        message: 'Some items are no longer available',
        issues: validation.issues
      });
    }

    // Step 2: Calculate total
    const pricing = await calculatePricing(items, shipping);

    // Step 3: Process payment
    let paymentResult;
    try {
      paymentResult = await stripe.paymentIntents.create({
        amount: pricing.total,
        currency: 'usd',
        payment_method: payment.methodId,
        confirm: true
      });
    } catch (paymentError) {
      return res.status(402).json({
        error: 'PAYMENT_FAILED',
        message: paymentError.message,
        retry: true
      });
    }

    // Step 4: Create order
    let order;
    try {
      order = await db.orders.create({
        userId: req.user.id,
        items,
        shipping,
        total: pricing.total,
        paymentId: paymentResult.id,
        status: 'confirmed'
      });
    } catch (dbError) {
      // Critical: Payment succeeded but order creation failed
      // TODO: Refund payment or retry order creation?
      logger.error('Order creation failed after successful payment', {
        paymentId: paymentResult.id,
        error: dbError
      });

      // For now, return error and manual intervention needed
      return res.status(500).json({
        error: 'ORDER_CREATION_FAILED',
        message: 'Payment processed but order creation failed. Please contact support.',
        paymentId: paymentResult.id
      });
    }

    // Step 5: Post-order actions
    await Promise.all([
      updateInventory(items),
      sendOrderConfirmation(req.user.id, order.id),
      notifyWarehouse(order.id)
    ]).catch(error => {
      // Non-critical errors, log but don't fail request
      logger.warn('Post-order action failed', { orderId: order.id, error });
    });

    // Success
    return res.status(201).json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber
    });

  } catch (unexpectedError) {
    logger.error('Unexpected checkout error', { error: unexpectedError });
    return res.status(500).json({
      error: 'CHECKOUT_FAILED',
      message: 'An unexpected error occurred. Please try again.'
    });
  }
}

// Reconstruct Error Flows:

ERROR FLOW 1: Invalid Cart (400)
Confidence: 90% (High)

Trigger: Items out of stock or removed since added to cart
User Experience:
1. User clicks "Place Order"
2. Loading spinner
3. Error message: "Some items are no longer available"
4. Display specific issues (which items, why)
5. User action: Remove unavailable items, try again

Recovery: User-initiated (fix cart, retry)
Impact: LOW (preventable, clear feedback)

ERROR FLOW 2: Payment Failed (402)
Confidence: 85% (High)

Trigger: Payment declined (insufficient funds, invalid card, etc.)
User Experience:
1. User clicks "Place Order"
2. Loading spinner
3. Error message: "Payment failed: [reason]"
4. Stay on checkout page
5. User action: Update payment method, retry

Recovery: User-initiated (different payment method)
Impact: MEDIUM (blocks purchase, but recoverable)
Note: ✅ No order created if payment fails (no inconsistent state)

ERROR FLOW 3: Order Creation Failed After Payment (500) 🚨
Confidence: 60% (Medium)

Trigger: Database error or exception after successful payment
User Experience:
1. User clicks "Place Order"
2. Loading spinner
3. Payment charged successfully ✅
4. Order creation fails ❌
5. Error message: "Payment processed but order creation failed. Please contact support."
6. Display payment ID for reference

Recovery: Manual (customer support intervention)
Impact: HIGH (critical issue - money charged, no order)
Technical Debt:
❌ No automatic refund
❌ No retry logic
❌ Manual resolution required
🚨 CRITICAL GAP: This scenario needs robust handling

Recommended Fix:
- Option A: Implement automatic refund on order creation failure
- Option B: Implement retry logic with exponential backoff
- Option C: Queue order creation for async processing (payment succeeds → job queued)

ERROR FLOW 4: Post-Order Actions Failed
Confidence: 75% (Medium)

Trigger: Email sending failed, inventory update failed, warehouse notification failed
User Experience:
1. Order successfully created ✅
2. Some background tasks fail ❌
3. User sees success (order placed)
4. User doesn't receive confirmation email (potential confusion)

Impact: MEDIUM (order exists but communication failed)
Handling: ✅ Logged for monitoring, doesn't fail entire request
Improvement Opportunity: Retry failed background tasks

Validation Needed:
❓ Are failed background tasks retried?
❓ Alert system for critical failures? (inventory not decremented)
❓ Manual queue for failed emails? (resend later)
```

---

## User Flow Documentation Template

```markdown
## User Flow: [Flow Name]

**Confidence:** [X%] (High | Medium | Low)
**Category:** Core | Secondary
**User Type:** [Customer | Admin | Guest | etc.]

### Flow Description
[1-2 sentence summary of what this flow accomplishes]

### Entry Points
- [Where users start this flow]
- [Alternative entry points]

### Steps

#### Step 1: [Step Name]
**Route/Screen:** [Technical location]
**User Action:** [What user does]
**System Action:** [What happens behind the scenes]
**Decision Point:** [If applicable - user choices]

#### Step 2: [Step Name]
**Route/Screen:** [Technical location]
**User Action:** [What user does]
**System Action:** [What happens behind the scenes]
**API Calls:** [If applicable - backend requests]
**State Changes:** [If applicable - state updates]

[... Continue for all steps]

### Exit Points
- **Success:** [Where user ends up on success]
- **Failure:** [Where user ends up on failure]
- **Abandonment:** [What happens if user leaves mid-flow]

### Error Scenarios
1. **[Error Name]:** [How it's handled]
2. **[Error Name]:** [How it's handled]

### Business Rules Identified
- [Rule 1 observed in code]
- [Rule 2 inferred from logic]

### User Experience Notes
- ✅ [Positive UX observations]
- ⚠️ [UX concerns or potential improvements]

### Validation Needed
- ❓ [Question requiring stakeholder input]
- ❓ [Assumption to validate]
- ❗ [Critical unclear area]

### Related Flows
- [Flow 1 that connects to this]
- [Flow 2 that shares components]
```

---

## Flow Reconstruction Checklist

Before completing user flow reconstruction:

- [ ] All major user journeys identified (happy paths)
- [ ] Entry points documented (how users start flows)
- [ ] Exit points documented (success, failure, abandonment)
- [ ] Decision points identified (user choices in flows)
- [ ] Authentication requirements noted (protected steps)
- [ ] Error scenarios documented (failure flows)
- [ ] State transitions mapped (status changes)
- [ ] API call sequences identified (backend interactions)
- [ ] Side effects documented (emails, notifications, inventory updates)
- [ ] Business rules extracted from flow logic
- [ ] Confidence scores assigned to each flow
- [ ] Validation needs flagged for uncertain areas
- [ ] Related flows cross-referenced
- [ ] User experience gaps noted

---

**User Flow Reconstruction Guide - Part of create-brownfield-prd skill**
**Use these techniques to reverse-engineer user journeys from code structure**
