# Rust Toolchain

> Sources:
> - The Cargo Book: https://doc.rust-lang.org/cargo/
> - rustup: https://rust-lang.github.io/rustup/
> - Cargo features: https://doc.rust-lang.org/cargo/reference/features.html

---

## rustup — Toolchain Management

```bash
rustup update stable          # update to latest stable
rustup show                   # show active toolchain and installed targets
rustup component add clippy   # add clippy linter
rustup component add rustfmt  # add formatter
rustup component add rust-docs # add offline docs (rustup doc --book)
```

**Pin toolchain per project** with `rust-toolchain.toml` at project root:

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
```

This file is committed to version control — ensures consistent toolchain
across machines and CI without manual steps.

**Override per directory** (avoid for shared projects — use the file instead):
```bash
rustup override set 1.85
```

---

## Editions

Current edition: **2024** (stabilised in Rust 1.85, February 2025).

```toml
[package]
edition = "2024"
```

Always set `edition = "2024"` in new projects. The edition is per-crate in a
workspace — crates can be on different editions simultaneously.

**Migrate an existing project:**
```bash
cargo fix --edition
cargo fmt
cargo clippy --all-targets --all-features
```

`cargo fix --edition` handles mechanical changes. Manual review is still
required — the command converts syntax, not semantics.

---

## Cargo — Essential Commands

```bash
cargo new my-project          # binary project
cargo new --lib my-lib        # library project
cargo build                   # debug build
cargo build --release         # release build
cargo run                     # build and run
cargo test                    # run all tests
cargo test -- --nocapture     # show println! output in tests
cargo check                   # type-check without producing artifacts (fast)
cargo clippy                  # lint
cargo clippy -- -D warnings   # treat warnings as errors (use in CI)
cargo fmt                     # format
cargo fmt --check             # check formatting without modifying (use in CI)
cargo doc --open              # build and open docs in browser
cargo add serde               # add dependency
cargo add serde --features derive  # add dependency with features
cargo remove serde            # remove dependency
cargo update                  # update Cargo.lock to latest compatible versions
cargo tree                    # show dependency tree
cargo audit                   # check for known vulnerabilities (cargo install cargo-audit)
```

---

## Cargo.toml — Project Manifest

```toml
[package]
name = "cvss-dump"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"         # minimum supported Rust version (MSRV)
description = "Pentest report generator"
license = "MIT"
authors = ["Your Name <you@example.com>"]

[dependencies]
clap = { version = "4", features = ["derive"] }
serde = { version = "1", features = ["derive"] }
anyhow = "2"

[dev-dependencies]            # only available in tests and examples
assert_cmd = "2"
predicates = "3"

[build-dependencies]          # only available in build scripts
```

**Version specifiers:**
- `"1"` — compatible with 1.x.x (SemVer)
- `"=1.2.3"` — exact version
- `">=1.2, <2"` — range
- `"*"` — any version (avoid in published crates)

---

## Feature Flags

```toml
[features]
default = ["json"]            # enabled by default
json = ["dep:serde_json"]     # enables optional dependency
tui = ["dep:ratatui", "dep:crossterm"]

[dependencies]
serde_json = { version = "1", optional = true }
ratatui = { version = "0.29", optional = true }
crossterm = { version = "0.28", optional = true }
```

**Rules for feature design:**
- Features must be **additive** — enabling a feature adds capability, never
  removes it
- Never use a `no_std` feature to disable std; use a `std` feature to enable it
- Use `dep:` prefix to avoid implicitly exposing optional dependencies as
  public features
- Keep `default` features minimal — prefer opt-in over opt-out
- Avoid mutually exclusive features — they create combinatorial hell for
  downstream users

**Build with specific features:**
```bash
cargo build --features tui
cargo build --no-default-features
cargo build --all-features     # CI: test all feature combinations
```

---

## Workspaces

Use a workspace when you have multiple related crates (e.g. `cli` + `core`
library + `integration-tests`):

```toml
# Root Cargo.toml
[workspace]
members = ["cvss-dump-cli", "cvss-dump-core"]
resolver = "2"                # always specify resolver version

[workspace.dependencies]      # shared dependency versions
serde = { version = "1", features = ["derive"] }
anyhow = "2"
```

```toml
# Member Cargo.toml
[dependencies]
serde.workspace = true        # inherit from workspace
anyhow.workspace = true
```

**Benefits:** single `Cargo.lock` for all members, shared build cache, unified
`cargo test` and `cargo build` commands.

---

## CI Minimum Checks

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo build --release
```

Run these in order. A failing `fmt --check` or `clippy` should block the build.

---

## Useful Third-party Cargo Tools

```bash
cargo install cargo-audit     # vulnerability scanning
cargo install cargo-expand    # expand macros for debugging
cargo install cargo-watch     # auto-rebuild on file change: cargo watch -x test
cargo install cargo-nextest   # faster test runner: cargo nextest run
```

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| No `rust-toolchain.toml` | Commit it — lock toolchain per project |
| `edition = "2021"` in new projects | Use `edition = "2024"` |
| Wildcard versions (`"*"`) | Pin with SemVer (`"1"`, `"=1.2.3"`) |
| Mutually exclusive features | Redesign to additive feature model |
| Heavy `default` feature set | Minimal defaults; features are opt-in |
| No `rust-version` in published crates | Always declare MSRV |
| Running `cargo test` without `--all-features` in CI | Test all feature combinations |
