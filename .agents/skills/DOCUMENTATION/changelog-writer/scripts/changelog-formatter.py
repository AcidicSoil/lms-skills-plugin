#!/usr/bin/env python3
"""Convert classified commits JSON to formatted changelog markdown.

Usage:
    python changelog-formatter.py --input <file.json> [--format keepachangelog|github|simple] [--version <ver>] [--date <date>]

Input: JSON from commit-classifier.py (stdin or --input file)
Output: Formatted markdown to stdout
"""

import argparse
import json
import sys
from datetime import date

KEEPACHANGELOG_SECTIONS = {
    "feat": "Added",
    "fix": "Fixed",
    "refactor": "Changed",
    "perf": "Changed",
    "docs": "Changed",
    "style": "Changed",
    "build": "Changed",
    "ci": "Changed",
    "chore": "Changed",
    "test": "Changed",
    "revert": "Removed",
}

SECTION_ORDER = ["Added", "Changed", "Deprecated", "Removed", "Fixed", "Security"]


def format_keepachangelog(commits, version=None, release_date=None):
    """Format commits as Keep a Changelog markdown."""
    sections = {}
    breaking = []

    for c in commits:
        section = KEEPACHANGELOG_SECTIONS.get(c["type"], "Changed")
        if c.get("breaking"):
            breaking.append(c)
        sections.setdefault(section, []).append(c)

    ver = version or "Unreleased"
    d = release_date or date.today().isoformat()
    header = f"## [{ver}] - {d}" if version else "## [Unreleased]"

    lines = [header, ""]

    if breaking:
        lines.append("### BREAKING CHANGES")
        lines.append("")
        for c in breaking:
            scope = f"**{c['scope']}**: " if c.get("scope") else ""
            lines.append(f"- {scope}{c['description']}")
        lines.append("")

    for section in SECTION_ORDER:
        entries = sections.get(section, [])
        non_breaking = [e for e in entries if not e.get("breaking")]
        if not non_breaking:
            continue
        lines.append(f"### {section}")
        lines.append("")
        for c in non_breaking:
            scope = f"**{c['scope']}**: " if c.get("scope") else ""
            lines.append(f"- {scope}{c['description']}")
        lines.append("")

    return "\n".join(lines)


def format_github(commits, version=None, release_date=None):
    """Format commits as GitHub Releases style."""
    ver = version or "Unreleased"
    lines = [f"# {ver}", ""]

    highlights = [c for c in commits if c["type"] == "feat"]
    fixes = [c for c in commits if c["type"] == "fix"]
    breaking = [c for c in commits if c.get("breaking")]
    other = [c for c in commits if c["type"] not in ("feat", "fix") and not c.get("breaking")]

    if breaking:
        lines.extend(["## Breaking Changes", ""])
        for c in breaking:
            lines.append(f"- {c['description']} (`{c['hash']}`)")
        lines.append("")

    if highlights:
        lines.extend(["## What's New", ""])
        for c in highlights:
            scope = f"**{c['scope']}**: " if c.get("scope") else ""
            lines.append(f"- {scope}{c['description']}")
        lines.append("")

    if fixes:
        lines.extend(["## Bug Fixes", ""])
        for c in fixes:
            scope = f"**{c['scope']}**: " if c.get("scope") else ""
            lines.append(f"- {scope}{c['description']}")
        lines.append("")

    if other:
        lines.extend(["## Other Changes", ""])
        for c in other:
            lines.append(f"- {c['description']}")
        lines.append("")

    # Contributors
    authors = sorted(set(c.get("author", "") for c in commits))
    if authors:
        lines.extend(["## Contributors", ""])
        for a in authors:
            lines.append(f"- {a}")
        lines.append("")

    return "\n".join(lines)


def format_simple(commits, version=None, release_date=None):
    """Format commits as a simple bullet list."""
    ver = version or "Unreleased"
    d = release_date or date.today().isoformat()
    lines = [f"# {ver} ({d})", ""]
    for c in commits:
        prefix = "**BREAKING** " if c.get("breaking") else ""
        lines.append(f"- {prefix}{c['description']}")
    lines.append("")
    return "\n".join(lines)


FORMATTERS = {
    "keepachangelog": format_keepachangelog,
    "github": format_github,
    "simple": format_simple,
}


def main():
    parser = argparse.ArgumentParser(description="Format classified commits as changelog")
    parser.add_argument("--input", help="Classified commits JSON file (default: stdin)")
    parser.add_argument("--format", choices=FORMATTERS.keys(), default="keepachangelog",
                        help="Output format (default: keepachangelog)")
    parser.add_argument("--version", help="Version string for the release")
    parser.add_argument("--date", help="Release date (YYYY-MM-DD)")
    args = parser.parse_args()

    if args.input:
        with open(args.input) as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)

    commits = data.get("commits", [])
    if not commits:
        print("No commits to format.", file=sys.stderr)
        sys.exit(0)

    formatter = FORMATTERS[args.format]
    output = formatter(commits, version=args.version, release_date=args.date)
    print(output)


if __name__ == "__main__":
    main()
