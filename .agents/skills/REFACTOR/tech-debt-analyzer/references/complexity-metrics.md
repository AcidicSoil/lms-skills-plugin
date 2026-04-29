# Complexity Metrics Guide

Definitions, thresholds, and interpretation for code complexity metrics.

## Contents

1. [Cyclomatic Complexity](#cyclomatic-complexity)
2. [Cognitive Complexity](#cognitive-complexity)
3. [Thresholds](#thresholds)
4. [Interpretation](#interpretation)

---

## Cyclomatic Complexity

Counts independent paths through a function. Each decision point (if, while, for, except, boolean operator) adds 1.

**Formula:** CC = 1 + (number of decision points)

**What it measures:** Minimum number of test cases needed for full branch coverage.

**Decision points counted:**
- `if` / `elif` — +1 each
- `while` / `for` — +1 each
- `except` handler — +1 each
- Boolean operators (`and`, `or`) — +1 per operator
- `assert` — +1
- Comprehensions — +1 per generator

---

## Cognitive Complexity

Measures how hard code is for a human to understand. Unlike CC, it weights nesting depth.

**Key differences from CC:**
- Nesting increases cost (nested `if` inside `for` costs more than sequential `if` + `for`)
- `else` clauses add complexity (CC ignores them)
- `break`/`continue` add complexity (early exits disrupt flow)
- Boolean operator sequences count once, not per operator

**Increment rules:**
- Structural: +1 for if, while, for, except, break, continue
- Nesting: +depth for each structural increment
- Boolean: +(count - 1) for boolean operator sequences

---

## Thresholds

Industry-standard thresholds based on SonarQube, Code Climate, and research.

### Cyclomatic Complexity

| Range | Risk Level | Action |
|---|---|---|
| 1-5 | LOW | No action needed |
| 6-10 | MEDIUM | Consider refactoring if function grows |
| 11-20 | HIGH | Refactor: extract helper functions, simplify conditionals |
| 21-50 | CRITICAL | Mandatory refactoring: high bug density zone |
| 50+ | CRITICAL | Emergency: likely untestable, split immediately |

### Cognitive Complexity

| Range | Risk Level | Action |
|---|---|---|
| 0-7 | LOW | Easy to understand |
| 8-15 | MEDIUM | Getting complex, watch for growth |
| 16-25 | HIGH | Difficult to maintain, refactor |
| 25+ | CRITICAL | Very hard to understand, high bug risk |

### Function Length (LOC)

| Range | Risk Level | Notes |
|---|---|---|
| 1-30 | LOW | Ideal function size |
| 31-60 | MEDIUM | Acceptable for complex logic |
| 61-100 | HIGH | Consider splitting |
| 100+ | CRITICAL | Almost certainly doing too much |

### Parameter Count

| Count | Risk Level | Notes |
|---|---|---|
| 0-3 | LOW | Ideal |
| 4-5 | MEDIUM | Consider parameter object |
| 6-7 | HIGH | Likely a design issue |
| 8+ | CRITICAL | Refactor to use configuration objects |

---

## Interpretation

### Reading Script Output

The `complexity-scanner.py` output contains:
- `files[].functions[].cyclomatic_complexity`: CC value per function
- `files[].functions[].cognitive_complexity`: Cognitive complexity per function
- `files[].functions[].loc`: Lines of code
- `files[].functions[].params`: Parameter count
- `files[].functions[].risk`: AUTO-assigned risk (HIGH/MEDIUM/LOW based on CC)
- `summary.avg_cyclomatic_complexity`: Codebase average CC
- `summary.high_risk_count`: Number of HIGH-risk functions

### Codebase Health Indicators

| Metric | Healthy | Concerning | Critical |
|---|---|---|---|
| Average CC | < 5 | 5-10 | > 10 |
| High-risk function % | < 5% | 5-15% | > 15% |
| Max CC | < 15 | 15-30 | > 30 |
| Average function LOC | < 25 | 25-50 | > 50 |

### Common Complexity Drivers

- **Deep nesting**: Nested conditionals/loops — flatten with early returns or guard clauses
- **Long switch/match**: Many branches — consider strategy pattern or lookup table
- **Complex boolean logic**: Multi-condition expressions — extract to named helper functions
- **Error handling cascades**: Nested try/except — use context managers or error accumulation
