---
name: refactoring-techniques
description: Refactoring techniques for improving code maintainability. Use when refactoring code to reduce complexity and apply SOLID principles.
license: Apache 2.0
---

# Refactoring Techniques

## When to Use This Skill

- Refactoring code
- Reducing complexity
- Applying SOLID principles

## Core Concepts

### Extract Method

```typescript
// Before: Long method
async function processOrder(order) {
  // Validate order (20 lines)
  // Calculate total (15 lines)
  // Charge payment (10 lines)
  // Update inventory (10 lines)
  // Send confirmation (5 lines)
}

// After: Extracted methods
async function processOrder(order) {
  validateOrder(order);
  const total = calculateTotal(order);
  const paymentResult = await chargePayment(order, total);
  await updateInventory(order);
  await sendConfirmation(order);
}
```

### Move Method

```typescript
// Before: Feature envy
class Report {
  generate(order) {
    const total = order.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0);
  }
}

// After: Method moved to data owner
class Order {
  getTotal() {
    return this.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0);
  }
}
```

### Replace Primitive with Class

```typescript
// Before: Primitive obsession
class Order {
  constructor(public email: string) {
    if (!email.includes('@')) throw new Error('Invalid');
  }
}

// After: Value Object
class Email {
  constructor(public value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error('Invalid email');
    }
  }
}
```

## Common Scenarios

### Long Method
- Extract smaller methods
- Name methods clearly

### Large Class
- Identify responsibilities
- Extract classes

### Duplicate Code
- Extract to shared method
- Replace duplicates

## References

- [Refactoring](https://www.oreilly.com/library/view/refactoring-improving-the/9780134757681/) - Martin Fowler
