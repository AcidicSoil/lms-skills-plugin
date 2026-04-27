# Codebase Analysis Guide

## Overview

Systematic techniques for analyzing existing codebases to extract product requirements, understand architecture, and identify features. This guide provides a structured approach to code discovery for brownfield PRD generation.

---

## Analysis Methodology

### Phase 1: Project Structure Discovery

**Goal:** Understand high-level organization and technology stack

**Steps:**

1. **Identify Project Type**
   ```
   Web Application:
   - Look for: package.json, webpack.config.js, src/client/
   - Frontend: React, Vue, Angular indicators
   - Backend: Express, Django, Rails indicators

   Mobile Application:
   - Look for: android/, ios/, App.js (React Native)
   - Indicators: build.gradle, Podfile, AndroidManifest.xml

   API/Backend Service:
   - Look for: routes/, controllers/, api/, endpoints/
   - Indicators: REST routes, GraphQL schemas, OpenAPI specs

   CLI Tool:
   - Look for: bin/, cli/, commands/
   - Indicators: argparse, commander, yargs usage

   Library/SDK:
   - Look for: lib/, index.js, setup.py, __init__.py
   - Indicators: Public API exports, package distribution
   ```

2. **Map Directory Structure**
   ```bash
   # Generate structure overview
   tree -L 3 -I 'node_modules|venv|build|dist' > structure.txt
   ```

   **Common Patterns:**
   ```
   MVC Pattern:
   - models/ - Data models
   - views/ - UI templates
   - controllers/ - Business logic

   Feature-Based:
   - features/auth/ - Authentication feature
   - features/products/ - Products feature
   - features/orders/ - Orders feature

   Layered Architecture:
   - api/ - API layer
   - services/ - Business logic layer
   - repositories/ - Data access layer
   - models/ - Domain models
   ```

3. **Identify Technology Stack**
   ```
   Backend:
   - package.json → Node.js (Express, Fastify, NestJS)
   - requirements.txt → Python (Django, Flask, FastAPI)
   - Gemfile → Ruby (Rails, Sinatra)
   - pom.xml/build.gradle → Java (Spring Boot)
   - go.mod → Go

   Frontend:
   - package.json dependencies:
     - react, react-dom → React
     - vue → Vue.js
     - @angular/core → Angular
     - svelte → Svelte

   Database:
   - Look for: config/database.yml, knexfile.js, alembic/
   - Indicators: PostgreSQL, MySQL, MongoDB, Redis

   Infrastructure:
   - Docker → Dockerfile, docker-compose.yml
   - Kubernetes → k8s/, deployment.yaml
   - Cloud → AWS SDK, GCP SDK, Azure SDK
   ```

**Output:** Technology stack inventory and structural overview

---

### Phase 2: Entry Point Identification

**Goal:** Find where users interact with the system

**Techniques:**

#### For Web Applications

1. **Routes/Endpoints**
   ```javascript
   // Express.js example
   app.get('/api/products', ...)
   app.post('/api/orders', ...)
   app.get('/admin/dashboard', ...)

   // Extract:
   GET  /api/products → Browse products (public)
   POST /api/orders → Create order (authenticated)
   GET  /admin/dashboard → Admin panel (admin role)
   ```

2. **Frontend Routes**
   ```javascript
   // React Router example
   <Route path="/" component={HomePage} />
   <Route path="/products" component={ProductList} />
   <Route path="/products/:id" component={ProductDetail} />
   <Route path="/checkout" component={Checkout} />

   // Extract:
   User Flow: Home → Products → Product Detail → Checkout
   ```

3. **API Documentation**
   ```
   Look for:
   - OpenAPI/Swagger specs (swagger.json, openapi.yaml)
   - API routes definitions
   - Postman collections
   - GraphQL schemas
   ```

#### For Mobile Applications

