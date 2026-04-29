---
name: error-handling-patterns
description: Error handling patterns and best practices. Use when implementing error handling, creating custom exceptions, or designing error responses.
license: Apache 2.0
---

# Error Handling Patterns

## When to Use This Skill

- Implementing error handling
- Creating custom exceptions
- Designing API error responses

## Core Concepts

### Custom Exceptions

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}
```

### Error Handling

```typescript
try {
  await service.process(data);
} catch (error) {
  if (error instanceof ValidationError) {
    logger.warn('Validation failed', { error, data });
    throw error;
  }
  logger.error('Unexpected error', { error, data });
  throw new InternalServerError('Processing failed');
}
```

### API Error Response

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## References

- [Error Handling Guidelines](https://docs.microsoft.com/en-us/azure/architecture/patterns/exception-handling)
