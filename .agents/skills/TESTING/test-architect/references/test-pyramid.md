# Test Pyramid Guide

## Contents

1. [Layer Definitions](#layer-definitions)
2. [Distribution Targets](#distribution-targets)
3. [Anti-Patterns](#anti-patterns)
4. [Decision Matrix](#decision-matrix)

---

## Layer Definitions

### Unit Tests (Base)

Tests for isolated functions and methods with no external dependencies.

| Characteristic | Guideline |
|---------------|-----------|
| Speed | < 10ms per test |
| Dependencies | None (mock all I/O) |
| Scope | Single function or class |
| When to write | Pure logic, transformations, validators, parsers, formatters |
| Skip when | Function is trivial glue code with no branching |

### Integration Tests (Middle)

Tests verifying interactions between components or with external systems.

| Characteristic | Guideline |
|---------------|-----------|
| Speed | < 5s per test |
| Dependencies | Real database, API, file system (containerized where possible) |
| Scope | Two or more components interacting |
| When to write | Database queries, API endpoints, file I/O, service boundaries |
| Skip when | Unit tests fully cover the logic and integration is trivial |

### E2E Tests (Top)

Tests verifying complete user flows through the entire system.

| Characteristic | Guideline |
|---------------|-----------|
| Speed | < 30s per test |
| Dependencies | Full system running |
| Scope | Complete user workflow |
| When to write | Critical business flows, payment paths, auth flows |
| Skip when | Flow is composition of well-tested integrations |

---

## Distribution Targets

| Project Type | Unit | Integration | E2E |
|-------------|------|-------------|-----|
| Library/SDK | 80-90% | 10-15% | 0-5% |
| Web API | 60-70% | 20-30% | 5-10% |
| Full-stack app | 50-60% | 20-30% | 10-20% |
| CLI tool | 70-80% | 15-25% | 5-10% |
| Data pipeline | 50-60% | 30-40% | 5-10% |

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Ice cream cone | More E2E than unit tests | Replace E2E with targeted integration tests |
| Hourglass | Many unit + E2E, few integration | Add integration tests at service boundaries |
| Testing pyramid inversion | Only E2E tests | Extract logic into testable units |
| Mock-heavy units | Unit tests that mock everything | Test real logic, mock only I/O boundaries |
| Swiss cheese | Random coverage gaps across all layers | Map test surface, fill systematically |

---

## Decision Matrix

For each function/component, ask:

```
Has external dependencies? ──YES──> Integration test
       │ NO
       ▼
Has branching logic? ──YES──> Unit test
       │ NO
       ▼
Is critical user flow? ──YES──> E2E test
       │ NO
       ▼
Skip (trivial glue code)
```
