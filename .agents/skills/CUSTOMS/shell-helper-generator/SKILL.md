---
name: shell-helper-generator
description: "Convert repeated shell commands into reusable Bash helper functions with safe arguments, quoting, usage checks, and dotfile placement. WHEN: \"make this a bash function\", \"turn this command into a helper\", \"create shell function\", \"wrap this CLI command\", \"bash helper\"."
license: MIT
metadata:
  author: skill-extraction-assistant
  version: "1.0.0"
---

# Shell Helper Generator

Use this skill when the user wants to convert a repeated shell command into a reusable Bash function.

## Workflow

1. **Extract command intent** - Identify the base command, fixed flags, variable arguments, optional arguments, and defaults.
2. **Choose a function name** - Prefer short names only when the user supplied one; otherwise use a descriptive lowercase shell identifier.
3. **Generate a Bash function** - Use `local` variables, quote expansions, validate required arguments, and return `2` for usage errors.
4. **Preserve command semantics** - Keep flag order unless there is a clear shell-safety reason to change it.
5. **Add usage examples** - Show at least one minimal call and one call with optional arguments when applicable.
6. **Place the function** - Recommend `~/.config/bash/functions/<topic>.bash`; reserve `~/.bashrc.local` for machine-specific overrides.
7. **Verify loading** - Include `source ~/.bashrc` and `type <function>` checks.

## Output Format

Return:

1. target file path
2. Bash function block
3. reload command
4. usage examples
5. minimal verification command

For command patterns, argument handling, and troubleshooting, see [Shell Helper Patterns](references/patterns.md).
