# Common Shell Script Pitfalls

Catalog of frequent mistakes in shell scripts with explanations and fixes.

## Contents

1. [Quoting and Word Splitting](#quoting-and-word-splitting)
2. [Error Handling](#error-handling)
3. [Security and Injection](#security-and-injection)
4. [Race Conditions](#race-conditions)
5. [Signal Handling and Traps](#signal-handling-and-traps)
6. [Subshell Pitfalls](#subshell-pitfalls)
7. [Portability Traps](#portability-traps)

---

## Quoting and Word Splitting

### Unquoted variables (SC2086)

The single most common shell bug. Unquoted `$var` undergoes word splitting and globbing.

```bash
# BAD: if dir contains spaces, this breaks
cd $HOME/my directory

# GOOD:
cd "$HOME/my directory"
```

### Unquoted command substitution (SC2046)

```bash
# BAD: filenames with spaces break
for f in $(find . -name "*.txt"); do ...

# GOOD:
find . -name "*.txt" -print0 | while IFS= read -r -d '' f; do ...
```

### Quoting in conditionals

```bash
# BAD: fails if var is empty (becomes [ = "value" ])
[ $var = "value" ]

# GOOD:
[ "$var" = "value" ]
```

---

## Error Handling

### Missing error check on cd (SC2164)

```bash
# BAD: if cd fails, subsequent commands run in wrong directory
cd /some/dir
rm -rf data/

# GOOD:
cd /some/dir || { echo "Failed to cd" >&2; exit 1; }
```

### Not using set -e / set -euo pipefail

```bash
#!/usr/bin/env bash
set -euo pipefail  # Always start with this

# -e: exit on error
# -u: error on unset variables
# -o pipefail: pipe fails if any command fails
```

### Ignoring command exit status

```bash
# BAD: silently continues on failure
make build
deploy

# GOOD:
make build || { echo "Build failed" >&2; exit 1; }
deploy
```

---

## Security and Injection

### Command injection via variables

```bash
# BAD: user input executed as command
filename="$1"
eval "cat $filename"

# GOOD:
filename="$1"
cat -- "$filename"
```

### Unsafe rm -rf (SC2114, SC2115)

```bash
# BAD: if INSTALL_DIR is empty, this deletes /
rm -rf "$INSTALL_DIR/"

# GOOD:
rm -rf "${INSTALL_DIR:?ERROR: INSTALL_DIR not set}/"
```

### Path traversal

```bash
# BAD: user can pass ../../etc/passwd
process_file "$user_input"

# GOOD: validate input
case "$user_input" in
    *..* | /*) echo "Invalid path" >&2; exit 1 ;;
esac
```

---

## Race Conditions

### TOCTOU (time-of-check-time-of-use)

```bash
# BAD: file could be created between check and create
if [ ! -f "$lockfile" ]; then
    touch "$lockfile"
fi

# GOOD: atomic operation
if ! (set -o noclobber; echo $$ > "$lockfile") 2>/dev/null; then
    echo "Lock exists" >&2; exit 1
fi
```

### Temp file races

```bash
# BAD: predictable filename
tmpfile="/tmp/myapp_$$"

# GOOD: use mktemp
tmpfile=$(mktemp) || exit 1
trap 'rm -f "$tmpfile"' EXIT
```

---

## Signal Handling and Traps

### Missing cleanup on exit

```bash
# GOOD: always clean up temp files
tmpdir=$(mktemp -d) || exit 1
trap 'rm -rf "$tmpdir"' EXIT INT TERM HUP

# Work in tmpdir...
```

### Trap reset in subshells

```bash
# Traps are reset in subshells. If you need cleanup in a subshell,
# set the trap inside it.
(
    trap 'cleanup' EXIT
    # subshell work
)
```

---

## Subshell Pitfalls

### Variable changes lost in pipe

```bash
# BAD: count stays 0 (pipe creates subshell)
count=0
cat file | while read -r line; do
    count=$((count + 1))
done
echo "$count"  # Always 0!

# GOOD: use redirection instead
count=0
while read -r line; do
    count=$((count + 1))
done < file
echo "$count"
```

### Exit in subshell does not exit parent

```bash
# BAD: exit only exits the subshell
(
    some_check || exit 1  # Only exits subshell
)
# Script continues here regardless

# GOOD:
some_check || exit 1
```

---

## Portability Traps

### echo is not portable

```bash
# BAD: behavior of -n, -e varies between systems
echo -n "no newline"
echo -e "tab\there"

# GOOD: printf is portable
printf "no newline"
printf "tab\there\n"
```

### Different grep behaviors

```bash
# BAD: GNU-specific flags
grep -P '\d+' file     # -P is not portable

# GOOD: use POSIX character classes
grep '[0-9]\+' file    # basic regex
grep -E '[0-9]+' file  # extended regex (widely supported)
```

### Sed in-place editing

```bash
# BAD: GNU vs BSD differ
sed -i 's/old/new/' file     # GNU
sed -i '' 's/old/new/' file  # BSD/macOS

# GOOD: portable approach
sed 's/old/new/' file > file.tmp && mv file.tmp file
```
