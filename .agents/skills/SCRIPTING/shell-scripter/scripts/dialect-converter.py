#!/usr/bin/env python3
"""Convert shell syntax between bash, zsh, and fish.

Output: JSON to stdout with schema:
{
  "converted_script": str,
  "changes": [{"line": int, "original": str, "converted": str, "reason": str}],
  "warnings": [str]
}
"""

import argparse
import json
import re
import sys

# Conversion rules: (source_dialect, target_dialect, pattern, replacement, reason)
CONVERSIONS = [
    # bash -> zsh (mostly compatible, minor differences)
    ("bash", "zsh", r'#!/usr/bin/env bash', '#!/usr/bin/env zsh',
     "Update shebang to target dialect"),
    ("bash", "zsh", r'#!/bin/bash', '#!/usr/bin/env zsh',
     "Update shebang to target dialect"),

    # bash -> fish
    ("bash", "fish", r'#!/usr/bin/env bash', '#!/usr/bin/env fish',
     "Update shebang to target dialect"),
    ("bash", "fish", r'#!/bin/bash', '#!/usr/bin/env fish',
     "Update shebang to target dialect"),
    ("bash", "fish", r'^set -euo pipefail$', '# fish has built-in error handling',
     "fish does not use set -e; errors propagate naturally"),
    ("bash", "fish", r'\bexport\s+(\w+)=(.*)', r'set -gx \1 \2',
     "fish uses set -gx instead of export"),
    ("bash", "fish", r'\$\{(\w+):-([^}]*)\}', r'set -q \1; or set \1 \2',
     "fish uses set -q for default values"),
    ("bash", "fish", r'\bif\s+\[\s+(.*?)\s+\];\s*then', r'if test \1',
     "fish uses if test ... instead of if [ ... ]; then"),
    ("bash", "fish", r'^\s*fi$', 'end',
     "fish uses end instead of fi"),
    ("bash", "fish", r'^\s*done$', 'end',
     "fish uses end instead of done"),
    ("bash", "fish", r'for\s+(\w+)\s+in\s+(.*?);\s*do', r'for \1 in \2',
     "fish for loops do not need do/done"),
    ("bash", "fish", r'\$\((.+?)\)', r'(\1)',
     "fish uses (cmd) instead of $(cmd)"),
    ("bash", "fish", r'\bfunction\s+(\w+)\s*\(\)\s*\{', r'function \1',
     "fish function syntax differs from bash"),
    ("bash", "fish", r'^(\w+)\s*\(\)\s*\{', r'function \1',
     "fish uses function keyword"),
    ("bash", "fish", r'^\s*\}$', 'end',
     "fish uses end instead of }"),
    ("bash", "fish", r'\becho\s+(-[ne]\s+)?"\$\{(\w+)\[@\]\}"',
     r'echo $\2',
     "fish arrays are simpler"),
    ("bash", "fish", r'\[\[\s+(.*?)\s+\]\]', r'test \1',
     "fish uses test or builtin test"),

    # fish -> bash
    ("fish", "bash", r'#!/usr/bin/env fish', '#!/usr/bin/env bash',
     "Update shebang to target dialect"),
    ("fish", "bash", r'set -gx\s+(\w+)\s+(.*)', r'export \1=\2',
     "bash uses export instead of set -gx"),
    ("fish", "bash", r'set\s+(\w+)\s+(.*)', r'\1=\2',
     "bash uses var=value instead of set var value"),
    ("fish", "bash", r'if test\s+(.*)', r'if [ \1 ]; then',
     "bash uses [ ] with then"),
    ("fish", "bash", r'^\s*end$', '}',
     "bash uses } or fi/done instead of end"),
    ("fish", "bash", r'\(([^)]+)\)', r'$(\1)',
     "bash uses $(cmd) for command substitution"),
    ("fish", "bash", r'function\s+(\w+)$', r'\1() {',
     "bash function syntax"),

    # zsh -> bash
    ("zsh", "bash", r'#!/usr/bin/env zsh', '#!/usr/bin/env bash',
     "Update shebang to target dialect"),
    ("zsh", "bash", r'#!/bin/zsh', '#!/usr/bin/env bash',
     "Update shebang to target dialect"),
    ("zsh", "bash", r'\bsetopt\b.*', '# setopt removed (zsh-specific)',
     "setopt is zsh-specific"),
    ("zsh", "bash", r'\bunsetopt\b.*', '# unsetopt removed (zsh-specific)',
     "unsetopt is zsh-specific"),
    ("zsh", "bash", r'\bautoload\b.*', '# autoload removed (zsh-specific)',
     "autoload is zsh-specific"),

    # bash -> zsh additional
    ("bash", "zsh", r'\bdeclare\s+-a\s+', 'typeset -a ',
     "zsh prefers typeset over declare"),
    ("bash", "zsh", r'\bdeclare\s+-A\s+', 'typeset -A ',
     "zsh prefers typeset over declare"),
]

