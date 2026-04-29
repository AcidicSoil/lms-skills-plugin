# CLI State Patterns

> Sources:
> - XDG Base Directory Specification: https://specifications.freedesktop.org/basedir/latest/
> - CLI Guidelines config section: https://clig.dev/#configuration
> - directories crate (Rust): https://docs.rs/directories
> - platformdirs (Python): https://pypi.org/project/platformdirs/

---

## XDG Base Directory Specification

The XDG spec defines where CLI tools should store different types of data.
Following it keeps the user's home directory clean and makes paths predictable.

| Category | Variable | Default (Linux) | Purpose |
|---|---|---|---|
| Config | `$XDG_CONFIG_HOME` | `~/.config` | User preferences, settings |
| Data | `$XDG_DATA_HOME` | `~/.local/share` | Persistent user data |
| State | `$XDG_STATE_HOME` | `~/.local/state` | Session history, last-used values |
| Cache | `$XDG_CACHE_HOME` | `~/.cache` | Derived, rebuildable data |
| Runtime | `$XDG_RUNTIME_DIR` | `/run/user/<uid>` | Sockets, PIDs — session only |

**Always use a subdirectory named after your tool:** `~/.config/my-tool/`,
never directly in `~/.config/`.

macOS uses `~/Library/Application Support/`, `~/Library/Caches/` etc.
Use a platform-aware library rather than hardcoding paths.

---

## Config vs Data vs State vs Cache

| Type | Back up? | Machine-specific? | Example |
|---|---|---|---|
| Config | ✅ Yes | No — portable | `config.toml`, theme, editor |
| Data | ✅ Yes | No — portable | User's work files, saved records |
| State | ❌ No | Yes | Last session, command history |
| Cache | ❌ No | Yes | Derived indexes, downloaded completions |

**Never store anything in Cache that the user cannot afford to lose.**
Cache must be safely deletable at any time.

---

## Platform-Aware Path Resolution

**Bash:**
```bash
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/my-tool"
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/my-tool"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/my-tool"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/my-tool"

mkdir -p "$CONFIG_DIR" "$DATA_DIR" "$STATE_DIR" "$CACHE_DIR"
```

**Python — `platformdirs` (cross-platform, XDG on Linux):**
```python
from platformdirs import user_config_dir, user_data_dir, user_cache_dir, user_state_dir

APP = "my-tool"
config_dir = user_config_dir(APP)
data_dir   = user_data_dir(APP)
state_dir  = user_state_dir(APP)
cache_dir  = user_cache_dir(APP)
```

**Rust — `directories` crate (cross-platform, XDG on Linux):**
```rust
use directories::ProjectDirs;

let dirs = ProjectDirs::from("io", "example", "my-tool")
    .expect("cannot determine home directory");

let config_dir = dirs.config_dir();
let data_dir   = dirs.data_dir();
let state_dir  = dirs.state_dir().unwrap_or(dirs.data_dir());
let cache_dir  = dirs.cache_dir();
```

---

## Config File Layering — Priority Order

Configuration should be overridable at multiple levels. Standard precedence
(highest to lowest):

```
1. CLI flags          --output json
2. Environment vars   MY_TOOL_OUTPUT=json
3. Project config     ./.my-tool.toml   (current directory)
4. User config        ~/.config/my-tool/config.toml
5. System config      /etc/xdg/my-tool/config.toml
6. Defaults           hardcoded in the binary
```

Environment variable naming: uppercase, underscores, prefixed with the tool
name — `MY_TOOL_FLAG_NAME`. Document them in `--help`.

**Bash:**
```bash
# Layer: env > config file > default
output="${MY_TOOL_OUTPUT:-$(grep '^output' "$CONFIG_DIR/config" 2>/dev/null | cut -d= -f2)}"
output="${output:-human}"
```

**Python:**
```python
import os, tomllib
from pathlib import Path

def load_config(config_path: Path) -> dict:
    if config_path.exists():
        with open(config_path, "rb") as f:
            return tomllib.load(f)
    return {}

config = load_config(Path(config_dir) / "config.toml")

output = (
    args.output                          # 1. CLI flag
    or os.environ.get("MY_TOOL_OUTPUT")  # 2. Env var
    or config.get("output")             # 3. Config file
    or "human"                          # 4. Default
)
```

**Rust:**
```rust
fn output_format(args: &Args, config: &Config) -> OutputFormat {
    if let Some(fmt) = args.output { return fmt; }
    if let Ok(val) = std::env::var("MY_TOOL_OUTPUT") {
        if let Ok(fmt) = val.parse() { return fmt; }
    }
    if let Some(fmt) = config.output { return fmt; }
    OutputFormat::Human
}
```

---

## Config File Format

**TOML** — recommended for tools targeting developers. Human-readable,
minimal syntax, well-supported in Rust, Python, and most languages.

```toml
# ~/.config/my-tool/config.toml
output = "json"
editor = "nvim"

[report]
template = "default"
include_remediation = true
```

Parse with `toml` (Rust), `tomllib` (Python 3.11+), or `toml` (Python <3.11).
Always use `Default` / fallbacks so missing keys are graceful — never
hard-fail on a missing optional config field.

---

## Session State

For tools that track a "current context" (active session, last target,
most-recently used file), store it in the state directory:

**Bash:**
```bash
save_last_session() {
    mkdir -p "$STATE_DIR"
    echo "$1" > "$STATE_DIR/last_session"
}
load_last_session() {
    cat "$STATE_DIR/last_session" 2>/dev/null
}
```

**Python:**
```python
from pathlib import Path

state_file = Path(state_dir) / "last_session"

def save_last_session(session_id: str) -> None:
    state_file.parent.mkdir(parents=True, exist_ok=True)
    state_file.write_text(session_id)

def load_last_session() -> str | None:
    return state_file.read_text().strip() if state_file.exists() else None
```

**Rust:**
```rust
fn save_last_session(id: &str) -> anyhow::Result<()> {
    let path = dirs.state_dir()
        .unwrap_or(dirs.data_dir())
        .join("last_session");
    std::fs::create_dir_all(path.parent().unwrap())?;
    std::fs::write(path, id)?;
    Ok(())
}

fn load_last_session() -> Option<String> {
    let path = dirs.state_dir()?.join("last_session");
    std::fs::read_to_string(path).ok()
}
```

---

## `--config` Flag

Always provide a `--config` flag to override the config file path. Essential
for testing, CI, and multiple profiles.

```
tool --config /tmp/test-config.toml run
MY_TOOL_CONFIG=~/.config/my-tool/work.toml tool run
```

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Writing to `~/.my-tool` directly | Use XDG directories via platform library |
| Mixing config, data, cache in one dir | Separate by XDG category |
| No env var override for config path | `MY_TOOL_CONFIG` env var + `--config` flag |
| Hard-failing on missing config fields | Fallback to defaults for optional fields |
| Storing rebuildable data in data dir | Cache dir for anything regenerable |
| Config file only, no layering | Flags > env > file > defaults always |
| Hardcoding Linux paths on macOS/Windows | Use `platformdirs` / `directories` |
