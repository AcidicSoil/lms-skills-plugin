# Shell Helper Patterns

## Required Argument Pattern

```bash
name() {
  local value="${1:-}"

  if [[ -z "$value" ]]; then
    echo "usage: name <value>" >&2
    return 2
  fi

  command --flag "$value"
}
```

## Optional Argument Pattern

Omit optional arguments when empty if the underlying CLI changes behavior when an empty string is passed.

```bash
searchh() {
  local query="${1:-}"
  local path="${2:-}"

  if [[ -z "$query" ]]; then
    echo "usage: searchh <query> [path]" >&2
    return 2
  fi

  if [[ -n "$path" ]]; then
    tool search "$query" "$path" --limit 10
  else
    tool search "$query" --limit 10
  fi
}
```

## Required Pair Pattern

```bash
qk() {
  local query="${1:-}"
  local collection="${2:-}"

  if [[ -z "$query" || -z "$collection" ]]; then
    echo "usage: qk <query> <collection>" >&2
    return 2
  fi

  qmd query "$query" -c "$collection" -n 10
}
```

## Safety Rules

| Case | Rule |
|---|---|
| User input | Always quote: `"$query"` |
| Missing required arg | Print usage to stderr and `return 2` |
| Optional arg | Include only when non-empty unless default is explicit |
| Complex pipeline | Prefer a function over an alias |
| Reused command family | Put related functions in one topic file |

## Placement

Recommended layout:

```text
~/.config/bash/functions/
├── search.bash
├── process.bash
└── git.bash
```

Loader:

```bash
if [[ -d ~/.config/bash/functions ]]; then
  for f in ~/.config/bash/functions/*.bash; do
    [[ -e "$f" ]] || continue
    source "$f"
  done
fi
```

## Verification

```bash
source ~/.bashrc
type function_name
function_name --help 2>/dev/null || true
```

If `type` reports not found, check that the file exists, the loader sources `*.bash`, and the function file has no syntax errors:

```bash
bash -n ~/.config/bash/functions/search.bash
grep -Rns '^function_name()' ~/.config/bash/functions
```
