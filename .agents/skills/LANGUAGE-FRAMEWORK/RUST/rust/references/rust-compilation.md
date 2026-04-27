# Rust Compilation

> Sources:
> - The Rust Performance Book: https://nnethercote.github.io/perf-book/build-configuration.html
> - min-sized-rust: https://github.com/johnthagen/min-sized-rust
> - cross-rs: https://github.com/cross-rs/cross
> - rustup cross-compilation: https://rust-lang.github.io/rustup/cross-compilation.html

---

## Build Profiles

Rust has two built-in profiles:

| Profile | Command | Optimised | Debug info | Assertions |
|---|---|---|---|---|
| `dev` | `cargo build` | No | Yes | Yes |
| `release` | `cargo build --release` | Yes (`opt-level=3`) | No | No |

Always ship `--release` builds. Debug builds can be 10-100x slower.

---

## Release Profile — Standard Tuning

For most CLI tools, add to `Cargo.toml`:

```toml
[profile.release]
opt-level = 3       # default — maximum speed
lto = true          # link-time optimisation — cross-crate dead code elimination
codegen-units = 1   # single codegen unit — enables more optimisations; slower compile
strip = true        # strip debug symbols — reduces binary size
panic = "abort"     # smaller binary; no stack unwinding on panic
```

**Trade-offs:**
- `lto = true` + `codegen-units = 1` → significantly longer compile time, smaller
  and faster binary
- `strip = true` → removes debug symbols; makes crash backtraces less readable
- `panic = "abort"` → no `catch_unwind` possible; fine for CLI tools, not
  libraries

**For size-optimised distribution** (embedded, minimal containers):

```toml
[profile.release]
opt-level = "z"     # optimise for size over speed
lto = true
codegen-units = 1
strip = true
panic = "abort"
```

`opt-level = "z"` produces smaller binaries than `"s"` in most cases.
Benchmark both — results vary by codebase.

---

## Custom Profiles

Useful for a balanced "fast but not slow to compile" build:

```toml
[profile.dist]
inherits = "release"
lto = true
codegen-units = 1
strip = true
```

```bash
cargo build --profile dist
```

Output goes to `target/dist/`.

---

## Target Triples

Rust identifies platforms by a triple: `<arch>-<vendor>-<os>-<abi>`.

```bash
rustc -vV | grep host    # show current host triple
rustup target list        # list all available targets
rustup target list --installed  # show installed targets
```

**Common targets:**

| Target | Description |
|---|---|
| `x86_64-unknown-linux-gnu` | Linux x86-64, dynamically linked (glibc) |
| `x86_64-unknown-linux-musl` | Linux x86-64, statically linked (musl) |
| `aarch64-unknown-linux-gnu` | Linux ARM64 (servers, Raspberry Pi 4+) |
| `x86_64-apple-darwin` | macOS Intel |
| `aarch64-apple-darwin` | macOS Apple Silicon (M1/M2/M3) |
| `x86_64-pc-windows-gnu` | Windows x86-64 via MinGW |
| `x86_64-pc-windows-msvc` | Windows x86-64 via MSVC |

---

## Static vs Dynamic Linking

**Prefer static linking for CLI distribution.** Dynamic linking requires the
exact glibc version to be present on the target system.

Use `musl` targets for maximum portability on Linux:

```bash
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl
```

musl binaries are self-contained — they run on any Linux regardless of glibc
version.

---

## Cross-Compilation

### Native (no Docker)

```bash
# Install target stdlib
rustup target add aarch64-unknown-linux-gnu

# Configure linker in .cargo/config.toml
```

```toml
# .cargo/config.toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
```

```bash
cargo build --release --target aarch64-unknown-linux-gnu
```

Requires the cross-compiler linker to be installed on the host system.

### cross (Docker-based — recommended)

`cross` replaces `cargo` with zero linker setup. Uses Docker images per target.

```bash
cargo install cross --git https://github.com/cross-rs/cross

# Drop-in replacement for cargo
cross build --release --target aarch64-unknown-linux-gnu
cross build --release --target x86_64-unknown-linux-musl
cross build --release --target x86_64-pc-windows-gnu
```

**Limitations:**
- Requires Docker (or Podman) running
- macOS targets not supported out of the box (Apple SDK licensing) — must build
  native on macOS

### Declare targets in rust-toolchain.toml

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
targets = [
    "x86_64-unknown-linux-musl",
    "aarch64-unknown-linux-gnu",
    "x86_64-pc-windows-gnu",
]
```

This installs all targets automatically on `rustup` setup.

---

## CI Release Matrix

Standard GitHub Actions pattern for multi-target release:

```yaml
strategy:
  matrix:
    include:
      - os: ubuntu-latest
        target: x86_64-unknown-linux-musl
      - os: ubuntu-latest
        target: aarch64-unknown-linux-gnu
      - os: macos-latest
        target: aarch64-apple-darwin
      - os: ubuntu-latest
        target: x86_64-pc-windows-gnu
```

Build Linux targets with `cross`, macOS natively.

---

## Analysing Binary Size

```bash
cargo install cargo-bloat
cargo bloat --release --crates   # breakdown by crate
cargo bloat --release -n 20      # top 20 functions by size
```

Common size culprits:
- `std` backtrace and panic machinery — mitigated by `panic = "abort"`
- Monomorphised generics — check with `cargo-llvm-lines`
- Heavy dependencies (e.g. `regex`, `chrono`) — consider lighter alternatives
  (`aho-corasick`, `time`)

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Shipping debug builds | Always `--release` for distribution |
| Dynamic linking for CLI tools | Use musl targets for static binaries |
| `cargo build` for cross-compile setup | Use `cross` for Docker-managed toolchains |
| No `rust-toolchain.toml` targets list | Declare all targets in the file |
| Optimising without measuring | Profile with `cargo-bloat` first |
| `lto = true` in dev profile | LTO only in release/dist profiles |
