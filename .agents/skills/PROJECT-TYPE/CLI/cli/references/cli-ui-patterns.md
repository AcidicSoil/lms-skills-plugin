# CLI UI Patterns

> Sources:
> - CLI Guidelines: https://clig.dev/
> - NO_COLOR standard: https://no-color.org/
> - clap_complete (Rust): https://docs.rs/clap_complete
> - click (Python): https://click.palletsprojects.com/
> - tput / ANSI (Bash): https://tldp.org/HOWTO/Bash-Prompt-HOWTO/x329.html

---

## Color — Use Sparingly and Semantically

Color adds signal when it reinforces meaning already present in text. It should
never be the sole carrier of information.

**Semantic color conventions:**

| Meaning | Color |
|---|---|
| Success, ok, green path | Green |
| Warning, caution | Yellow |
| Error, failure, critical | Red |
| Emphasis, highlight | Bold or cyan |
| Muted, secondary info | Dim/grey |

**Rules:**
- Never use color as the only differentiator — colorblind users must read the
  same information from text alone
- Use bold for emphasis; use color to reinforce severity or status
- Pair color with a label or symbol: `✓ Success`, `✗ Error`, `! Warning`
- Keep the palette small — two or three colors per screen is readable; ten is
  noise

```bash
# Bash — ANSI escape codes
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
echo -e "${GREEN}✓ Session created${NC}"
echo -e "${RED}✗ Export failed${NC}" >&2
```

```python
# Python — click handles colors and NO_COLOR automatically
import click
click.echo(click.style("✓ Session created", fg="green"))
click.echo(click.style("✗ Export failed", fg="red"), err=True)
```

```rust
// Rust — colored crate respects NO_COLOR automatically
use colored::Colorize;
println!("{}", "✓ Session created".green());
eprintln!("{}", "✗ Export failed".red());
```

---

## NO_COLOR — Mandatory Compliance

The `NO_COLOR` environment variable is a community standard. If set (to any
value), ANSI color output must be suppressed — no exceptions, no opt-outs.

Reference: https://no-color.org/

Priority order for color decisions:
1. `NO_COLOR` set → no color, always
2. `--no-color` flag → no color
3. stdout is not a TTY → no color (pipe/CI context)
4. Otherwise → color enabled

```bash
# Bash
color_enabled() {
    [ -z "${NO_COLOR+x}" ] && [ -t 1 ]
}
```

```python
# Python — click respects NO_COLOR automatically via click.style()
# For manual check:
import os, sys
def color_enabled():
    return "NO_COLOR" not in os.environ and sys.stdout.isatty()
```

```rust
// Rust — colored crate respects NO_COLOR automatically.
// For manual detection:
fn color_enabled() -> bool {
    std::env::var("NO_COLOR").is_err()
        && std::io::stdout().is_terminal()
}
```

---

## Layout and Readability

**Tables.** Use tables for structured multi-field output. Left-align text
columns; right-align numeric columns.

```
ID              SEVERITY  SCORE  TITLE
CVE-2024-1234   Critical  9.8    Remote code execution via buffer overflow
CVE-2024-5678   High      7.2    SQL injection in login endpoint
CVE-2024-9012   Medium    5.4    Insecure direct object reference
```

**Width.** Respect the terminal width — do not hardcode column widths.

```bash
# Bash
WIDTH=$(tput cols 2>/dev/null || echo 80)
```

```python
# Python
import shutil
width = shutil.get_terminal_size((80, 24)).columns
```

```rust
// Rust — terminal_size crate
use terminal_size::{terminal_size, Width};
let width = terminal_size().map(|(Width(w), _)| w as usize).unwrap_or(80);
```

**Indentation.** Use 2 spaces for nested output. Do not use tabs — tab width
varies by terminal configuration.

**Spacing.** Blank lines between logical sections. No trailing whitespace.
One newline at end of output.

---

## Progress and Feedback

**Spinners** — for short operations (< a few seconds) with unknown duration.
Write to stderr. Stop before printing results to stdout.

**Progress bars** — for operations with known progress (file processing,
batch export). Write to stderr.

**Both must be suppressed when not a TTY** — pipe or CI context does not
want progress characters corrupting output.

```bash
# Bash — simple spinner
spin() {
    [ -t 2 ] || return  # skip if not TTY
    for s in '|' '/' '-' '\'; do printf "\r$s $1" >&2; sleep 0.1; done
}
```

```python
# Python — rich or tqdm, both TTY-aware
from rich.progress import Progress
import sys

if sys.stderr.isatty():
    with Progress() as progress:
        task = progress.add_task("Exporting...", total=total)
        # update task
```

```rust
// Rust — indicatif crate
use indicatif::ProgressBar;
use is_terminal::IsTerminal;

if std::io::stderr().is_terminal() {
    let pb = ProgressBar::new(total);
    pb.finish_and_clear();  // always clear before final output
}
```

---

## Shell Completions

Shell completions reduce friction for daily users. Provide them.
The approach is language-specific but the user-facing install pattern
is the same across all languages:

```bash
# bash
tool --completions bash >> ~/.bash_completion

# zsh
tool --completions zsh > ~/.zfunc/_tool
echo "fpath+=~/.zfunc" >> ~/.zshrc

# fish
tool --completions fish > ~/.config/fish/completions/tool.fish
```

**By language:**

- **Rust** — `clap_complete` generates completions from `clap` definitions
  automatically; zero duplication
- **Python** — `click` has `shell_complete`, `argcomplete` works with
  `argparse`, `typer` generates completions natively
- **Bash** — write a `bash-completion` script manually or use
  `complete -C tool tool` for dynamic completion via the binary itself

For Rust specifically, prefer runtime generation over compile-time — the
completions stay in sync with the binary after upgrades:

```rust
// Rust — runtime generation via clap_complete
use clap::{CommandFactory, Parser};
use clap_complete::{generate, Shell};

#[derive(Parser)]
struct Cli {
    #[arg(long, value_name = "SHELL")]
    completions: Option<Shell>,
}
fn main() {
    let cli = Cli::parse();
    if let Some(shell) = cli.completions {
        generate(shell, &mut Cli::command(), "tool", &mut std::io::stdout());
        return;
    }
}
```

---

## Symbols and Icons

Use Unicode symbols to add visual anchors without relying on color alone:

| Symbol | Meaning |
|---|---|
| `✓` or `✔` | Success |
| `✗` or `✘` | Error / failure |
| `!` or `⚠` | Warning |
| `→` | Next step / continuation |
| `•` | List item |
| `…` | In progress / truncated |

Always provide a text fallback for environments that cannot render Unicode.
Default to ASCII symbols (`+`, `x`, `!`, `->`) when `TERM=dumb` or in CI.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Color as the only signal | Pair color with text label or symbol |
| Ignoring `NO_COLOR` | Check `NO_COLOR` before any ANSI output |
| Progress bars to stdout | Progress always to stderr |
| Progress bars in piped context | Check TTY before showing progress |
| Hardcoded column widths | Query terminal width at runtime |
| No shell completions | Generate via language-native tools |
| Tabs for indentation | 2 spaces — tab width is unpredictable |
| `finish()` without clear on progress bar | Always `finish_and_clear()` |
