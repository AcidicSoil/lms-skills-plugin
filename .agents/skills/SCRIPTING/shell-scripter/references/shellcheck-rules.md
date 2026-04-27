# ShellCheck Rules Reference

Top 50 ShellCheck rules by frequency. Reference these IDs when reporting findings -- do NOT claim to run ShellCheck.

## Contents

1. [Quoting Rules](#quoting-rules)
2. [Conditional Rules](#conditional-rules)
3. [Command Rules](#command-rules)
4. [Portability Rules](#portability-rules)
5. [Style Rules](#style-rules)

---

## Quoting Rules

| SC Code | Severity | Message | Example | Fix |
|---------|----------|---------|---------|-----|
| SC2086 | warning | Double quote to prevent globbing and word splitting | `echo $var` | `echo "$var"` |
| SC2046 | warning | Quote command substitution to prevent splitting | `files=$(ls)` | `files="$(ls)"` |
| SC2027 | warning | Unquoted variable in echo | `echo $HOME/path` | `echo "$HOME/path"` |
| SC2048 | warning | Use "$@" to avoid word splitting in arrays | `for i in $@` | `for i in "$@"` |
| SC2006 | style | Use $() instead of backticks for command substitution | `` files=`ls` `` | `files=$(ls)` |
| SC2016 | info | Expressions in single quotes are not expanded | `echo '$HOME'` | `echo "$HOME"` |
| SC2034 | warning | Variable appears unused (verify it is exported or used) | `unused_var=1` | Remove or export |
| SC2154 | warning | Variable is referenced but not assigned | `echo "$unset_var"` | Initialize or check |
| SC2053 | warning | Quote the right side of == in [[ ]] to prevent glob | `[[ $x == *.txt ]]` | `[[ $x == "*.txt" ]]` |
| SC2250 | warning | Prefer ${var} over $var for clarity in strings | `echo "$var_name"` | `echo "${var}_name"` |

## Conditional Rules

| SC Code | Severity | Message | Example | Fix |
|---------|----------|---------|---------|-----|
| SC2166 | warning | Use && / \|\| instead of -a / -o in [ ] | `[ -f a -a -f b ]` | `[ -f a ] && [ -f b ]` |
| SC2015 | info | Note that A && B \|\| C is not if-then-else | `cmd && ok \|\| fail` | Use if/then/else |
| SC2071 | error | > is for string comparison in [ ]; use -gt for numbers | `[ "$a" > "$b" ]` | `[ "$a" -gt "$b" ]` |
| SC2072 | error | Decimals not supported by -gt; use bc or awk | `[ 1.5 -gt 1 ]` | Use `bc` or `awk` |
| SC2236 | style | Use -n/-z instead of comparing to empty string | `[ "$var" != "" ]` | `[ -n "$var" ]` |
| SC2242 | error | -eq does not work with strings; use = | `[ "$str" -eq "abc" ]` | `[ "$str" = "abc" ]` |
| SC2268 | style | Avoid x-prefix comparisons; use proper quoting | `[ x"$var" = x ]` | `[ -z "$var" ]` |

## Command Rules

| SC Code | Severity | Message | Example | Fix |
|---------|----------|---------|---------|-----|
| SC2164 | warning | Use cd ... \|\| exit to handle errors | `cd /tmp` | `cd /tmp \|\| exit 1` |
| SC2091 | warning | Remove surrounding $() to avoid executing output | `$(echo cmd)` | Use command directly |
| SC2012 | info | Use find or glob instead of parsing ls | `ls \| while read` | `for f in *; do` |
| SC2002 | style | Useless use of cat | `cat file \| grep` | `grep pattern file` |
| SC2230 | info | which is not portable; use command -v | `which program` | `command -v program` |
| SC2162 | warning | read without -r mangles backslashes | `read var` | `read -r var` |
| SC2155 | warning | Declare and assign separately to preserve exit code | `local var=$(cmd)` | `local var; var=$(cmd)` |
| SC2129 | style | Consider using { cmd1; cmd2; } >> file | Multiple appends | Group with braces |
| SC2115 | error | Use "${var:?}" to ensure var is set before rm -rf | `rm -rf /$var` | `rm -rf "/${var:?}"` |
| SC2114 | error | rm -rf with variable paths is dangerous | `rm -rf $dir/` | Validate path first |

## Portability Rules

| SC Code | Severity | Message | Example | Fix |
|---------|----------|---------|---------|-----|
| SC3010 | info | [[ ]] is a bash/zsh extension | `[[ -f file ]]` | `[ -f file ]` |
| SC3017 | info | (( )) arithmetic is bash-only | `(( x++ ))` | `x=$((x + 1))` |
| SC3044 | info | declare is bash-specific | `declare -i x` | `x=0` |
| SC3043 | info | local is not POSIX | `local var=1` | Naming convention |
| SC1090 | info | source is a bash-ism | `source file.sh` | `. file.sh` |
| SC3053 | info | Indirect expansion ${!var} is bash-only | `${!name}` | `eval echo "\$$name"` |
| SC3001 | info | Process substitution is bash/zsh-only | `diff <(cmd1) <(cmd2)` | Use temp files |
| SC3009 | info | Brace expansion is bash-only | `{1..10}` | `seq 1 10` |
| SC2112 | style | function keyword is not POSIX | `function foo {` | `foo() {` |
| SC3028 | info | $RANDOM is bash-only | `echo $RANDOM` | Use /dev/urandom |
| SC3054 | info | Array syntax is bash-only | `arr=(a b c)` | Use positional params |

## Style Rules

| SC Code | Severity | Message | Example | Fix |
|---------|----------|---------|---------|-----|
| SC2239 | style | Use #!/usr/bin/env for portable shebangs | `#!/bin/bash` | `#!/usr/bin/env bash` |
| SC2148 | error | Missing shebang; add one to indicate dialect | (no shebang) | Add `#!/usr/bin/env bash` |
| SC2128 | warning | Expanding array without index gives first element | `echo "$arr"` | `echo "${arr[@]}"` |
| SC2199 | warning | Arrays with @ in [[ ]] do not work as expected | `[[ ${arr[@]} ]]` | Loop over array |
| SC2004 | style | $/ is unnecessary in $(( )) arithmetic | `echo $(($x + 1))` | `echo $((x + 1))` |
| SC2059 | warning | Do not use variables in printf format string | `printf $fmt` | `printf '%s' "$var"` |
| SC2069 | warning | Redirect stderr before stdout | `cmd 2>&1 >file` | `cmd >file 2>&1` |
| SC2145 | warning | echo "$array" only prints first element | `echo "$arr"` | `echo "${arr[*]}"` |
| SC2116 | style | Useless echo; use assignment directly | `var=$(echo text)` | `var=text` |
