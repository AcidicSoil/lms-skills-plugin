---
name: logging-standards
description: Structured logging standards and best practices. Use when implementing logging in applications, debugging issues, or setting up log aggregation.
license: Apache 2.0
---

# Logging Standards

## When to Use This Skill

- Implementing logging
- Debugging production issues
- Setting up log aggregation

## Core Concepts

### Log Levels

| Level | When |
|-------|------|
| ERROR | Something failed |
| WARN | Unexpected but handled |
| INFO | Normal business events |
| DEBUG | Detailed technical info |

```typescript
logger.error('Database connection failed', { error: err.message });
logger.warn('Cache miss, falling back to database', { key });
logger.info('User created', { userId: user.id });
logger.debug('Processing request', { method, url });
```

### Structured Logging

```typescript
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "service": "user-service",
  "traceId": "abc-123",
  "message": "User created",
  "data": { "userId": "user-456" }
}
```

## References

- [12-Factor App Logging](https://12factor.net/logs)
