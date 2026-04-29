# Rust Error Handling

> Sources:
> - The Rust Book ch.9: https://doc.rust-lang.org/book/ch09-00-error-handling.html
> - thiserror: https://docs.rs/thiserror
> - anyhow: https://docs.rs/anyhow
> - Luca Palmieri — Error Handling in Rust: https://lpalmieri.com/posts/error-handling-rust/

---

## Core Distinction

Two categories of errors in Rust:

- **Recoverable** — expected failures (`Result<T, E>`): file not found, parse
  error, validation failure
- **Unrecoverable** — bugs (`panic!`): invariant violated, out-of-bounds access

**Rule:** never use `panic!` for recoverable errors. Never use `Result` for
bugs. The distinction is about intent, not severity.

---

## The Real Decision: handle vs report

The common framing — "thiserror for libraries, anyhow for applications" — is
imprecise. The real question is:

> Will the caller behave differently based on which error occurred?

- **Yes** → define an error enum with variants the caller can match on.
  Use `thiserror` to reduce boilerplate.
- **No** → the caller just reports or propagates. Use `anyhow` for ergonomic
  context chaining.

Many projects use both: domain modules use `thiserror`, top-level
orchestration uses `anyhow`.

---

## thiserror — Typed, Matchable Errors

```toml
thiserror = "2"
```

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FindingError {
    #[error("invalid CVSS vector: {0}")]
    InvalidVector(String),

    #[error("finding not found: {id}")]
    NotFound { id: u32 },

    #[error(transparent)]
    Io(#[from] std::io::Error),
}
```

**Key attributes:**
- `#[error("message")]` — generates `Display`
- `#[from]` — generates `From<T>` and sets `source()`; enables `?` conversion
- `#[source]` — sets the cause without `From` conversion
- `#[error(transparent)]` — delegates both `Display` and `source()` to inner
  error; use to wrap opaque errors without losing chain

**Design rule:** define variants by what the caller needs to distinguish, not
by implementation failure modes. If two failures are always handled the same
way, use one variant.

---

## anyhow — Opaque, Context-Rich Errors

```toml
anyhow = "2"
```

```rust
use anyhow::{Context, Result};

fn load_session(path: &Path) -> Result<Session> {
    let content = std::fs::read_to_string(path)
        .with_context(|| format!("failed to read session file: {}", path.display()))?;

    let session: Session = serde_json::from_str(&content)
        .context("session file contains invalid JSON")?;

    Ok(session)
}
```

**Key methods:**
- `.context("message")` — attaches a static context string
- `.with_context(|| ...)` — attaches a lazy context (use when formatting is
  expensive)
- `anyhow::bail!("message")` — shorthand for `return Err(anyhow!("message"))`
- `anyhow::ensure!(condition, "message")` — shorthand for condition check

**In `main`:**
```rust
fn main() -> anyhow::Result<()> {
    // anyhow formats the error chain automatically on exit
}
```

---

## The `?` Operator

Propagates errors up the call stack. Calls `From::from` on the error — this
is how `#[from]` conversions fire automatically.

```rust
fn parse_score(s: &str) -> Result<f32, FindingError> {
    let score: f32 = s.parse().map_err(|_| FindingError::InvalidVector(s.to_string()))?;
    Ok(score)
}
```

**Never use `?` in `main` unless the function returns `Result`.** Prefer
explicit error display in `main` for user-facing CLIs.

---

## `Option` and `Result` interplay

```rust
// Option → Result
value.ok_or(FindingError::NotFound { id })?
value.ok_or_else(|| FindingError::NotFound { id })?

// Result → Option (when you only care about success)
result.ok()
```

---

## Panic — When and Only When

`panic!` is correct for:
- Violated invariants that are always bugs (not user errors)
- Index out of bounds, unwrap on `None` that should be impossible
- Test assertions

`panic!` is wrong for:
- Missing files, network errors, invalid user input
- Any error a user could cause or recover from

**`unwrap()` in tests is acceptable.** `unwrap()` in production paths is a bug.

---

## Error Display for Users (CLI)

Never expose internal error types directly to users. Format errors at the
boundary:

```rust
fn main() {
    if let Err(e) = run() {
        eprintln!("Error: {e}");
        // Print error chain
        let mut source = e.source();
        while let Some(cause) = source {
            eprintln!("  caused by: {cause}");
            source = cause.source();
        }
        std::process::exit(1);
    }
}
```

With `anyhow`, the `{:?}` formatter prints the full chain automatically.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| `unwrap()` / `expect()` in production | `?` with typed or anyhow errors |
| `Box<dyn Error>` as return type | `thiserror` enum or `anyhow::Error` |
| Swallowing errors with `.ok()` | Explicit handling or propagation |
| Panic for user input validation | Return `Err(ValidationError(...))` |
| Too many variants (every failure mode) | Group by caller response, not cause |
| Missing `#[source]` on wrapped errors | Always preserve the error chain |
