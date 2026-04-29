# CLI UX Patterns

> Sources:
> - CLI Guidelines: https://clig.dev/
> - 12 Factor CLI Apps: https://medium.com/@jdxcode/12-factor-cli-apps-63-3a580b122157

---

## Command Structure — Pick One Grammar and Stick To It

Two valid patterns. Choose one and never mix:

- **Verb-object:** `tool get pods`, `tool delete session` — verb at top level,
  noun varies
- **Noun-verb:** `tool session create`, `tool session delete` — noun as
  subcommand, verb beneath it

For multi-level hierarchies use consistent noun-verb: `docker container create`,
`kubectl get pods`. The pattern becomes a mental model users learn once and
apply everywhere.

**Rules:**
- Use positional arguments for required, primary inputs — they are the subject
  of the sentence
- Use flags for everything optional — flags are self-documenting, arguments are
  not
- Use `--flag=value` or `--flag value` — both must work
- One-letter flags (`-v`, `-q`) only for the most common flags at the top level;
  do not exhaust the alphabet for subcommands
- Consistent flag names across subcommands — if `--output` exists on one
  command, it means the same thing on all commands
- Flag and subcommand order should be flexible where possible — users append
  flags at the end; punishing them for it is hostile

---

## Naming

- Subcommands are **verbs** or **nouns** — never abbreviations, never acronyms
  unless they are the canonical name (e.g. `tls`, `json`)
- Use familiar words: `create`, `delete`, `list`, `show`, `update`, `export`,
  `run`, `init`
- Long-form flags use full words: `--output`, `--format`, `--verbose`, not
  `--outp`, `--fmt`, `--vrb`
- Standard flag names with standard meanings — do not reinvent:

| Flag | Meaning |
|---|---|
| `--help`, `-h` | Show help |
| `--version`, `-V` | Show version |
| `--verbose`, `-v` | Increase output verbosity |
| `--quiet`, `-q` | Suppress non-essential output |
| `--output`, `-o` | Output format or file |
| `--yes`, `-y` | Skip confirmation prompts |
| `--dry-run` | Preview without executing |
| `--force` | Override safety checks |
| `--no-color` | Disable color output |

---

## Help and Documentation

**`--help` at every level.** Running any command or subcommand with `--help`
must produce useful output — not just the top-level help.

```
tool session --help       # help for the session subcommand
tool session create --help  # help for the create subcommand
```

**Help content structure:**
1. One-line description
2. Usage line: `tool session create [OPTIONS] <title>`
3. Arguments: positional args with descriptions
4. Options: flags with descriptions and defaults
5. Examples — at least one, showing the most common case

**Progressive discovery.** Running a command with missing arguments should not
error with a terse message — show help, or at minimum show what is missing and
how to get help. Running with no arguments should show a usage summary or the
most sensible default behaviour.

**Man pages.** For tools intended as part of a user's daily workflow, provide
a man page or a `--help-man` flag that generates one. Users who reach for
`man tool` should not get nothing.

**Typo suggestions.** When a subcommand is not found, suggest the closest
match. This is low-hanging fruit that most argument parsers support out of
the box.

---

## Destructive Actions

**Default to safe.** Never perform irreversible operations without explicit
confirmation.

```
$ tool session delete prod-2024-01
This will permanently delete session "prod-2024-01" with 12 findings.
Are you sure? [y/N]
```

**Patterns:**
- Prompt for confirmation — default answer is No (`[y/N]`)
- Support `--yes` / `-y` for non-interactive use (CI, scripting)
- Support `--dry-run` to preview what would happen without executing
- On `Ctrl+C` during a destructive operation: graceful stop, warn if a second
  `Ctrl+C` will force-terminate

**Tell the user what happened.** After a destructive action, state clearly
what was deleted/modified and that it cannot be undone.

---

## Next-Step Guidance

After any action, tell the user what they can do next. This is the principle
that makes `git` and `cargo` pleasant to use.

```
Session "prod-2024-01" created.
→ Add a finding:    tool finding add --session prod-2024-01
→ Export report:    tool export --session prod-2024-01
→ List sessions:    tool session list
```

**Error messages must include a next step.** An error without a suggested
action is an obstacle, not information.

```
# ❌
Error: no session found

# ✅
Error: no session found.
  Create one with: tool session create <name>
  Or list existing: tool session list
```

---

## Session and State Awareness

- Remember the last-used session/context when it makes sense — users should
  not need to repeat `--session foo` on every command
- Provide a way to see current state at any time: `tool status` or
  `tool session show`
- When the tool operates on a "current" context, show it clearly in help and
  prompts so users always know where they are

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Silent success on destructive actions | Confirm and report what happened |
| `--help` only at top level | `--help` on every subcommand |
| Inconsistent flag names across subcommands | Standardise across the entire tool |
| Errors with no next step | Every error suggests what to do |
| Positional args for optional inputs | Flags for optional, positional for required |
| Abbreviations in subcommand names | Full words, guessable names |
| Mixed noun-verb and verb-noun patterns | Pick one grammar; be consistent |
