# Script Baseline

Use this for `.sh`, `.bash`, `.zsh`, and shell snippets.

## Interpreter Choice

- Prefer `sh` when the task does not need arrays, `[[ ]]`, brace expansion, or process substitution.
- Use `bash` only when those features materially simplify the script.
- Prefer env-based shebangs instead of hardcoded interpreter paths.
- Keep the chosen shell consistent with the syntax actually used in the file.
- Treat a shebang change as a contract change only when the script truly requires a different shell.

## Safety and Portability

- For `bash`, default to `set -euo pipefail` unless a specific script shape makes that unsafe.
- For portable `sh`, use `set -eu` and do not rely on `pipefail`.
- Quote variable expansions unless intentional splitting is required and documented.
- Use `command -v tool >/dev/null 2>&1` before depending on a non-guaranteed executable.
- Prefer standard utilities and shell built-ins before introducing extra dependencies.
- Avoid shell-specific features accidentally leaking into `sh` scripts.
- Prefer explicit conditionals and error messages over silent fallthrough behavior.

## Structure

- Keep functions short and single-purpose.
- Use descriptive lowercase function names.
- Keep environment variable names uppercase.
- Prefer explicit validation and usage text over silent fallback behavior.
- Avoid `eval` unless there is no safer option and the risk is clearly constrained.

## Common Review Questions

- Does the selected shell match the syntax in the file?
- Are safety flags appropriate for the shell and command shape?
- Are variable expansions quoted unless splitting is intentional?
- Are external command dependencies checked before first use?
- Is there any hidden destructive behavior or unsafe fallback path?

## Non-Goals

- Do not redesign the script's business logic here.
- Do not introduce new dependencies just to satisfy style preferences.
- Do not convert shell dialects unless the task explicitly moves to `shell-scripter`.
