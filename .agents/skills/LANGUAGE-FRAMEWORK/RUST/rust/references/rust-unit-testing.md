# Rust Unit Testing

> Sources:
> - The Rust Book ch.11: https://doc.rust-lang.org/book/ch11-00-testing.html
> - Rust By Example — Testing: https://doc.rust-lang.org/rust-by-example/testing.html
> - Gary Bernhardt — Functional Core, Imperative Shell: https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell

---

## The TDD Cycle — Non-Negotiable

```
RED   → write a failing test for the next behaviour
GREEN → write the minimum code to make it pass (hardcode if needed)
REFACTOR → clean up without changing behaviour; tests protect you
```

**Red must fail for the right reason.** A test that passes before you write
the implementation tells you nothing. Confirm the failure message is what
you expected before writing production code.

**Green means minimum.** Not clean, not general — just passing. Generality
emerges in the refactor step when a second test demands it (YAGNI enforced
by the cycle).

**TDD drives natural 100% code coverage.** Coverage is not the goal — the
cycle is. But coverage is a signal: losing coverage means introducing code
that was not driven by a failing test. If a line is not covered, ask why
you wrote it.

---

## Test Structure in Rust

### Unit tests — same file as the code

```rust
pub fn score_severity(cvss: f32) -> &'static str {
    match cvss {
        s if s >= 9.0 => "Critical",
        s if s >= 7.0 => "High",
        s if s >= 4.0 => "Medium",
        _ => "Low",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn critical_threshold_is_nine_point_zero() {
        assert_eq!(score_severity(9.0), "Critical");
    }

    #[test]
    fn high_threshold_is_seven_point_zero() {
        assert_eq!(score_severity(7.0), "High");
    }

    #[test]
    fn score_below_four_is_low() {
        assert_eq!(score_severity(3.9), "Low");
    }
}
```

- `#[cfg(test)]` — module compiled only during `cargo test`, not in release
- `use super::*` — brings all parent module items into test scope, including
  private functions
- Testing private functions is necessary when needed — Rust's module system
  allows it. However, prefer testing through the public interface when
  possible: private functions are implementation details that emerge during
  the refactor phase. If a private function seems to require its own test,
  consider whether it should be extracted to a public module instead.

### Integration tests — `tests/` directory

```
src/
  lib.rs
tests/
  report_generation.rs   ← tests the public API only
```

Each file in `tests/` is a separate crate — only public API is accessible.
No `#[cfg(test)]` needed.

```rust
// tests/report_generation.rs
use cvss_dump::generate_report;

#[test]
fn report_sorts_findings_by_severity_descending() {
    let findings = vec![/* ... */];
    let report = generate_report(findings);
    assert!(report.findings[0].score >= report.findings[1].score);
}
```

---

## Test Naming — Express Behaviour, Not Implementation

Test names are documentation. Name them as sentences describing observable
behaviour, not function internals.

```rust
// ❌ Implementation-focused
fn test_parse() {}
fn test_cvss_fn() {}

// ✅ Given/When/Then
fn given_session_with_no_findings_when_export_then_blocked() {}
fn given_critical_cvss_vector_when_scored_then_label_is_critical() {}
fn given_network_vector_when_compared_to_local_then_scores_higher() {}
```

Pattern: `given_[context]_when_[action]_then_[outcome]()`

---

## Assertions

```rust
assert_eq!(actual, expected);           // equality — preferred
assert_ne!(actual, expected);           // inequality
assert!(condition);                     // boolean
assert!(actual.contains("expected"));  // substring

// With custom message
assert_eq!(actual, expected, "score for vector {} was wrong", vector);

// Test should panic
#[test]
#[should_panic(expected = "empty session")]
fn export_panics_on_empty_session() {
    export(Session::empty());
}

// Return Result from tests — use ? for cleaner error propagation
#[test]
fn parse_valid_vector_succeeds() -> anyhow::Result<()> {
    let score = parse_cvss("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H")?;
    assert_eq!(score.base_score, 9.8);
    Ok(())
}
```

---

