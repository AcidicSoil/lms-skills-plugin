# Rust Fundamentals

> Source: The Rust Programming Language (Rust 1.90+, edition 2024)
> https://doc.rust-lang.org/book/

---

## Ownership Rules

- Every value has exactly one owner
- When the owner goes out of scope, the value is dropped
- Move semantics by default for non-`Copy` types — the original binding is
  invalidated after a move
- `Copy` types (primitives, `&T`, small value types) are bitwise-copied
  silently — a `move` closure on a `Copy` type copies, not moves

---

## Borrowing Rules (enforced at compile time)

- Any number of immutable references (`&T`) OR exactly one mutable reference
  (`&mut T`) — never both simultaneously
- All references must be valid for their entire lifetime
- Prefer immutable borrows; restrict `&mut` to the narrowest possible scope
- Struct decomposition: split a struct into fields to borrow them independently
  when the borrow checker rejects a whole-struct borrow

---

## Lifetimes

- Lifetime annotations describe relationships between reference lifetimes —
  they do not extend or create lifetimes
- Elision rules cover most cases — annotate explicitly only when the compiler
  cannot infer
- Avoid `'static` bounds unless the value truly lives for the entire program
- Lifetime elision in `impl` blocks: use named lifetimes for clarity when
  multiple references are involved

---

## Types and Traits

**Newtype pattern** — wrap a primitive to enforce domain correctness at the
type level. Zero runtime cost.

```rust
struct Celsius(f64);
struct Fahrenheit(f64);
```

**Enums over booleans** — booleans obscure intent; enums name states.

```rust
// Bad
fn process(is_active: bool) {}

// Good
enum Status { Active, Inactive }
fn process(status: Status) {}
```

**Traits** — define shared behaviour. Prefer small, focused traits over large
ones. Use `where` clauses for readability when bounds grow.

```rust
fn report<T>(item: T) where T: Display + Debug {}
```

**`impl Trait`** — use in argument position for simple cases; use generics
when the caller needs to control the concrete type.

**Trait objects (`dyn Trait`)** — use only when you need runtime
polymorphism. Prefer generics (monomorphization, zero cost) otherwise.

---

## Conversions

| Trait | Use |
|---|---|
| `From` / `Into` | Infallible conversions |
| `TryFrom` / `TryInto` | Fallible conversions, returns `Result` |
| `AsRef` / `AsMut` | Cheap reference conversions |
| `Deref` | Smart pointer coercions |

Implement `From<T>` — `Into<T>` is derived automatically.

---

## Collections

- `Vec<T>` — default growable sequence; pre-allocate with `Vec::with_capacity`
  when size is known
- `HashMap<K, V>` — pre-allocate with `HashMap::with_capacity`; use
  `entry().or_insert()` to avoid double lookups
- `BTreeMap` — when sorted order matters
- Prefer iterators over index loops — they compose, they're zero cost, they
  express intent

---

## Serde

```toml
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- `#[derive(Serialize, Deserialize)]` — covers most cases
- Use `#[serde(rename_all = "camelCase")]` at struct level for consistent
  field naming
- Use `#[serde(skip_serializing_if = "Option::is_none")]` to omit null fields
- Use `#[serde(default)]` to handle missing fields gracefully on deserialization
- Custom serializers: implement `Serialize` / `Deserialize` manually only when
  derive cannot express the required shape

---

## Cargo Conventions

- `edition = "2024"` in all new projects
- Workspace `Cargo.toml` at root when the project has multiple crates
- Feature flags for optional dependencies — never unconditionally include heavy
  dependencies
- `[profile.release]` tuning belongs in the workspace root, not per-crate
- `cargo clippy -- -D warnings` as part of CI — treat warnings as errors
- `cargo fmt --check` in CI — formatting is not optional

---

## Anti-Patterns to Reject

| Anti-pattern | Idiomatic alternative |
|---|---|
| `.unwrap()` / `.expect()` in production | `?` operator, explicit `match` |
| Unnecessary `.clone()` | Restructure borrows; use references |
| `panic!` in library code | Return `Result` or `Option` |
| Index-based loops (`for i in 0..n`) | Iterators with `.iter()`, `.enumerate()` |
| `Box<dyn Error>` as a return type | `thiserror` custom type or `anyhow` |
| God structs | Decompose; single responsibility |
| OOP inheritance via traits | Composition; favour small trait impls |
