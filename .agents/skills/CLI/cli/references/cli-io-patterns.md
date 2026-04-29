# CLI I/O Patterns

> Sources:
> - CLI Guidelines: https://clig.dev/
> - POSIX standard streams specification
> - Standard I/O in Rust: https://thelinuxcode.com/standard-io-in-rust-a-practical-guide-for-real-cli-work/
> - Python docs — sys.stdout/stderr: https://docs.python.org/3/library/sys.html

---

## The Contract: stdout vs stderr

| Stream | Purpose |
|---|---|
| `stdout` | Results, data, output meant for downstream consumption |
| `stderr` | Progress, warnings, errors, diagnostics |

This separation is not a convention — it is the mechanism that makes tools
composable. When piped, `stdout` flows to the next command; `stderr` flows to
the terminal. Mixing them breaks pipelines.

```bash
# Bash
echo "finding: $title"          # result → stdout
echo "warning: no scope" >&2    # diagnostic → stderr
```

```python
# Python
import sys
print(f"finding: {finding.title}")                    # stdout
print("warning: no scope defined", file=sys.stderr)   # stderr
```

```rust
// Rust
println!("finding: {}", finding.title);   // stdout
eprintln!("warning: no scope defined");   // stderr
```

---

## TTY Detection

A TTY (teletypewriter) is a terminal connected to a human. A non-TTY context
means the output is piped, redirected to a file, or running in CI.

| Context | Behaviour |
|---|---|
| TTY (interactive) | Colors, progress bars, spinners, interactive prompts |
| Non-TTY (piped/CI) | Plain text, no colors, no progress, no prompts |

```bash
# Bash — file descriptor 1 = stdout
if [ -t 1 ]; then
    echo "interactive — colors and progress ok"
else
    echo "piped or CI — plain output only"
fi
```

```python
# Python
import sys
if sys.stdout.isatty():
    pass  # show colors, progress
else:
    pass  # plain output only
```

```rust
// Rust — is-terminal crate
use is_terminal::IsTerminal;
let interactive = std::io::stdout().is_terminal();
```

Always check `stdout` for display decisions. Check `stdin` for prompt
decisions. Never show interactive prompts when stdin is not a TTY — prompt
text corrupts piped data.

---

## Structured Output — `--output json`

Provide machine-readable output for scripting and automation:

- Default: human-readable (tables, formatted text)
- `--output json` or `--json`: machine-readable JSON to stdout

```
$ tool session list
ID              FINDINGS  CREATED
prod-2024-01    12        2024-11-01
prod-2024-02    8         2024-11-15

$ tool session list --output json
[
  {"id": "prod-2024-01", "findings": 12, "created_at": "2024-11-01"},
  {"id": "prod-2024-02", "findings": 8, "created_at": "2024-11-15"}
]
```

**JSON output rules:**
- Field names: `snake_case` — pick one convention and never change it
- Timestamps: ISO 8601 (`2024-11-01T09:00:00Z`)
- Errors in JSON mode: write a JSON error object to stderr, not a plain string
- Stable schema — JSON output is a public contract; breaking changes need
  versioning

---

## Reading from stdin

Support `-` as a filename alias for stdin — the Unix convention:

```
tool report generate --input -       # read from stdin
cat findings.json | tool report generate --input -
```

Input source priority (in order):
1. `--input <file>` flag if provided
2. stdin if it is piped (not a TTY)
3. Show help/guidance and exit if neither

```bash
# Bash
if [ "${INPUT:-}" = "-" ] || [ ! -t 0 ]; then
    data=$(cat)           # read from stdin
elif [ -n "${INPUT:-}" ]; then
    data=$(cat "$INPUT")  # read from file
else
    echo "No input. Use --input <file> or pipe data." >&2
    exit 1
fi
```

```python
# Python
import sys

def open_input(path: str | None):
    if path == "-" or (path is None and not sys.stdin.isatty()):
        return sys.stdin
    elif path:
        return open(path)
    else:
        print("No input provided. Use --input <file> or pipe data.", file=sys.stderr)
        sys.exit(1)
```

```rust
// Rust
use std::io::{self, BufRead};
use is_terminal::IsTerminal;

fn open_input(path: Option<&str>) -> Box<dyn BufRead> {
    match path {
        Some("-") | None if !std::io::stdin().is_terminal() => {
            Box::new(io::BufReader::new(io::stdin()))
        }
        Some(p) => Box::new(io::BufReader::new(std::fs::File::open(p).unwrap())),
        None => {
            eprintln!("No input provided. Use --input <file> or pipe data.");
            std::process::exit(1);
        }
    }
}
```

---

## Argument Parsing

Language-agnostic rules:
- **Positional arguments** for required, primary inputs
- **Flags** for everything optional or modifying — flags are self-documenting
- Avoid two positional arguments unless the relationship is universally known
  (e.g. `cp <src> <dst>`)
- Use enums over booleans for mode flags — `--format json` beats
  `--json` + `--plain` + `--csv` as separate flags

Libraries by language: `clap` (Rust), `click`/`typer`/`argparse` (Python),
`getopts`/`getopt` (Bash).

---

## Exit Codes

Exit codes are the I/O contract for scripts and CI. Language-agnostic.

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | General error |
| `2` | Incorrect usage (bad arguments) |
| `130` | Interrupted by user (`Ctrl+C`, SIGINT) |

```bash
# Bash
command || { echo "failed" >&2; exit 1; }
```

```python
# Python
import sys
sys.exit(1)
```

```rust
// Rust
std::process::exit(1);
```

**Document exit codes** in `--help` and man page. Scripts depend on them.
Never exit with `0` on an error.

---

## Piping and Composability

Language-agnostic rules:
- Emit one record per line in plain mode when output will be filtered
- Support `tool list | grep foo` without special handling
- Flush stdout after each line when streaming
- Handle `SIGPIPE` gracefully — when the consumer closes the pipe
  (e.g. `tool list | head -5`), exit silently

```bash
# Bash — flush is automatic per echo/printf
printf '%s\n' "$result"
```

```python
# Python — flush explicitly when streaming
print(result, flush=True)
```

```rust
// Rust — ignore broken pipe errors at exit
use std::io::Write;
let _ = std::io::stdout().flush();
```

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Progress output to stdout | Progress to stderr only |
| Error messages to stdout | Errors to stderr always |
| No `--output json` support | Provide machine-readable format for scripting |
| Interactive prompts when stdin is piped | Check TTY before prompting |
| Exit 0 on error | Non-zero exit code on any failure |
| No stdin pipe support | Accept `-` as stdin alias |
| Mixing human and machine output | Separate modes: default human, `--output json` machine |