# Constructs with no direct equivalent
WARNINGS = {
    ("bash", "fish"): [
        "bash arrays (indexed) must be manually converted to fish lists",
        "bash associative arrays have no fish equivalent",
        "bash here-strings (<<<) have no fish equivalent; use echo | or string",
        "bash process substitution <() >() has no fish equivalent; use psub or temp files",
    ],
    ("fish", "bash"): [
        "fish abbreviations (abbr) have no bash equivalent; convert to aliases",
        "fish universal variables (set -U) have no bash equivalent",
        "fish event handlers (--on-event) must be manually converted",
    ],
    ("bash", "zsh"): [
        "zsh arrays are 1-indexed by default (bash is 0-indexed)",
        "zsh word splitting differs; unquoted $var does not split by default",
    ],
    ("zsh", "bash"): [
        "zsh glob qualifiers (e.g., *(.) for files) have no bash equivalent",
        "zsh associative array syntax differs slightly",
    ],
}

DIALECTS = {"bash", "zsh", "fish", "sh"}
FEATURES = {
    "bash": ["arrays", "associative arrays", "process substitution", "[[ ]]",
             "(( ))", "here-strings", "brace expansion", "local", "declare"],
    "zsh": ["arrays (1-indexed)", "associative arrays", "process substitution",
            "[[ ]]", "(( ))", "glob qualifiers", "autoload", "setopt", "typeset"],
    "fish": ["lists (no arrays)", "set -gx", "test builtin", "string builtin",
             "abbr", "universal variables", "event handlers", "math builtin"],
    "sh": ["POSIX builtins only", "[ ] test", "$(()) arithmetic",
            ". (dot) source", "no arrays", "no local (non-standard)"],
}


def detect_dialect(content: str) -> str:
    """Detect shell dialect from shebang."""
    first_line = content.split("\n", 1)[0].strip()
    for dialect in ["fish", "zsh", "bash"]:
        if dialect in first_line:
            return dialect
    if first_line.startswith("#!") and "sh" in first_line:
        return "sh"
    return "bash"


def convert(content: str, from_dialect: str, to_dialect: str) -> dict:
    """Convert shell script from one dialect to another."""
    lines = content.split("\n")
    changes = []
    converted_lines = []

    for line_num, line in enumerate(lines, start=1):
        original = line
        modified = False
        reasons = []

        for src, tgt, pattern, replacement, rule_reason in CONVERSIONS:
            if src == from_dialect and tgt == to_dialect:
                new_line = re.sub(pattern, replacement, line)
                if new_line != line:
                    line = new_line
                    modified = True
                    reasons.append(rule_reason)

        converted_lines.append(line)
        if modified:
            changes.append({
                "line": line_num,
                "original": original.strip(),
                "converted": line.strip(),
                "reasons": reasons,
            })

    warnings = WARNINGS.get((from_dialect, to_dialect), [])

    return {
        "converted_script": "\n".join(converted_lines),
        "changes": changes,
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description="Convert shell syntax between dialects")
    parser.add_argument("file", nargs="?", help="Shell script file to convert")
    parser.add_argument("--from", dest="from_dialect", help="Source dialect")
    parser.add_argument("--to", dest="to_dialect", required=False, help="Target dialect")
    parser.add_argument("--list-features", metavar="DIALECT",
                        help="List features for a dialect")
    parser.add_argument("--stdin", action="store_true", help="Read from stdin")
    args = parser.parse_args()

    if args.list_features:
        dialect = args.list_features.lower()
        if dialect not in FEATURES:
            print(json.dumps({"error": f"Unknown dialect: {dialect}"}), file=sys.stderr)
            sys.exit(1)
        print(json.dumps({"dialect": dialect, "features": FEATURES[dialect]}, indent=2))
        return

    if args.stdin or (args.file is None and not sys.stdin.isatty()):
        content = sys.stdin.read()
    elif args.file:
        try:
            with open(args.file) as f:
                content = f.read()
        except FileNotFoundError:
            print(json.dumps({"error": f"File not found: {args.file}"}), file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help(sys.stderr)
        sys.exit(2)

    from_dialect = (args.from_dialect or detect_dialect(content)).lower()
    to_dialect = (args.to_dialect or "bash").lower()

    if from_dialect not in DIALECTS:
        print(json.dumps({"error": f"Unknown source dialect: {from_dialect}"}), file=sys.stderr)
        sys.exit(1)
    if to_dialect not in DIALECTS:
        print(json.dumps({"error": f"Unknown target dialect: {to_dialect}"}), file=sys.stderr)
        sys.exit(1)
    if from_dialect == to_dialect:
        print(json.dumps({"error": "Source and target dialects are the same"}), file=sys.stderr)
        sys.exit(1)

    result = convert(content, from_dialect, to_dialect)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
