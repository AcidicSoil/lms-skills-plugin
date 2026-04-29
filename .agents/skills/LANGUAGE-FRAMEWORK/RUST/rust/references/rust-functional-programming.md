# Rust Functional Programming

> Sources:
> - The Rust Book ch.13: https://doc.rust-lang.org/book/ch13-00-functional-features.html
> - Gary Bernhardt — Functional Core, Imperative Shell: https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell
> - corrode.dev — Paradigms in Rust: https://corrode.dev/blog/paradigms/

---

## Functional Core / Imperative Shell

The foundational architecture pattern for functional Rust.

**Core** — pure functions, no side effects, no I/O:
- Takes values, returns values
- All branching and business logic lives here
- Trivially testable: no mocks, no fakes, no setup

**Shell** — thin imperative wrapper:
- Reads from I/O (stdin, files, network, DB)
- Calls core functions with the data
- Writes results back to the world
- As few conditions as possible — mostly flat sequences

```
┌─────────────────────────────────────────┐
│  Shell (imperative, I/O, side effects)   │
│                                          │
│   read input → [ CORE ] → write output   │
│                                          │
│  Core (pure functions, domain logic)     │
└─────────────────────────────────────────┘
```

In async Rust this naturally becomes **synchronous core / asynchronous shell**:
the core has no `async fn`, the shell handles all `.await` calls. Function
colouring becomes a guardrail, not a burden.

**Testing:**
- Core: many fast unit tests, zero mocks
- Shell: few integration tests covering the wiring

---

## Closures

Closures are anonymous functions that capture their environment.

```rust
let add = |x: i32| x + 1;       // inferred types
let greet = |name: &str| format!("Hello, {name}");
```

**Capture modes:**
- By reference (`&T`) — default when possible
- By mutable reference (`&mut T`) — when the closure mutates
- By value (`move`) — forces ownership transfer; required for `thread::spawn`
  and `tokio::spawn`

```rust
let threshold = 5;
let above = move |x: i32| x > threshold; // threshold is moved in
```

**Closure traits:**
- `Fn` — can be called repeatedly, captures by reference
- `FnMut` — can be called repeatedly, captures by mutable reference
- `FnOnce` — can be called only once, consumes captured values

Use `impl Fn(T) -> U` in function signatures for zero-cost static dispatch.
Use `Box<dyn Fn(T) -> U>` only when you need to store closures of different
types in a collection.

---

## Iterators

Iterators are lazy and zero-cost — they compile to the same assembly as
hand-written loops.

**The three flavours:**
```rust
vec.iter()        // yields &T — borrows the collection
vec.iter_mut()    // yields &mut T — mutably borrows
vec.into_iter()   // yields T — consumes the collection
```

**Core adapters:**

```rust
// map — transform each element
items.iter().map(|x| x * 2)

// filter — keep elements matching predicate
items.iter().filter(|x| **x > 5)

// flat_map — map then flatten one level
nested.iter().flat_map(|v| v.iter())

// enumerate — attach index
items.iter().enumerate() // yields (usize, &T)

// zip — combine two iterators
a.iter().zip(b.iter())   // yields (&A, &B)

// chain — concatenate two iterators
first.iter().chain(second.iter())

// take / skip — limit or offset
items.iter().skip(2).take(5)

// peekable — inspect next without consuming
let mut iter = items.iter().peekable();
if iter.peek().is_some() { ... }
```

**Terminal consumers:**

```rust
.collect::<Vec<_>>()          // materialise into a collection
.collect::<Result<Vec<_>, _>>() // short-circuit on first Err
.sum::<i32>()
.product::<i32>()
.count()
.any(|x| x > 5)
.all(|x| x > 0)
.find(|x| **x == 3)           // returns Option<&T>
.position(|x| *x == 3)        // returns Option<usize>
.fold(init, |acc, x| acc + x) // general reduction
.for_each(|x| println!("{x}"))
```

**Prefer iterator chains over manual loops** when:
- The operation is a transformation (map, filter, fold)
- The intent is clearer expressed as a data pipeline
- No early-break is needed (use `find`, `any`, or `take_while` instead)

Use a `for` loop when:
- Early `break` with complex state is needed
- Clarity of an imperative form outweighs conciseness

---

## Option and Result as Functional Types

`Option<T>` and `Result<T, E>` support the same combinator style as iterators.

```rust
// Chaining — short-circuit on None/Err
let result = parse_score(input)
    .map(|s| clamp(s, 0.0, 10.0))
    .and_then(|s| validate_severity(s))
    .unwrap_or(0.0);

// or_else — provide fallback on failure
config.get("timeout")
    .or_else(|| env::var("TIMEOUT").ok())
    .unwrap_or("30");

// Collecting Results — stops at first error
let scores: Result<Vec<f32>, _> = inputs
    .iter()
    .map(|s| s.parse::<f32>())
    .collect();
```

---

## Immutability by Default

Rust bindings are immutable by default — this is idiomatic, not a restriction.

```rust
let x = 5;          // immutable
let mut y = 5;      // mutable — only when mutation is required
```

**Prefer immutable bindings.** Introduce `mut` only at the point where
mutation is genuinely needed. Mutable state is the imperative shell's domain.

---

## Function Composition

Rust has no built-in compose operator. Build pipelines through method chaining
or explicit function calls:

```rust
// Method chain style — most idiomatic for iterators
let result = findings
    .iter()
    .filter(|f| f.severity >= Severity::High)
    .map(|f| f.to_report_line())
    .collect::<Vec<_>>()
    .join("\n");

// Explicit composition for domain functions
fn process(input: RawFinding) -> ReportLine {
    let scored = score_cvss(input);
    let classified = classify_severity(scored);
    format_line(classified)
}
```

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Mutating a collection inside `.for_each` | Use `.map` and `.collect` |
| `for` loop building a `Vec` via `push` | `.map().collect()` |
| Deeply nested `if let` chains | `.and_then()` / `?` combinator chain |
| Side effects inside `.map` | Separate transform from effect |
| `mut` on everything by default | Bind mutably only when mutation is required |
| `async` in the functional core | Keep core sync; push async to the shell |
