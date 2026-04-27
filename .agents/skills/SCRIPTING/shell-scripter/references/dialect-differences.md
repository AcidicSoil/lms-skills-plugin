# Dialect Differences: Bash vs Zsh vs Fish

Syntax and behavior differences between major shell dialects with conversion recipes.

## Contents

1. [Feature Comparison Matrix](#feature-comparison-matrix)
2. [Conversion Recipes](#conversion-recipes)
3. [Gotchas by Dialect](#gotchas-by-dialect)

---

## Feature Comparison Matrix

| Feature | Bash | Zsh | Fish |
|---------|------|-----|------|
| Shebang | `#!/usr/bin/env bash` | `#!/usr/bin/env zsh` | `#!/usr/bin/env fish` |
| Strict mode | `set -euo pipefail` | `set -euo pipefail` | Built-in (status propagates) |
| Variables | `var=value` | `var=value` | `set var value` |
| Export | `export VAR=val` | `export VAR=val` | `set -gx VAR val` |
| Arrays | `arr=(a b c)` | `arr=(a b c)` | `set arr a b c` |
| Array index | 0-based: `${arr[0]}` | 1-based: `$arr[1]` | 1-based: `$arr[1]` |
| Assoc arrays | `declare -A map` | `typeset -A map` | Not supported |
| Cmd substitution | `$(cmd)` | `$(cmd)` | `(cmd)` |
| Process subst | `<(cmd)` | `<(cmd)` | `psub` (limited) |
| String test | `[[ $s == pat ]]` | `[[ $s == pat ]]` | `test "$s" = "pat"` |
| Arithmetic | `(( x + y ))` | `(( x + y ))` | `math x + y` |
| If/then | `if ...; then ... fi` | `if ...; then ... fi` | `if ...\n ... end` |
| For loop | `for x in ...; do ... done` | `for x in ...; do ... done` | `for x in ...\n ... end` |
| While loop | `while ...; do ... done` | `while ...; do ... done` | `while ...\n ... end` |
| Function def | `func() { ... }` | `func() { ... }` | `function func\n ... end` |
| Word splitting | Splits unquoted `$var` | Does NOT split by default | Does NOT split |
| Glob default | Globs if matches found | Globs with nomatch error | Globs silently |
| Aliases | `alias name=cmd` | `alias name=cmd` | `alias name cmd` or `abbr` |
| Here-string | `<<< "string"` | `<<< "string"` | Not supported |
| Pipe status | `$PIPESTATUS` | `$pipestatus` | `$pipestatus` |

---

## Conversion Recipes

### Bash to Fish

```bash
# Bash: variable assignment
MY_VAR="hello"
export PATH="$HOME/bin:$PATH"

# Fish equivalent:
set MY_VAR "hello"
set -gx PATH "$HOME/bin" $PATH
```

```bash
# Bash: conditional
if [ -f "$file" ]; then
    echo "exists"
elif [ -d "$file" ]; then
    echo "directory"
else
    echo "missing"
fi

# Fish equivalent:
if test -f "$file"
    echo "exists"
else if test -d "$file"
    echo "directory"
else
    echo "missing"
end
```

```bash
# Bash: for loop
for item in *.txt; do
    echo "$item"
done

# Fish equivalent:
for item in *.txt
    echo $item
end
```

```bash
# Bash: command substitution
result=$(date +%Y-%m-%d)

# Fish equivalent:
set result (date +%Y-%m-%d)
```

### Bash to Zsh

Key differences (most bash syntax works in zsh):

```bash
# Array indexing: bash 0-based -> zsh 1-based
echo "${arr[0]}"    # bash: first element
echo "$arr[1]"      # zsh: first element

# Word splitting: bash splits by default, zsh does not
# Bash: $var splits on IFS
# Zsh: $var does NOT split; use ${=var} to force splitting

# declare -> typeset
declare -a arr      # bash
typeset -a arr      # zsh (also accepts declare)
```

### Fish to Bash

```fish
# Fish: variable and export
set MY_VAR "hello"
set -gx PATH "$HOME/bin" $PATH

# Bash equivalent:
MY_VAR="hello"
export PATH="$HOME/bin:$PATH"
```

```fish
# Fish: function
function greet -a name
    echo "Hello, $name"
end

# Bash equivalent:
greet() {
    local name="$1"
    echo "Hello, $name"
}
```

---

## Gotchas by Dialect

### Bash gotchas
- Unquoted variables split on whitespace (most common bug source)
- `[` is a command; spaces around brackets are mandatory
- `==` in `[ ]` is not POSIX; use `=`
- Subshell variable changes do not propagate (pipes create subshells)
- `$()` nests; backticks do not

### Zsh gotchas
- Arrays are 1-indexed by default (`setopt KSH_ARRAYS` for 0-indexed)
- Unquoted `$var` does NOT split (opposite of bash)
- `=cmd` expands to path of cmd (can break assignments with `=`)
- `nomatch` option errors on failed globs (bash silently passes them through)
- History expansion (`!`) is active in interactive mode

### Fish gotchas
- No `$()` syntax; use `(cmd)` for command substitution
- No here-strings or here-documents
- No `&&` / `||` in older versions; use `and` / `or` (modern fish supports `&&`)
- No POSIX compatibility; scripts must be fish-native
- `set -e` does not exist; errors propagate differently
- String manipulation uses `string` builtin, not parameter expansion
