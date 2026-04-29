# POSIX Compatibility Guide

Patterns for writing portable shell scripts that work across sh, bash, dash, and other POSIX-compliant shells.

## Contents

1. [POSIX-Guaranteed Builtins](#posix-guaranteed-builtins)
2. [Common Bash-isms and POSIX Equivalents](#common-bash-isms-and-posix-equivalents)
3. [Portability Patterns](#portability-patterns)

---

## POSIX-Guaranteed Builtins

These are available in every POSIX-compliant shell:

**Special builtins** (affect shell state): `break`, `colon (:)`, `continue`, `dot (.)`, `eval`, `exec`, `exit`, `export`, `readonly`, `return`, `set`, `shift`, `times`, `trap`, `unset`

**Regular builtins**: `alias`, `bg`, `cd`, `command`, `false`, `fc`, `fg`, `getopts`, `hash`, `jobs`, `kill`, `newgrp`, `pwd`, `read`, `true`, `type`, `ulimit`, `umask`, `unalias`, `wait`

**NOT guaranteed (common bash-isms):** `local`, `declare`, `typeset`, `source`, `select`, `let`, `shopt`, `pushd`, `popd`, `dirs`

---

## Common Bash-isms and POSIX Equivalents

| Bash-ism | POSIX Equivalent | Notes |
|----------|-----------------|-------|
| `[[ condition ]]` | `[ condition ]` | Use `-a`/`-o` sparingly; prefer `&&`/`\|\|` |
| `(( arithmetic ))` | `$(( arithmetic ))` or `expr` | `$(( ))` for assignment; `expr` for standalone |
| `source file.sh` | `. file.sh` | Dot-space-path |
| `function name {` | `name() {` | POSIX only supports `name()` syntax |
| `local var=val` | Use naming conventions (`_func_var`) | Not POSIX but widely supported |
| `declare -a arr` | Use positional parameters | `set -- a b c; echo "$1"` |
| `${arr[@]}` | Positional: `"$@"` | No real array equivalent in POSIX |
| `declare -A hash` | No equivalent | Use files or eval tricks |
| `${var,,}` / `${var^^}` | `echo "$var" \| tr '[:upper:]' '[:lower:]'` | Case conversion |
| `${var/pat/rep}` | `echo "$var" \| sed 's/pat/rep/'` | Pattern substitution |
| `<(cmd)` / `>(cmd)` | Temp files or named pipes | Process substitution |
| `{1..10}` | `seq 1 10` or `i=1; while [ $i -le 10 ]; ...` | Brace expansion |
| `$'...'` (ANSI-C quoting) | `printf '\n'` | Escape sequences |
| `<<<string` (here-string) | `echo "string" \| cmd` | Pipe instead |
| `read -p "prompt"` | `printf "prompt"; read var` | printf + read |
| `read -a array` | No equivalent | Read into positional params |
| `$RANDOM` | `awk 'BEGIN{srand(); print int(rand()*32768)}'` | Or read from /dev/urandom |
| `$BASH_SOURCE` | `$0` (limited) | Not equivalent in sourced scripts |
| `;&` (fallthrough in case) | Duplicate case body | No fallthrough in POSIX case |
| `\|&` (pipe stderr) | `cmd 2>&1 \|` | Redirect stderr to stdout first |

---

## Portability Patterns

### String comparison

```sh
# POSIX-safe comparison
if [ "$var" = "value" ]; then   # = not ==
    echo "match"
fi

# Check empty/non-empty
if [ -z "$var" ]; then echo "empty"; fi
if [ -n "$var" ]; then echo "set"; fi
```

### Arithmetic

```sh
# POSIX arithmetic
result=$((a + b))
i=$((i + 1))

# Comparison
if [ "$a" -gt "$b" ]; then echo "greater"; fi
```

### Default values

```sh
# POSIX parameter expansion (these work everywhere)
${var:-default}     # Use default if unset or empty
${var:=default}     # Assign default if unset or empty
${var:+alternate}   # Use alternate if set and non-empty
${var:?message}     # Error with message if unset or empty
```

### Portable function pattern

```sh
my_function() {
    _mf_arg1="$1"    # Prefix with _funcname_ instead of local
    _mf_arg2="$2"
    # function body
}
```

### Portable temp files

```sh
tmpfile=$(mktemp) || exit 1
trap 'rm -f "$tmpfile"' EXIT INT TERM
```

### Reading files line by line

```sh
while IFS= read -r line; do
    printf '%s\n' "$line"
done < file.txt
```

### Check command existence

```sh
# POSIX
if command -v git >/dev/null 2>&1; then
    echo "git found"
fi
# NOT: which git, type git, hash git
```
