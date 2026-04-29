#!/usr/bin/env python3
"""Static analysis of shell scripts. Maps patterns to ShellCheck rule IDs.

Output: JSON to stdout with schema:
{
  "shebang": str | null,
  "dialect": "bash" | "zsh" | "fish" | "sh" | "unknown",
  "issues": [{"line": int, "code": str, "severity": str, "message": str, "fix": str}],
  "posix_compatible": bool,
  "complexity_estimate": "low" | "medium" | "high"
}
"""

import argparse
import json
import re
import sys

# ShellCheck rule patterns: (regex, code, severity, message, fix)
RULES = [
    # Quoting
    (r'(?<!")\$\{?\w+\}?(?!")', "SC2086", "warning",
     "Double quote to prevent globbing and word splitting",
     "Wrap in double quotes: \"$var\""),
    (r'\$\((?!.*")', "SC2046", "warning",
     "Quote command substitution to prevent word splitting",
     "Wrap in double quotes: \"$(cmd)\""),
    (r'echo\s+\$\{?\w+', "SC2027", "warning",
     "Unquoted variable in echo",
     "Use: echo \"$var\""),

    # Conditionals
    (r'\[\s+.*\s+-a\s+', "SC2166", "warning",
     "Use && instead of -a in test commands",
     "Replace [ X -a Y ] with [ X ] && [ Y ]"),
    (r'\[\s+.*\s+-o\s+', "SC2166", "warning",
     "Use || instead of -o in test commands",
     "Replace [ X -o Y ] with [ X ] || [ Y ]"),
    (r'\[\s+.*==', "SC3014", "warning",
     "== in [ ] is not POSIX; use = for string comparison",
     "Use = instead of == inside [ ]"),

    # Common mistakes
    (r'^\s*cd\s+[^"&|;\n]+[^&|;\n]*$', "SC2164", "warning",
     "cd without error handling; use cd ... || exit",
     "Add: cd dir || exit 1"),
    (r'\beval\b', "SC2091", "warning",
     "eval can lead to code injection; avoid if possible",
     "Use alternatives like arrays or direct execution"),
    (r'ls\s+\|', "SC2012", "info",
     "Parsing ls output is fragile; use glob or find",
     "Replace with: for f in *.ext; do ..."),
    (r'cat\s+\S+\s*\|', "SC2002", "style",
     "Useless use of cat; pipe directly or use redirection",
     "Use: cmd < file  or  cmd file"),
    (r'\bwhich\b', "SC2230", "info",
     "which is not portable; use command -v or type",
     "Replace with: command -v program"),
    (r'read\s+(?!-r)', "SC2162", "warning",
     "read without -r will mangle backslashes",
     "Use: read -r var"),
    (r'\[\s*-[ef]\s+[^"]*\$', "SC2250", "warning",
     "Unquoted variable in test; may break with spaces in path",
     "Quote the variable: [ -f \"$file\" ]"),

    # Bash-isms (for POSIX check)
    (r'\[\[', "SC3010", "info",
     "[[ is a bash/zsh extension, not POSIX",
     "Use [ ] for POSIX compatibility"),
    (r'\(\(', "SC3017", "info",
     "(( )) arithmetic is a bash extension, not POSIX",
     "Use $(( )) or expr for POSIX arithmetic"),
    (r'\bdeclare\b', "SC3044", "info",
     "declare is a bash extension; not POSIX",
     "Use simple assignment or typeset for portability"),
    (r'\blocal\b', "SC3043", "info",
     "local is not POSIX (widely supported but not guaranteed)",
     "Move to function scope or use a naming convention"),
    (r'\bsource\b', "SC1090", "info",
     "source is a bash-ism; POSIX uses . (dot)",
     "Replace source with: . ./file.sh"),
    (r'\bfunction\s+\w+', "SC2112", "style",
     "function keyword is not POSIX; use name() syntax",
     "Replace function name { with name() {"),
    (r'\$\{!\w+', "SC3053", "info",
     "Indirect expansion ${!var} is a bash extension",
     "Use eval for POSIX indirect expansion"),
    (r'<\(|>\(', "SC3001", "info",
     "Process substitution is a bash/zsh extension",
     "Use temporary files or pipes for POSIX"),
    (r'\{[a-z0-9]+\.\.[a-z0-9]+\}', "SC3009", "info",
     "Brace expansion is a bash extension",
     "Use seq or a loop for POSIX"),

    # Error handling
    (r'^\s*rm\s+-rf\s', "SC2114", "error",
     "rm -rf with variable paths is dangerous",
     "Validate paths before rm -rf; use quotes and checks"),
    (r'^\s*#!/bin/bash', "SC2239", "style",
     "Use #!/usr/bin/env bash for portability",
     "Replace with: #!/usr/bin/env bash"),
]

