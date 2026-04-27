# Prioritization Framework

Risk x effort matrix for ranking tech debt items.

## Contents

1. [Risk Assessment](#risk-assessment)
2. [Effort Estimation](#effort-estimation)
3. [Priority Matrix](#priority-matrix)
4. [Scoring Rubric](#scoring-rubric)

---

## Risk Assessment

Rate each debt item on three dimensions:

| Dimension | Low (1) | Medium (2) | High (3) |
|---|---|---|---|
| **Blast radius** | Single function | Single module/file | Cross-module or system-wide |
| **Severity** | Style/convention | Maintainability/productivity | Correctness/security/reliability |
| **Confidence** | 0.3-0.5 | 0.5-0.7 | 0.7-1.0 |

**Risk score** = blast_radius + severity + confidence_tier (range: 3-9)

| Risk Score | Risk Level |
|---|---|
| 3-4 | Low |
| 5-6 | Medium |
| 7-9 | High |

---

## Effort Estimation

Rate each remediation on three dimensions:

| Dimension | Low (1) | Medium (2) | High (3) |
|---|---|---|---|
| **LOC affected** | < 50 lines | 50-200 lines | > 200 lines |
| **Complexity** | Simple rename/delete | Logic refactoring | Architecture change |
| **Dependencies** | No downstream impact | Same-module impact | Cross-module migration |

**Effort score** = loc_affected + complexity + dependencies (range: 3-9)

| Effort Score | Effort Level |
|---|---|
| 3-4 | Low |
| 5-6 | Medium |
| 7-9 | High |

---

## Priority Matrix

Cross-reference risk and effort for priority assignment:

| | Low Effort (3-4) | Medium Effort (5-6) | High Effort (7-9) |
|---|---|---|---|
| **High Risk (7-9)** | **P0**: Fix immediately | **P1**: Schedule next sprint | **P2**: Plan for next quarter |
| **Medium Risk (5-6)** | **P1**: Schedule next sprint | **P2**: Plan for next quarter | **P3**: Backlog |
| **Low Risk (3-4)** | **P2**: Quick wins batch | **P3**: Backlog | **P4**: Accept or defer |

### Priority Definitions

| Priority | Action | Timeline |
|---|---|---|
| P0 | Fix immediately, block other work if needed | This week |
| P1 | Schedule in next sprint, assign owner | Next 2 weeks |
| P2 | Plan for next quarter, include in roadmap | Next 1-3 months |
| P3 | Add to backlog, address opportunistically | When convenient |
| P4 | Accept as-is or defer indefinitely | Review annually |

---

## Scoring Rubric

### Debt Score Calculation

Each item's contribution: `severity_weight x confidence`

| Severity | Weight |
|---|---|
| CRITICAL | 10 |
| HIGH | 5 |
| MEDIUM | 2 |
| LOW | 1 |

**Total debt score** = sum of all item scores.

### Trend Interpretation

| Score Trend | Interpretation |
|---|---|
| Decreasing | Debt being actively addressed |
| Stable | New debt balanced by remediation |
| Increasing | Debt accumulating faster than remediation |

### Benchmark Ranges

| Debt Score / KLOC | Health |
|---|---|
| 0-5 | Excellent |
| 5-15 | Good |
| 15-30 | Concerning |
| 30+ | Critical — prioritize debt reduction |
