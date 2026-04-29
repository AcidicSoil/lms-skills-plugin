# ADR-001: Database Selection for Task Management System

**Date:** 2025-01-15
**Status:** Accepted
**Deciders:** Tech Lead, Backend Team
**Tags:** database, backend, infrastructure

## Context

We are building a SaaS task management application with complex relational data. The system needs to handle:

- Users, Teams, Organizations (hierarchy)
- Projects containing Tasks
- Tasks with Comments, Attachments, Labels
- Complex queries (filtering, aggregations, full-text search)
- Expected scale: 10,000 users at launch, 100,000 in 2 years
- ACID transactions required for critical operations (billing, team management)

**Team Context:**
- 3 backend developers with strong SQL experience
- No NoSQL experience on team
- Prefer type-safe development (TypeScript)

**Constraints:**
- Budget: $500/month for database infrastructure
- Must support full-text search
- Data compliance: GDPR-ready (data export, deletion)

## Decision

We will use **PostgreSQL 15** as our primary database, hosted on AWS RDS.

## Alternatives Considered

### Option 1: PostgreSQL 15
**Pros:**
- Excellent support for relational data and complex joins
- ACID transactions guarantee data consistency
- Full-text search built-in (pg_trgm, ts_vector)
- JSONB support for flexible schema where needed
- Team has extensive SQL expertise
- Proven at massive scale (Notion, Retool, etc.)
- Strong ORM support (Prisma, TypeORM)
- Open-source, no licensing costs
- AWS RDS provides managed service with backups

**Cons:**
- Vertical scaling limits (mitigated by read replicas)
- More rigid schema (requires migrations)

**Score:** 9.3/10 (using tech decision framework)

### Option 2: MongoDB
**Pros:**
- Flexible schema (good for rapid prototyping)
- Horizontal scaling built-in (sharding)
- Large community and ecosystem
- Managed service available (Atlas)

**Cons:**
- Weak support for complex relations (our core use case)
- No team experience (learning curve delay)
- ACID only within single document (insufficient for multi-entity operations)
- Join performance poor for our complex queries
- Higher cost at comparable scale

**Score:** 6.0/10

### Option 3: MySQL 8
**Pros:**
- Relational model, ACID support
- Team SQL knowledge transfers
- Widely used, mature
- AWS RDS support

**Cons:**
- Less feature-rich than PostgreSQL
- Weaker JSON support
- Full-text search less powerful
- Smaller extension ecosystem

**Score:** 8.5/10

## Rationale

PostgreSQL is chosen as the optimal balance of **requirements fit, team expertise, and cost**.

**Requirements Fit (30% weight):** PostgreSQL's relational model naturally expresses our hierarchical data (organizations → teams → projects → tasks). Complex queries with joins are first-class citizens, unlike MongoDB where they're slow and awkward.

**Team Expertise (25% weight):** All 3 developers have 3+ years of SQL experience. No learning curve. Immediate productivity. MongoDB would require 2-4 weeks of learning, risking our 3-month MVP deadline.

**Ecosystem (15% weight):** PostgreSQL + Prisma ORM provides type-safe database access with TypeScript, meeting our type-safety requirement. Automated migrations via Prisma Migrate.

**Performance (10% weight):** Benchmarked query patterns:
- Complex joins (project + tasks + comments): PostgreSQL 45ms vs MongoDB 180ms
- Full-text search: PostgreSQL built-in vs MongoDB requires Atlas Search ($$$)
- Aggregations: Comparable performance

**Scalability (10% weight):** 100K users well within PostgreSQL capabilities. Instagram serves 1B+ users on PostgreSQL. Our scale (100K) is trivial by comparison. Can add read replicas for read-heavy queries.

**Cost (5% weight):** AWS RDS PostgreSQL: $200/month (db.t3.medium Multi-AZ) vs MongoDB Atlas: $400/month (M30 tier). Significant savings.

PostgreSQL scores 9.3/10, beating MongoDB (6.0) and MySQL (8.5).

## Consequences

### Positive
- Strong data consistency guarantees (ACID) prevent data corruption in critical operations
- Complex queries are fast and expressive (SQL)
- Team productive immediately (no learning curve)
- Full-text search without additional service (save Elasticsearch cost)
- Type-safe database access via Prisma
- Lower infrastructure cost ($200/month savings vs MongoDB)

### Negative
- Schema migrations required for changes (accept as reasonable tradeoff for data consistency)
- Vertical scaling limits beyond 100K users (mitigated by read replicas, unlikely to hit limits in next 2 years)

### Neutral
- May need Redis caching layer at higher scale (>50K concurrent users)
- Will use Prisma migrations for schema management

## Implementation Notes

**Initial Setup:**
- AWS RDS PostgreSQL 15, Multi-AZ (high availability)
- Instance: db.t3.medium (2 vCPU, 4 GB RAM) - sufficient for launch
- Storage: 100 GB GP3 SSD (autoscaling enabled)
- Backups: Daily automated backups, 7-day retention

**ORM and Type Safety:**
- Prisma ORM for type-safe database access
- Schema defined in `prisma/schema.prisma`
- Auto-generated TypeScript types

**Migration Strategy:**
- Use Prisma Migrate for schema versioning
- All migrations in source control
- CI/CD runs migrations automatically

**Scaling Plan:**
- 10K users: Single RDS instance
- 50K users: Add 1-2 read replicas for queries
- 100K users: Upgrade to db.r5.large, 3 read replicas

**Monitoring:**
- CloudWatch for RDS metrics (CPU, memory, connections)
- Slow query log enabled (queries >500ms)
- Datadog APM for query performance tracking

## Related Decisions

- ADR-002: ORM Selection (Prisma for type-safe access)
- ADR-003: Caching Strategy (Redis for session and query cache)
- ADR-004: Full-Text Search (pg_trgm + ts_vector)

## References

- [PostgreSQL at Scale (Notion)](https://www.notion.so/blog/how-notion-uses-postgres)
- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS RDS PostgreSQL Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Benchmark Results](docs/benchmarks/postgres-vs-mongodb.md)

## Revision History

- 2025-01-15: Initial decision (Status: Accepted)
