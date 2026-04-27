# Rust Command-Line Application

> Sources:
> - Command Line Applications in Rust: https://rust-cli.github.io/book/
> - clap v4 derive API: https://docs.rs/clap/latest/clap/_derive/
> - ratatui: https://ratatui.rs/
> - crossterm: https://docs.rs/crossterm/

---

## Project Setup

```toml
[dependencies]
clap = { version = "4", features = ["derive"] }
ratatui = "0.29"
crossterm = "0.28"
anyhow = "1"
```

Use `cargo add clap --features derive` for convenience.

---

## clap — Argument Parsing (Derive API)

**Always use the derive API.** The builder API is more verbose and less
maintainable for most cases.

```rust
use clap::{Parser, Subcommand};

/// One-line description shown in --help
#[derive(Parser)]
#[command(author, version, about, long_about = None)]
#[command(propagate_version = true)]
struct Cli {
    /// Global verbose flag
    #[arg(short, long, global = true)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Add a new finding
    Add {
        /// Finding title
        title: String,
    },
    /// Export report
    Export {
        /// Output file path
        #[arg(short, long)]
        output: Option<std::path::PathBuf>,
    },
}
```

**Key attributes:**
- `#[command(arg_required_else_help = true)]` — show help when no args given
- `#[arg(global = true)]` — flag available to all subcommands
- `#[arg(env = "MY_VAR")]` — override via environment variable
- `#[arg(value_enum)]` — parse directly into an enum with `ValueEnum`
- Doc comments `///` become help text — write them as user-facing descriptions

**Testing clap:**
```rust
// Use try_parse_from in tests — never parse() which calls process::exit
let cli = Cli::try_parse_from(&["app", "--verbose", "add", "title"]).unwrap();
```

---

## Application Architecture

### CLI-only tool

Flat `main.rs` for simple tools. Split into `cli.rs` (argument structs) and
`lib.rs` (domain logic) as soon as the tool grows beyond one command.

```
src/
├── main.rs       # entry point, wires cli → domain
├── cli.rs        # clap structs only
└── lib.rs        # domain logic, no clap dependency
```

### TUI application (ratatui)

Separate rendering from state from event handling:

```
src/
├── main.rs       # init terminal, run loop, restore terminal
├── app.rs        # App struct — owns all state
├── ui.rs         # render functions — takes &App, returns nothing
└── events.rs     # event reading, key mapping → app mutations
```

---

## ratatui — TUI Architecture

**Immediate-mode rendering:** you own the loop, redraw entire UI each frame
from current state. ratatui does not own the event loop.

### Minimal application loop

```rust
fn main() -> anyhow::Result<()> {
    let mut terminal = ratatui::init();
    let result = run(&mut terminal);
    ratatui::restore();
    result
}

fn run(terminal: &mut DefaultTerminal) -> anyhow::Result<()> {
    let mut app = App::default();
    loop {
        terminal.draw(|frame| ui::render(frame, &app))?;
        if let Event::Key(key) = event::read()? {
            app.handle_key(key);
            if app.should_quit {
                break;
            }
        }
    }
    Ok(())
}
```

**Rules:**
- `terminal.draw()` called exactly once per loop iteration
- State mutation happens in `handle_key` or equivalent — never inside `draw`
- `ratatui::init()` / `ratatui::restore()` handle raw mode and cleanup
- Always restore terminal on panic — use `color_eyre` or a custom panic hook

### State as a finite state machine

Model application state as explicit variants — not boolean flags:

```rust
enum AppState {
    Browsing,
    Editing { field: EditTarget },
    Confirming { action: ConfirmAction },
}
```

This makes transitions explicit and testable without a running terminal.

### Layout constraints

```rust
let layout = Layout::vertical([
    Constraint::Length(3),    // fixed height header
    Constraint::Fill(1),      // fills remaining space
    Constraint::Length(1),    // fixed height footer
]).split(frame.area());
```

- `Constraint::Length(n)` — fixed size
- `Constraint::Fill(n)` — proportion of remaining space
- `Constraint::Min(n)` / `Constraint::Max(n)` — bounded flexible

### Widget rendering

```rust
fn render(frame: &mut Frame, app: &App) {
    frame.render_widget(
        Paragraph::new(app.status_text())
            .block(Block::bordered().title("Status")),
        layout[0],
    );
}
```

Widgets are value types — create them in the render function, do not store them.

---

## crossterm — Events

```rust
use crossterm::event::{self, Event, KeyCode, KeyModifiers};

// Blocking read — simplest pattern
if let Event::Key(key) = event::read()? { ... }

// Polling with timeout — for tick-based animations
if event::poll(Duration::from_millis(16))? {
    if let Event::Key(key) = event::read()? { ... }
}
```

**Standard key bindings (respect conventions):**
- `q` / `Esc` — quit or go back
- `?` — show help
- `j` / `k` or arrow keys — navigate lists
- `Enter` — confirm
- `Ctrl+c` — force quit (always handle)

---

## Output to humans and machines

- Write progress/status to `stderr`, results to `stdout`
- Detect TTY: `std::io::stdout().is_terminal()` (use `is-terminal` crate)
- When not a TTY (piped): suppress colors, suppress progress, emit clean output
- Support `--quiet` / `-q` and `--verbose` / `-v` flags

```rust
use is_terminal::IsTerminal;

if std::io::stdout().is_terminal() {
    // colored, interactive output
} else {
    // plain, machine-readable output
}
```

---

## Panic handling

```rust
// In main(), before anything else
human_panic::setup_panic!();
```

Or use `color_eyre::install()?` for richer error output with backtraces.

---

## Anti-patterns

| Anti-pattern | Correct approach |
|---|---|
| `Cli::parse()` in tests | `Cli::try_parse_from(&[...])` |
| Storing widgets as struct fields | Create widgets in render functions |
| Mutating state inside `draw()` | Separate event handling from rendering |
| `println!` for errors | `eprintln!` or `tracing::error!` |
| `process::exit()` directly | Return `Result` up to `main` |
| Boolean mode flags (`is_editing: bool`) | Enum state machine |
