# Coverage Analysis Guide

## Contents

1. [Interpreting Coverage Reports](#interpreting-coverage-reports)
2. [Complexity Weighting](#complexity-weighting)
3. [Gap Prioritization](#gap-prioritization)
4. [Coverage Metrics Beyond Lines](#coverage-metrics-beyond-lines)

---

## Interpreting Coverage Reports

### Coverage Types

| Metric | What It Measures | Limitations |
|--------|-----------------|-------------|
| Line coverage | Lines executed during tests | Doesn't verify correctness |
| Branch coverage | Decision paths taken | Misses implicit branches |
| Function coverage | Functions called | Doesn't cover error paths |
| Statement coverage | Statements executed | Similar to line coverage |

### Healthy Targets

| Project Type | Line Coverage Target | Notes |
|-------------|---------------------|-------|
| Library/SDK | 90%+ | Public API must be fully covered |
| Web API | 80%+ | Focus on business logic, not framework glue |
| CLI tool | 75%+ | Cover main paths and error handling |
| Data pipeline | 70%+ | Focus on transformation logic |
| Prototype | 50%+ | Cover critical paths only |

### Warning Signs

- 100% coverage with no assertions (tests run code but don't verify)
- High coverage with low mutation score (tests don't catch bugs)
- Coverage clustered in trivial code, gaps in complex logic
- Coverage dropping over time (new code added without tests)

---

## Complexity Weighting

Not all uncovered lines are equal. Weight gaps by:

1. **Cyclomatic complexity** — More branches = more risk from missing tests
2. **Fan-in** — Code called by many callers = higher blast radius
3. **Change frequency** — Frequently modified code = more likely to break
4. **Security sensitivity** — Auth, crypto, input validation = always high priority

### Risk Score Formula

```
risk = missing_lines * (1 + complexity_factor) * sensitivity_multiplier
```

| Factor | Value |
|--------|-------|
| complexity_factor | branches / total_lines |
| sensitivity_multiplier | 3x for security, 2x for core logic, 1x for utilities |

---

## Gap Prioritization

| Priority | Criteria | Action |
|----------|----------|--------|
| P0 | Security/auth code with < 80% coverage | Write tests immediately |
| P1 | Core business logic with < 70% coverage | Add to next sprint |
| P2 | Utility functions with < 60% coverage | Add when modifying |
| P3 | Config/glue code with < 50% coverage | Low priority |

---

## Coverage Metrics Beyond Lines

### Mutation Testing

Inject faults into code and check if tests catch them. Low mutation score with high line coverage = weak assertions.

Tools: mutmut (Python), Stryker (JS/TS), pitest (Java).

### Property-Based Coverage

Generates inputs to explore code paths that hand-written tests miss. Especially effective for parsers, serializers, and mathematical functions.

Tools: Hypothesis (Python), fast-check (JS/TS).

### Integration Coverage

Track which integration points (API calls, DB queries, file operations) are exercised by tests. Gaps here are often more impactful than line coverage gaps.
