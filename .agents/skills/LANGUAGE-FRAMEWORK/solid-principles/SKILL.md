---
name: solid-principles
description: SOLID principles for object-oriented design. Use when designing classes, interfaces, or refactoring code to improve maintainability.
license: Apache 2.0
---

# SOLID Principles

## When to Use This Skill

- Designing new classes or modules
- Refactoring existing code
- Code reviews

## Core Concepts

### S - Single Responsibility

A class should have only ONE reason to change.

### O - Open/Closed

Open for extension, closed for modification.

### L - Liskov Substitution

Subtypes must be substitutable for their base types.

### I - Interface Segregation

Many specific interfaces are better than one general interface.

### D - Dependency Inversion

Depend on abstractions, not concretions.

```typescript
interface IEmailService { send(email: Email): Promise<void>; }

class OrderService {
  constructor(private emailService: IEmailService) { }
}
```

## References

- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) - Robert C. Martin