1. **Screen Components**
   ```javascript
   // React Native example
   screens/
   ├── HomeScreen.js
   ├── ProductListScreen.js
   ├── ProductDetailScreen.js
   └── CheckoutScreen.js

   // Extract user flows from navigation
   ```

2. **Navigation Structure**
   ```javascript
   // React Navigation
   <Stack.Navigator>
     <Stack.Screen name="Home" component={HomeScreen} />
     <Stack.Screen name="Products" component={ProductsScreen} />
     <Stack.Screen name="Cart" component={CartScreen} />
   </Stack.Navigator>
   ```

#### For CLI Tools

1. **Command Definitions**
   ```javascript
   // Commander.js example
   program
     .command('deploy')
     .description('Deploy application')

   program
     .command('rollback')
     .description('Rollback to previous version')

   // Extract: deploy and rollback capabilities
   ```

**Output:** Entry points and user interaction surfaces

---

### Phase 3: Data Model Extraction

**Goal:** Understand entities, relationships, and business domain

**Techniques:**

1. **Database Schema Analysis**
   ```sql
   -- Look for migration files, schema definitions
   migrations/
   ├── 001_create_users.sql
   ├── 002_create_products.sql
   ├── 003_create_orders.sql
   └── 004_create_order_items.sql

   -- Extract entities:
   - users (id, email, password_hash, created_at)
   - products (id, name, description, price, stock)
   - orders (id, user_id, status, total, created_at)
   - order_items (id, order_id, product_id, quantity, price)

   -- Infer relationships:
   users 1→N orders (user can have multiple orders)
   orders 1→N order_items (order has multiple items)
   products 1→N order_items (product appears in multiple orders)
   ```

2. **ORM Models**
   ```python
   # Django example
   class User(models.Model):
       email = models.EmailField(unique=True)
       created_at = models.DateTimeField(auto_now_add=True)

   class Product(models.Model):
       name = models.CharField(max_length=200)
       price = models.DecimalField(max_digits=10, decimal_places=2)
       stock = models.IntegerField()

   class Order(models.Model):
       user = models.ForeignKey(User, on_delete=models.CASCADE)
       status = models.CharField(max_length=20)
       total = models.DecimalField(max_digits=10, decimal_places=2)

   # Extract:
   - Core entities: User, Product, Order
   - Relationships: Orders belong to Users
   - Business rules: Decimal pricing (2 decimal places)
   ```

3. **GraphQL Schemas**
   ```graphql
   type User {
     id: ID!
     email: String!
     orders: [Order!]!
   }

   type Product {
     id: ID!
     name: String!
     price: Float!
     stock: Int!
   }

   type Order {
     id: ID!
     user: User!
     items: [OrderItem!]!
     total: Float!
     status: OrderStatus!
   }

   enum OrderStatus {
     PENDING
     CONFIRMED
     SHIPPED
     DELIVERED
     CANCELLED
   }

   # Extract:
   - Domain model with relationships
   - Business statuses (order lifecycle)
   - Data types and constraints
   ```

**Output:** Entity-relationship diagram and domain model

---

### Phase 4: Business Logic Discovery

**Goal:** Understand core algorithms, workflows, and business rules

**Techniques:**

1. **Service Layer Analysis**
   ```javascript
   // OrderService.js
   class OrderService {
     async createOrder(userId, cartItems) {
       // Business logic extraction:
       // 1. Validate cart items (check stock)
       // 2. Calculate total (apply discounts, taxes)
       // 3. Process payment (Stripe integration)
       // 4. Create order record
       // 5. Send confirmation email
       // 6. Update inventory
     }

     async calculateTotal(items) {
       // Extract pricing rules:
       // - Subtotal = sum of (item price × quantity)
       // - Apply discounts (if any)
       // - Add tax (8.5%)
       // - Add shipping ($5.99 flat rate)
     }
   }

   // Extract:
   BUSINESS RULES:
   - Stock validation required before order
   - Discount system exists
   - Tax rate: 8.5%
   - Shipping: $5.99 flat rate
   - Payment: Stripe integration
   - Inventory: Decremented on order creation
   ```

