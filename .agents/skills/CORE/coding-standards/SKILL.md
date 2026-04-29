---
name: coding-standards
description: Detailed coding standards and best practices including clean code, SOLID, and common patterns. Use when writing or reviewing code.
license: Apache 2.0
---

# Coding Standards

## When to Use This Skill

- Writing new code
- Code reviews
- Setting up coding standards

## Core Concepts

### Clean Code Principles

**Meaningful Names:**
```typescript
// Good
function calculateMonthlyInterest(principal: number, rate: number): number { ... }
const daysSinceCreation = 45;

// Bad
function calc(d: number, r: number): number { ... }
const d = 45;
```

**Small Functions:**
```typescript
// Good: Focused
async function createUser(data: CreateDto) {
  validateData(data);
  const user = await repository.create(data);
  await sendWelcomeEmail(user);
  return user;
}
```

**Single Responsibility:**
```typescript
// Good
class UserService { getUser(id) { ... } }
class UserRepository { save(user) { ... } }
```

### SOLID Principles

- **S**ingle Responsibility: One reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many specific interfaces
- **D**ependency Inversion: Depend on abstractions

### Error Handling

```typescript
class AppError extends Error {
  constructor(public code: string, message: string, public statusCode: number) {
    super(message);
  }
}
```

### Logging

```typescript
logger.info('User created', { userId: user.id });
logger.error('Failed', { error: err.message });
```

## References

- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