## Testing the Functional Core — No Mocks Needed

The functional core (pure functions, no I/O) is trivially testable. Pass
values in, assert values out. No mocking framework required.

```rust
// Core — pure, no I/O
pub fn sort_findings_by_severity(mut findings: Vec<Finding>) -> Vec<Finding> {
    findings.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
    findings
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn findings_sorted_highest_severity_first() {
        let findings = vec![
            Finding { score: 4.0, ..Default::default() },
            Finding { score: 9.8, ..Default::default() },
            Finding { score: 7.2, ..Default::default() },
        ];
        let sorted = sort_findings_by_severity(findings);
        assert_eq!(sorted[0].score, 9.8);
        assert_eq!(sorted[2].score, 4.0);
    }
}
```

**100% coverage on the core is achievable and required.** The core has no
dependencies to stub — every branch is reachable with plain function calls.

---

## Testing the Imperative Shell — Trait-Based Ports

The shell (I/O, side effects) is tested through trait-based dependency
inversion. Define a port trait; swap in a fake for tests.

```rust
// Port — defined in the core
pub trait SessionStore {
    fn save(&self, session: &Session) -> Result<(), StoreError>;
    fn load(&self, id: SessionId) -> Result<Session, StoreError>;
}

// Fake — lives in tests
#[cfg(test)]
struct FakeStore {
    sessions: std::cell::RefCell<HashMap<SessionId, Session>>,
}

#[cfg(test)]
impl SessionStore for FakeStore {
    fn save(&self, session: &Session) -> Result<(), StoreError> {
        self.sessions.borrow_mut().insert(session.id, session.clone());
        Ok(())
    }
    fn load(&self, id: SessionId) -> Result<Session, StoreError> {
        self.sessions.borrow().get(&id).cloned()
            .ok_or(StoreError::NotFound)
    }
}
```

**Use fakes, not mocks.** A fake is a real implementation for tests — it
stores state, records calls, returns configured values. A mock asserts call
counts and argument order, coupling tests to implementation details and
breaking on refactor. Even for side effects with no return value (events
published, notifications sent, files written), a fake that records what was
"sent" or "saved" is cleaner and more maintainable than a mock or spy.

---

## Test Organisation Commands

```bash
cargo test                            # run all tests
cargo test -- --nocapture             # show println! output
cargo test score_severity             # run tests matching the name
cargo test -- --test-threads=1        # force sequential execution
cargo test --lib                      # unit tests only
cargo test --test report_generation   # one integration test file
cargo test -- --ignored               # run #[ignore]d tests
```

Mark slow or external-dependency tests with `#[ignore]`:

```rust
#[test]
#[ignore = "requires real filesystem"]
fn round_trip_through_disk() { /* ... */ }
```

---

## Async Tests

```rust
#[tokio::test]
async fn async_operation_completes() -> anyhow::Result<()> {
    let result = fetch_data().await?;
    assert!(!result.is_empty());
    Ok(())
}
```

Requires `tokio = { features = ["rt", "macros"] }` in `[dev-dependencies]`.

---

## Doc Tests

Code examples in `///` doc comments are compiled and run as tests:

```rust
/// Calculates the CVSS severity label.
///
/// ```
/// use cvss_dump::score_severity;
/// assert_eq!(score_severity(9.8), "Critical");
/// assert_eq!(score_severity(3.5), "Low");
/// ```
pub fn score_severity(score: f32) -> &'static str { /* ... */ }
```

```bash
cargo test --doc
```

Doc tests verify that examples in documentation actually work. Use them for
public API examples; keep them minimal — they are not a substitute for
unit tests.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Writing implementation before test | Always RED first |
| Test names like `test_parse` | Behaviour names: `valid_vector_parses_to_score` |
| Testing implementation details (call counts) | Test observable outputs and state |
| Mocking everything | Functional core needs no mocks; use fakes for ports |
| One test covering multiple scenarios | One test, one behaviour |
| `unwrap()` in test assertions | Return `Result` from the test, use `?` |
| Skipping the refactor step | Refactor is when design emerges — never skip |