2. **Validation Logic**
   ```javascript
   // Look for validation rules
   const schema = {
     email: {
       type: 'string',
       format: 'email',
       required: true
     },
     password: {
       type: 'string',
       minLength: 8,
       pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
     },
     age: {
       type: 'integer',
       minimum: 18
     }
   }

   // Extract:
   REQUIREMENTS:
   - Email required and must be valid format
   - Password: min 8 chars, must have uppercase, lowercase, number
   - Age restriction: 18+
   ```

3. **State Machines**
   ```javascript
   // Order status transitions
   const ORDER_TRANSITIONS = {
     PENDING: ['CONFIRMED', 'CANCELLED'],
     CONFIRMED: ['SHIPPED', 'CANCELLED'],
     SHIPPED: ['DELIVERED'],
     DELIVERED: [],
     CANCELLED: []
   }

   // Extract:
   ORDER LIFECYCLE:
   PENDING → CONFIRMED → SHIPPED → DELIVERED
            ↓           ↓
         CANCELLED   CANCELLED

   Business rules:
   - Can cancel before shipment
   - Cannot cancel after shipment
   - Final states: DELIVERED, CANCELLED
   ```

**Output:** Business rules and workflow documentation

---

### Phase 5: Integration Discovery

**Goal:** Identify external dependencies and data flows

**Techniques:**

1. **Environment Variables**
   ```bash
   # .env.example
   STRIPE_API_KEY=sk_test_...
   SENDGRID_API_KEY=SG....
   AWS_S3_BUCKET=my-product-images
   REDIS_URL=redis://localhost:6379
   DATABASE_URL=postgresql://localhost/mydb

   # Extract integrations:
   - Stripe (payments)
   - SendGrid (emails)
   - AWS S3 (file storage)
   - Redis (caching/sessions)
   - PostgreSQL (primary database)
   ```

2. **Third-Party SDK Usage**
   ```javascript
   // package.json dependencies
   "dependencies": {
     "stripe": "^10.0.0",
     "@sendgrid/mail": "^7.6.0",
     "aws-sdk": "^2.1050.0",
     "twilio": "^3.71.0"
   }

   // Search for usage in code
   grep -r "stripe" src/
   grep -r "sendgrid" src/
   grep -r "twilio" src/

   // Extract:
   - Stripe: Payment processing
   - SendGrid: Transactional emails
   - AWS: S3 for images
   - Twilio: SMS notifications (used in OrderService for delivery updates)
   ```

3. **API Calls**
   ```javascript
   // External API integrations
   axios.get('https://api.shippo.com/shipments', ...)
   axios.post('https://api.mailchimp.com/3.0/lists', ...)

   // Extract:
   - Shippo: Shipping label generation
   - Mailchimp: Email marketing lists
   ```

**Output:** Integration map with external services

---

## Analysis Patterns by Language/Framework

### Node.js/Express Analysis

**Key Files:**
```
package.json → Dependencies
routes/ → API endpoints
controllers/ → Business logic
models/ → Data models
middleware/ → Auth, validation
config/ → Configuration
```

**Quick Scan Commands:**
```bash
# Find all routes
grep -r "router\." src/routes/
grep -r "app\.(get|post|put|delete)" src/

# Find all models
find src/models -name "*.js"

# Find business logic
find src/services -name "*.js"
find src/controllers -name "*.js"
```

---

### Django/Python Analysis

**Key Files:**
```
requirements.txt → Dependencies
urls.py → URL routing
views.py → Request handlers
models.py → ORM models
settings.py → Configuration
migrations/ → Schema changes
```

**Quick Scan Commands:**
```bash
# Find all URL patterns
grep -r "path\(" */urls.py

# Find all models
grep -r "class.*models\.Model" */models.py

# Find all views
grep -r "def.*request" */views.py
```

---

### React/Frontend Analysis

