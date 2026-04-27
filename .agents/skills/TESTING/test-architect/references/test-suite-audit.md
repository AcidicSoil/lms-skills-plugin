# Test Suite Audit

## Quality Dimensions

| Dimension | What to Assess | Target |
|-----------|---------------|--------|
| **Coverage** | Percentage of code exercised by tests; distribution across modules | >80% overall, proportional to complexity |
| **Speed** | Execution time per layer | Unit <10ms, integration <5s, e2e <30s |
| **Reliability** | Flaky test rate, determinism across runs | 0% flaky rate, passes with randomized order |
| **Maintainability** | Readability, fixture reuse, naming consistency | Consistent conventions, minimal duplication |
| **Isolation** | Independence between tests, no shared mutable state | Every test passes when run alone or in any order |

## Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **Test pollution** | Test A mutates shared state, causing Test B to fail | Use function-scoped fixtures; reset state in teardown |
| **Brittle assertions** | Tests break on cosmetic changes (whitespace, order) | Assert on structure/semantics, not exact strings |
| **Over-mocking** | Tests pass but production breaks; mocks drift from reality | Mock at boundaries only; use contract tests for critical interfaces |
| **Testing implementation** | Tests break on refactoring without behavior change | Test public API and observable behavior, not private methods |
| **Assertion-free tests** | Test runs code but never asserts | Every test must have at least one meaningful assertion |
| **Giant test files** | 1000+ line test files covering multiple features | Split by feature or module; one test file per source file |
| **Hardcoded test data** | Magic numbers and strings scattered through tests | Use fixtures, factories, or named constants |

## Metrics to Track

| Metric | How to Measure | Healthy Range |
|--------|---------------|---------------|
| Coverage % | `coverage run` / `nyc` / `lcov` | 80-95% (100% is not a goal) |
| Test-to-code ratio | `test lines / source lines` | 1:1 to 3:1 depending on criticality |
| Test execution time | CI timing logs | Full suite <5 min for most projects |
| Flaky rate | `failures / (runs * tests)` over 30 days | <0.1% |
| Orphaned test count | Tests referencing deleted/renamed code | 0 |

## Audit Checklist

1. **Pyramid balance** -- Count tests per layer. Is the ratio approximately 70% unit / 20% integration / 10% e2e?
2. **Coverage distribution** -- Are all high-risk modules covered, or is coverage clustered in easy-to-test utilities?
3. **Isolation** -- Run tests in randomized order. Any failures?
4. **Fixture review** -- Are fixtures scoped correctly? Any session-scoped fixtures that should be function-scoped?
5. **Assertion quality** -- Grep for bare `assert True`, `assertTrue(x)`, or tests with no assertions.
6. **Naming consistency** -- Do test names describe behavior and scenario? (`test_parse_returns_empty_list_for_invalid_input`)
7. **Speed audit** -- Identify tests exceeding layer targets. Are slow unit tests actually integration tests?
8. **Dead tests** -- Search for `@skip`, `@pytest.mark.skip`, `.skip()` without linked issues.
9. **Negative cases** -- For each public API function, is there at least one error/invalid input test?
10. **Duplication** -- Are similar test setups copy-pasted or extracted into shared fixtures?

## Test Organization Patterns

### Arrange-Act-Assert (AAA)

Structure every test in three distinct phases:
- **Arrange** -- set up preconditions and inputs
- **Act** -- call the function under test
- **Assert** -- verify the expected outcome

Keep each phase visually separated. One act per test. Multiple assertions are acceptable when they verify facets of a single behavior.

### Given-When-Then (BDD)

Equivalent to AAA with domain language:
- **Given** -- the initial context
- **When** -- the event or action occurs
- **Then** -- the expected outcome

Use this pattern when test names read as specifications: `given_empty_cart_when_add_item_then_total_equals_item_price`.
