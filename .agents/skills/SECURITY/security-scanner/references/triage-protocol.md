# Security Triage Protocol

Risk stratification methodology for security file analysis.

## Contents

1. [File Risk Classification](#file-risk-classification)
2. [Sampling Strategy](#sampling-strategy)
3. [Dependency Graph](#dependency-graph)
4. [Priority Queue](#priority-queue)

---

## File Risk Classification

Classify every file as HIGH, MEDIUM, or LOW security relevance:

### HIGH Risk

Files that directly handle security-sensitive operations:

| Indicator | Examples |
|-----------|---------|
| Authentication/authorization | login.py, auth.ts, middleware/auth.*, guards/* |
| Payment/financial processing | payment.*, billing.*, stripe.*, checkout.* |
| Cryptographic operations | crypto.*, encrypt.*, hash.*, key*.* |
| User input handling | controllers/*, routes/*, handlers/*, api/* |
| Configuration with secrets | .env, config.*, settings.*, secrets.* |
| Database access layer | models/*, repositories/*, db.*, database.* |
| Session management | session.*, cookie.*, token.* |
| File upload/download | upload.*, download.*, file*.* with I/O |
| External API integration | client.*, service.*, integration/* |
| Infrastructure config | Dockerfile, docker-compose.*, k8s/*, terraform/* |

### MEDIUM Risk

Files that touch external I/O or data transformation:

| Indicator | Examples |
|-----------|---------|
| Data serialization | serializers/*, parsers/*, transform.* |
| Middleware/interceptors | middleware/*, interceptors/*, filters/* |
| Utility functions touching I/O | utils/http.*, utils/file.*, utils/network.* |
| Template rendering | templates/*, views/*, components/* (server-rendered) |
| Queue/message handlers | workers/*, consumers/*, handlers/* |
| Logging configuration | logger.*, logging.*, observability.* |

### LOW Risk

Files with minimal security surface:

| Indicator | Examples |
|-----------|---------|
| Pure computation | utils/math.*, helpers/format.*, lib/sort.* |
| Static assets | public/*, static/*, assets/* |
| Tests | test/*, tests/*, *_test.*, *.test.* |
| Documentation | docs/*, *.md, *.rst, *.txt |
| Type definitions | types.*, interfaces.*, *.d.ts |
| Style files | *.css, *.scss, *.less |
| Build configuration | webpack.*, vite.*, tsconfig.*, babel.* |

---

## Sampling Strategy

For large codebases (100+ files), use stratified sampling:

| Risk Tier | Sample Rate | Rationale |
|-----------|------------|-----------|
| HIGH | 100% | All security-critical files must be scanned |
| MEDIUM | 50% | Prioritize by import count and recent changes |
| LOW | 10% | Spot check for unexpected patterns |

Selection criteria for MEDIUM sampling:
1. Files imported by HIGH-risk files (dependency proximity)
2. Recently modified files (`git log --since="30 days"`)
3. Files with highest import fan-out (most dependencies)
4. Random sample for remaining quota

---

## Dependency Graph

Build a lightweight import graph for HIGH-risk files:

1. Parse import/require/use statements in HIGH-risk files
2. Mark first-degree dependencies as MEDIUM (if not already HIGH)
3. Use the graph to assess blast radius of findings:
   - Finding in a file imported by 10+ others → high blast radius
   - Finding in a leaf file → low blast radius

---

## Priority Queue

After classification, order scanning by priority:

1. **Configuration files** (.env, config, secrets) — fastest to scan, highest impact
2. **Authentication/authorization** — critical security boundary
3. **External input handlers** — attack surface entry points
4. **Payment/financial** — regulatory and financial risk
5. **Database/data access** — data integrity and exposure
6. **Crypto operations** — correctness is critical
7. **MEDIUM-risk sampled files** — secondary scan
8. **LOW-risk spot checks** — background verification
