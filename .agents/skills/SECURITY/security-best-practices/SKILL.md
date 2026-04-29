---
name: security-best-practices
description: Security best practices for input validation, authentication, authorization, and protecting sensitive data.
license: Apache 2.0
---

# Security Best Practices

## When to Use This Skill

- Implementing authentication/authorization
- Validating user input
- Reviewing code for security

## Core Concepts

### Input Validation

```typescript
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/),
  age: z.number().min(18).max(120)
});
```

### Authentication

```typescript
function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );
}
```

### Authorization

```typescript
function authorize(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}
```

### Protecting Sensitive Data

- Never log passwords or tokens
- Hash passwords with bcrypt
- Use environment variables for secrets

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
