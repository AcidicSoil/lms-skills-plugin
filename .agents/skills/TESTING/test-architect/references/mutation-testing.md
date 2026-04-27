# Mutation Testing

## What It Is

Mutation testing injects small faults (mutations) into source code and checks whether the test suite detects them. Each injected fault is a "mutant." If a test fails, the mutant is "killed." If all tests still pass, the mutant "survives" -- exposing a gap in test assertions.

Mutation testing answers a question that code coverage cannot: do your tests actually verify behavior, or do they just execute code?

## Mutation Operators

| Operator | Example | What It Detects |
|----------|---------|-----------------|
| Arithmetic | `a + b` -> `a - b` | Calculation correctness assertions |
| Logical | `a and b` -> `a or b` | Boolean logic verification |
| Relational | `a < b` -> `a <= b` | Off-by-one, boundary assertions |
| Assignment | `x = a` -> `x = b` | Variable usage verification |
| Statement deletion | `validate(x)` -> (removed) | Side effect assertions |
| Return value | `return x` -> `return None` | Return value checking |
| Constant | `MAX = 100` -> `MAX = 101` | Constant usage assertions |

## Interpreting Results

| Metric | Definition |
|--------|-----------|
| **Mutation score** | `killed / total * 100` -- percentage of mutants detected |
| **Equivalent mutant** | Mutation producing identical behavior; false survivor, ignore it |
| **Surviving mutant** | Mutation no test catches; indicates missing or weak assertion |

| Score | Interpretation |
|-------|---------------|
| 90%+ | Excellent -- tests verify behavior thoroughly |
| 70-89% | Good -- review surviving mutants for meaningful gaps |
| 50-69% | Weak -- significant assertion gaps exist |
| < 50% | Tests exercise code but rarely verify outcomes |

## Tools

| Language | Tool | Command |
|----------|------|---------|
| Python | mutmut | `mutmut run --paths-to-mutate=src/` |
| JS/TS | Stryker | `npx stryker run` |
| Java | pitest | `mvn pitest:mutationCoverage` |
| Go | go-mutesting | `go-mutesting ./...` |
| Rust | cargo-mutants | `cargo mutants` |

## When to Use

Use mutation testing when:
- Coverage is high (>80%) but you suspect tests are shallow
- Post-refactoring: verify tests still catch the right faults
- Critical code paths where assertion quality must be proven

Use coverage analysis when:
- Coverage is low and you need to find untested code paths first
- You need a fast feedback loop (mutation testing is slow)
- Broad project-wide overview of testing status

Mutation testing runs the full test suite once per mutant. Start with a single module to keep runtime manageable. Set a mutation score threshold in CI only after establishing a stable baseline.
