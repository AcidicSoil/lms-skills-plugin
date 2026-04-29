#!/usr/bin/env python3
"""Parse git log and classify commits by conventional type. Detect breaking changes.

Usage:
    python commit-classifier.py [--since TAG] [--until REF] [--path DIR] [--breaking-only]

Output (JSON to stdout):
    {
        "commits": [
            {
                "hash": "abc1234",
                "type": "feat",
                "scope": "api",
                "description": "add user endpoint",
                "breaking": false,
                "author": "Name <email>",
                "date": "2024-01-15"
            }
        ],
        "summary": {"feat": 3, "fix": 2, ...},
        "suggested_bump": "minor",
        "breaking_count": 0,
        "total": 5
    }
"""

import argparse
import json
import re
import subprocess
import sys
from collections import Counter

CONVENTIONAL_RE = re.compile(
    r"^(?P<type>feat|fix|refactor|perf|docs|chore|test|ci|build|style|revert)"
    r"(?:\((?P<scope>[^)]+)\))?"
    r"(?P<breaking>!)?"
    r":\s*(?P<description>.+)$",
    re.IGNORECASE,
)

BREAKING_FOOTER_RE = re.compile(r"^BREAKING[ -]CHANGE:\s*", re.MULTILINE)

HEURISTIC_KEYWORDS = {
    "feat": ["add", "implement", "introduce", "support", "enable", "create", "new"],
    "fix": ["fix", "resolve", "correct", "patch", "repair", "handle", "prevent"],
    "refactor": ["refactor", "restructure", "reorganize", "simplify", "clean", "extract"],
    "perf": ["optimize", "improve performance", "speed up", "cache", "reduce latency"],
    "docs": ["document", "readme", "comment", "jsdoc", "docstring", "changelog"],
    "chore": ["bump", "update dep", "upgrade", "maintain", "housekeeping"],
    "test": ["test", "spec", "coverage", "assert", "mock", "stub"],
    "ci": ["ci", "pipeline", "workflow", "github action", "deploy"],
    "build": ["build", "compile", "bundle", "webpack", "vite", "esbuild"],
    "style": ["format", "lint", "whitespace", "indent", "prettier"],
    "revert": ["revert"],
}


def run_git_log(since=None, until=None, path=None):
    """Run git log and return raw commit data."""
    cmd = [
        "git", "log", "--format=%H%x00%an <%ae>%x00%ai%x00%s%x00%b%x1e",
    ]
    if since:
        cmd.append(f"{since}..{until or 'HEAD'}")
    elif until:
        cmd.append(until)
    if path:
        cmd.extend(["--", path])

    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout


def classify_heuristic(subject):
    """Best-effort classification for non-conventional commits."""
    lower = subject.lower()
    for ctype, keywords in HEURISTIC_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return ctype
    return "chore"


def has_breaking_signals(subject, body):
    """Check for breaking change indicators beyond conventional commit syntax."""
    lower_subject = subject.lower()
    breaking_words = ["breaking", "incompatible", "removed", "renamed", "dropped"]
    if any(w in lower_subject for w in breaking_words):
        return True
    if BREAKING_FOOTER_RE.search(body):
        return True
    return False


def parse_commits(raw, breaking_only=False):
    """Parse raw git log output into classified commits."""
    commits = []
    entries = raw.split("\x1e")

    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue

        parts = entry.split("\x00")
        if len(parts) < 4:
            continue

        commit_hash = parts[0].strip()[:7]
        author = parts[1].strip()
        date = parts[2].strip()[:10]
        subject = parts[3].strip()
        body = parts[4].strip() if len(parts) > 4 else ""

        match = CONVENTIONAL_RE.match(subject)
        if match:
            ctype = match.group("type").lower()
            scope = match.group("scope") or ""
            breaking_mark = bool(match.group("breaking"))
            description = match.group("description").strip()
            is_conventional = True
        else:
            ctype = classify_heuristic(subject)
            scope = ""
            breaking_mark = False
            description = subject
            is_conventional = False

        is_breaking = breaking_mark or has_breaking_signals(subject, body)

        if breaking_only and not is_breaking:
            continue

        commits.append({
            "hash": commit_hash,
            "type": ctype,
            "scope": scope,
            "description": description,
            "breaking": is_breaking,
            "author": author,
            "date": date,
            "conventional": is_conventional,
        })

    return commits


def suggest_bump(commits):
    """Recommend semver bump based on commit types."""
    if not commits:
        return "none"
    if any(c["breaking"] for c in commits):
        return "major"
    if any(c["type"] == "feat" for c in commits):
        return "minor"
    return "patch"


def main():
    parser = argparse.ArgumentParser(description="Classify git commits by conventional type")
    parser.add_argument("--since", help="Start tag/ref (exclusive)")
    parser.add_argument("--until", help="End ref (inclusive, default HEAD)")
    parser.add_argument("--path", help="Limit to path")
    parser.add_argument("--breaking-only", action="store_true", help="Only output breaking changes")
    args = parser.parse_args()

    try:
        raw = run_git_log(since=args.since, until=args.until, path=args.path)
    except subprocess.CalledProcessError as e:
        print(json.dumps({"error": f"git log failed: {e.stderr}"}), file=sys.stderr)
        sys.exit(1)

    commits = parse_commits(raw, breaking_only=args.breaking_only)
    summary = dict(Counter(c["type"] for c in commits))

    output = {
        "commits": commits,
        "summary": summary,
        "suggested_bump": suggest_bump(commits),
        "breaking_count": sum(1 for c in commits if c["breaking"]),
        "total": len(commits),
    }

    json.dump(output, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