BASHISMS = {"SC3010", "SC3017", "SC3044", "SC3043", "SC1090", "SC2112",
            "SC3053", "SC3001", "SC3009"}


def detect_dialect(content: str) -> str:
    """Detect shell dialect from shebang or content patterns."""
    first_line = content.split("\n", 1)[0].strip()
    if "fish" in first_line:
        return "fish"
    if "zsh" in first_line:
        return "zsh"
    if "bash" in first_line:
        return "bash"
    if first_line.startswith("#!") and "sh" in first_line:
        return "sh"
    # Heuristic: check for bash-isms
    if re.search(r'\[\[|\(\(|declare\b|local\b', content):
        return "bash"
    return "sh"


def get_shebang(content: str) -> str | None:
    """Extract shebang line."""
    first_line = content.split("\n", 1)[0].strip()
    if first_line.startswith("#!"):
        return first_line
    return None


def estimate_complexity(content: str) -> str:
    """Estimate script complexity."""
    lines = [l for l in content.split("\n") if l.strip() and not l.strip().startswith("#")]
    loc = len(lines)
    functions = len(re.findall(r'^\s*(?:function\s+)?\w+\s*\(\)', content, re.MULTILINE))
    nested = max(0, content.count("if") + content.count("for") + content.count("while") +
                 content.count("case") - 3)
    score = loc // 20 + functions * 2 + nested
    if score <= 3:
        return "low"
    if score <= 8:
        return "medium"
    return "high"


def analyze(content: str, posix_only: bool = False) -> dict:
    """Analyze shell script content."""
    shebang = get_shebang(content)
    dialect = detect_dialect(content)
    issues = []
    seen = set()

    heredoc_end = None
    for line_num, line in enumerate(content.split("\n"), start=1):
        stripped = line.strip()
        if heredoc_end:
            if stripped == heredoc_end:
                heredoc_end = None
            continue
        # Check for heredoc start
        heredoc_match = re.search(r"<<-?\s*['\"]?(\w+)['\"]?", line)
        if heredoc_match:
            heredoc_end = heredoc_match.group(1)
        if not stripped or stripped.startswith("#"):
            continue
        for pattern, code, severity, message, fix in RULES:
            if posix_only and code not in BASHISMS:
                continue
            if re.search(pattern, stripped):
                # SC2086: skip matches inside arithmetic context $(( ))
                if code == "SC2086" and "$((" in line and "))" in line:
                    continue
                key = (code, line_num)
                if key not in seen:
                    seen.add(key)
                    issues.append({
                        "line": line_num,
                        "code": code,
                        "severity": severity,
                        "message": message,
                        "fix": fix,
                    })

    # Sort by severity
    severity_order = {"error": 0, "warning": 1, "info": 2, "style": 3}
    issues.sort(key=lambda i: (severity_order.get(i["severity"], 9), i["line"]))

    posix_codes = {i["code"] for i in issues} & BASHISMS
    posix_compatible = len(posix_codes) == 0

    return {
        "shebang": shebang,
        "dialect": dialect,
        "issues": issues,
        "posix_compatible": posix_compatible,
        "complexity_estimate": estimate_complexity(content),
    }


def main():
    parser = argparse.ArgumentParser(description="Static analysis of shell scripts")
    parser.add_argument("file", nargs="?", help="Shell script file to analyze")
    parser.add_argument("--stdin", action="store_true", help="Read from stdin")
    parser.add_argument("--posix", action="store_true", help="Check POSIX compliance only")
    args = parser.parse_args()

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

    result = analyze(content, posix_only=args.posix)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
