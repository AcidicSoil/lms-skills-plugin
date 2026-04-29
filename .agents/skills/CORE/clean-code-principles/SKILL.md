---
name: clean-code-principles
description: Clean code principles for writing maintainable, readable code. Use when refactoring, code reviews, or writing new code to improve code quality.
license: Apache 2.0
---

# Clean Code Principles

## When to Use This Skill

- Writing new production code
- Refactoring existing code
- Code reviews

## Core Concepts

### Meaningful Names

**Good:**
```typescript
function calculateMonthlyInterest(principal: number): number { ... }
const maximumRetryAttempts = 3;
```

**Bad:**
```typescript
function calc(d: number): number { ... }
const max = 3;
```

### Small Functions

Functions should do ONE thing well:
```typescript
async function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order);
  const paymentResult = await chargePayment(order, total);
  await updateInventory(order);
  await sendConfirmation(order, total);
  return { orderId: order.id, total, paymentResult };
}
```

### Single Responsibility

```typescript
class UserService { getUser(id) { ... } }
class UserRepository { save(user) { ... } }
class EmailService { sendEmail(user) { ... } }
```

## References

- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin
