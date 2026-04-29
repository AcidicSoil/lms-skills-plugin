---
name: cli
description: >
  CLI and terminal application design. Load and use proactively when building,
  reviewing, or designing command-line tools regardless of language. Covers
  terminal UX conventions, argument design, I/O handling, state persistence,
  and visual formatting. NOT for language-specific implementation details —
  use the relevant language skill (rust, python, ...) for those.
---

## Routing Table

| Task context | Reference |
|---|---|
| Command structure, naming, verbs, subcommands, destructive actions, next-step guidance, config layering, XDG, session state | `references/cli-ux-patterns.md` |
| TTY detection, structured output, stdin/stdout/stderr, piping, argument parsing, exit codes | `references/cli-io-patterns.md` |
| Color, formatting, layout, readability, a11y, shell completions | `references/cli-ui-patterns.md` |
| Config layering, XDG spec, session state, local persistence | `references/cli-state-patterns.md` |
