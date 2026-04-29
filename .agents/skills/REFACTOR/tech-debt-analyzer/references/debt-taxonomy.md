# Debt Taxonomy

Categories, subcategories, and remediation templates for classifying technical debt.

## Contents

1. [Design Debt](#design-debt)
2. [Test Debt](#test-debt)
3. [Documentation Debt](#documentation-debt)
4. [Dependency Debt](#dependency-debt)
5. [Infrastructure Debt](#infrastructure-debt)
6. [Severity Weights](#severity-weights)

---

## Design Debt

Structural issues in code architecture and implementation.

| Subcategory | Indicators | Severity Default |
|---|---|---|
| High complexity | Cyclomatic complexity > 10, cognitive complexity > 15 | HIGH |
| Dead code | Unused functions, classes, imports | MEDIUM |
| Code duplication | Near-identical blocks across 3+ files | MEDIUM |
| God class/function | Single unit > 300 LOC or > 10 responsibilities | HIGH |
| Tight coupling | Circular dependencies, high fan-out (> 10 imports) | HIGH |
| Inconsistent patterns | Same problem solved differently across files | LOW |
| Missing abstractions | Repeated inline logic that should be extracted | MEDIUM |
| Over-engineering | Abstractions without multiple consumers | LOW |
| Stringly-typed | Raw strings where constants/enums should exist | MEDIUM |
| Parameter sprawl | Functions with > 7 parameters | MEDIUM |

**Remediation template:**
1. Identify affected files and blast radius
2. Define target pattern (what "fixed" looks like)
3. Extract/refactor incrementally with tests covering each step
4. Verify no behavioral changes via existing test suite

---

## Test Debt

Gaps or weaknesses in test coverage and quality.

| Subcategory | Indicators | Severity Default |
|---|---|---|
| Missing tests | Public functions/classes with no test coverage | HIGH |
| Brittle tests | Tests coupled to implementation details | MEDIUM |
| Slow tests | Test suite > 60s for < 1000 tests | MEDIUM |
| Missing edge cases | No boundary/error path testing | HIGH |
| Test duplication | Identical assertions across multiple test files | LOW |
| No integration tests | Unit tests only, no system-level verification | MEDIUM |

**Remediation template:**
1. Map untested code paths
2. Prioritize by risk (public API > internal, mutation > read)
3. Write tests for highest-risk gaps first
4. Add CI gate for coverage threshold

---

## Documentation Debt

Missing or stale documentation.

| Subcategory | Indicators | Severity Default |
|---|---|---|
| Undocumented public API | Public functions/classes without docstrings | MEDIUM |
| Stale README | README references removed/renamed files | MEDIUM |
| Missing architecture docs | No high-level system documentation | LOW |
| Stale comments | Comments describing removed/changed behavior | LOW |
| Missing CHANGELOG | No record of changes between versions | LOW |

**Remediation template:**
1. Inventory public API surface
2. Prioritize user-facing and contributor-facing docs
3. Write docs alongside the code (co-locate)
4. Add CI check for docstring coverage

---

## Dependency Debt

Outdated, deprecated, or risky external dependencies.

| Subcategory | Indicators | Severity Default |
|---|---|---|
| Deprecated package | Package marked as deprecated upstream | CRITICAL |
| Major version behind | 2+ major versions behind latest | HIGH |
| Unmaintained | No commits in 12+ months | HIGH |
| Security advisory | Known CVE against current version | CRITICAL |
| Version pinning | Exact pins preventing security patches | MEDIUM |
| Duplicate dependencies | Multiple packages solving same problem | LOW |

**Remediation template:**
1. Audit dependency tree for risk
2. Upgrade deprecated/vulnerable packages first
3. Test against latest versions in CI
4. Remove unused dependencies

---

## Infrastructure Debt

CI/CD, tooling, and environment issues.

| Subcategory | Indicators | Severity Default |
|---|---|---|
| No CI/CD | No automated testing or deployment | HIGH |
| Missing linting | No static analysis in CI | MEDIUM |
| Inconsistent tooling | Multiple build tools for same language | MEDIUM |
| No containerization | Environment-dependent builds | LOW |
| Missing pre-commit hooks | No local quality gates | LOW |
| Stale CI config | CI references removed tools/versions | MEDIUM |

**Remediation template:**
1. Audit current CI pipeline
2. Add missing quality gates (lint, test, type-check)
3. Standardize on one toolchain per language
4. Document build/deploy process

---

## Severity Weights

Used in debt score calculation: `score = sum(weight x confidence)`.

| Severity | Weight | Description |
|---|---|---|
| CRITICAL | 10 | Immediate risk: security, data loss, system failure |
| HIGH | 5 | Significant risk: maintainability, reliability degradation |
| MEDIUM | 2 | Moderate impact: developer productivity, code quality |
| LOW | 1 | Minor: style, conventions, nice-to-have improvements |