**Key Files:**
```
package.json → Dependencies
src/App.js → Root component
src/routes/ → Routing
src/components/ → UI components
src/services/ → API calls
src/store/ → State management
```

**Quick Scan Commands:**
```bash
# Find all routes
grep -r "<Route" src/

# Find API calls
grep -r "fetch\|axios" src/

# Find state management
grep -r "useReducer\|useState\|Redux" src/
```

---

## Confidence Scoring During Analysis

### High Confidence (90-100%)

**Indicators:**
- Clear, descriptive naming (getUserOrders, calculateTotal)
- Good documentation (JSDoc, docstrings, README)
- Type definitions (TypeScript, type hints)
- Test coverage (unit tests present)
- Recent updates (actively maintained)
- Consistent patterns

**Example:**
```typescript
/**
 * Creates a new order for the user
 * @param userId - The ID of the user placing the order
 * @param items - Array of cart items
 * @returns The created order with ID
 * @throws {InsufficientStockError} If any item is out of stock
 */
async function createOrder(
  userId: string,
  items: CartItem[]
): Promise<Order> {
  // Implementation...
}

// Confidence: HIGH (95%)
// - Clear documentation
// - Type definitions
// - Error handling documented
```

---

### Medium Confidence (60-89%)

**Indicators:**
- Reasonable naming but some ambiguity
- Some documentation but incomplete
- Logic understandable but complex
- Few or no tests
- Some outdated patterns

**Example:**
```javascript
// Calculate price
function calc(items, user) {
  let total = 0;
  for (let item of items) {
    total += item.price * item.qty;
  }
  if (user.premium) {
    total *= 0.9; // 10% discount?
  }
  return total;
}

// Confidence: MEDIUM (70%)
// - Naming unclear (calc, qty)
// - No documentation
// - Magic numbers (0.9)
// - Logic understandable but unclear business rules
// VALIDATION NEEDED: Premium discount percentage?
```

---

### Low Confidence (0-59%)

**Indicators:**
- Cryptic naming (x, foo, tmp)
- No documentation
- Complex, unclear logic
- No tests
- Dead code or commented-out sections
- Very old code (5+ years no updates)

**Example:**
```javascript
// ???
function process(x, y, z) {
  let r = x * 1.085;
  if (y > 100) r -= 10;
  if (z) r *= 0.95;
  return r;
}

// Confidence: LOW (40%)
// - Cryptic naming (x, y, z, r)
// - No documentation
// - Magic numbers (1.085, 10, 0.95)
// - Unclear business logic
// VALIDATION NEEDED: What does this function do?
// GUESS: Maybe tax calculation? (1.085 = 8.5% tax?)
```

---

## Analysis Checklist

Before completing codebase analysis:

- [ ] Project structure mapped
- [ ] Technology stack identified
- [ ] Entry points documented (routes, screens, commands)
- [ ] Data models extracted (entities, relationships)
- [ ] Business logic analyzed (rules, workflows)
- [ ] Integrations identified (external services, APIs)
- [ ] Confidence scores assigned to all findings
- [ ] Validation needs flagged
- [ ] Quick wins identified (obvious improvements)
- [ ] Technical debt noted

---

## Tools & Commands

### Code Search
```bash
# Find all TODO comments
grep -r "TODO\|FIXME\|HACK" src/

# Find console.log (debug statements)
grep -r "console\.log" src/

# Find error handling
grep -r "try.*catch\|except\|rescue" src/

# Find authentication
grep -r "auth\|login\|jwt\|session" src/ -i
```

### Dependency Analysis
```bash
# Check outdated dependencies
npm outdated
pip list --outdated

# Find unused dependencies
npx depcheck
```

### Code Metrics
```bash
# Lines of code
cloc src/

# Complexity
npx complexity-report src/
```

---

**Codebase Analysis Guide - Part of create-brownfield-prd skill**
**Use these techniques to systematically analyze existing codebases**
