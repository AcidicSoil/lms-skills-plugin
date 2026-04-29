import os

#!/usr/bin/env python3
"""Manage false-positive dismissals for the honest-review learning loop.

Stores learnings in ~/.claude/honest-reviews/learnings/{project-slug}.json.
Supports add, check, list, and clear subcommands. All output is JSON to stdout.

Usage:
  python learnings-store.py add --project my-app --finding-id HR-S-005 \
      --pattern "missing null check on Optional.get()" --reason "Handled by upstream validation"
  cat findings.json | python learnings-store.py check --project my-app
  cat findings.json | python learnings-store.py check --project my-app --dry-run
  python learnings-store.py list --project my-app
  python learnings-store.py clear --project my-app
"""
from __future__ import annotations

import argparse
import contextlib
import json
import re
import sys
from datetime import date
from pathlib import Path


def get_agent_dir(skill_name: str) -> Path:
    """Get the base directory for a skill based on the active agent."""
    agent = os.environ.get("AGENT_NAME", "").lower()
    for cli, folder in [("GEMINI_CLI", ".gemini"), ("COPILOT_CLI", ".copilot"), ("CODEX_CLI", ".codex")]:
        if os.environ.get(cli) == "1" or folder.strip(".") in agent:
            return Path.home() / folder / skill_name
    return Path.home() / ".claude" / skill_name

from typing import Any

LEARNINGS_DIR = get_agent_dir("honest-reviews") / "learnings"


def slugify(name: str) -> str:
    """Convert a project name to a filesystem-safe slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-") or "unnamed"


def learnings_path(project: str) -> Path:
    """Return the JSON file path for a project's learnings."""
    return LEARNINGS_DIR / f"{slugify(project)}.json"


def load_learnings(project: str) -> list[dict[str, Any]]:
    """Load learnings from disk. Returns empty list if file is missing."""
    path = learnings_path(project)
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return []
    except json.JSONDecodeError as e:
        print(f"error: corrupt learnings file: {e}", file=sys.stderr)
        sys.exit(1)


def save_learnings(project: str, learnings: list[dict[str, Any]]) -> None:
    """Persist learnings to disk, creating directories as needed."""
    LEARNINGS_DIR.mkdir(parents=True, exist_ok=True)
    path = learnings_path(project)
    path.write_text(json.dumps(learnings, indent=2) + "\n")


def next_learning_id(learnings: list[dict[str, Any]]) -> str:
    """Generate the next L-NNN identifier."""
    max_num = 0
    for entry in learnings:
        m = re.match(r"^L-(\d+)$", entry.get("id", ""))
        if m:
            max_num = max(max_num, int(m.group(1)))
    return f"L-{max_num + 1:03d}"


def extract_keywords(text: str) -> set[str]:
    """Extract words with 4+ characters as keyword set (lowercased)."""
    return {w.lower() for w in re.findall(r"[A-Za-z]+", text) if len(w) >= 4}


def finding_id_prefix(fid: str) -> str:
    """Extract the prefix from a finding ID (e.g., 'HR-S-' from 'HR-S-005')."""
    m = re.match(r"^(HR-[A-Z]+-)", fid)
    return m.group(1) if m else ""


def matches_learning(finding: dict[str, Any], learning: dict[str, Any]) -> bool:
    """Check whether a finding matches a stored learning.

    Requires a file path match AND at least one content match.
    """
    # --- File path check ---
    f_path = finding.get("location", "").split(":")[0] if finding.get("location") else ""
    f_file_path = finding.get("file_path", "")
    finding_file = f_path or f_file_path
    learning_file = learning.get("file_path", "")

    if not finding_file or not learning_file:
        return False

    finding_p = Path(finding_file)
    learning_p = Path(learning_file)

    # Exact match or same parent directory
    if finding_p != learning_p and finding_p.parent != learning_p.parent:
        return False

    # --- Content match (at least one must be true) ---

    # 1. Same finding ID prefix
    f_id = finding.get("id", "")
    l_fid = learning.get("finding_id", "")
    if f_id and l_fid:
        f_prefix = finding_id_prefix(f_id)
        l_prefix = finding_id_prefix(l_fid)
        if f_prefix and l_prefix and f_prefix == l_prefix:
            return True

    # 2. Same category
    f_cat = (finding.get("category") or "").lower()
    l_cat = (learning.get("category") or "").lower()
    if f_cat and l_cat and f_cat == l_cat:
        return True

    # 3. Keyword intersection >= 2
    f_desc = finding.get("description", "")
    l_pattern = learning.get("pattern", "")
    if f_desc and l_pattern:
        overlap = extract_keywords(f_desc) & extract_keywords(l_pattern)
        if len(overlap) >= 2:
            return True

    return False


# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------


def cmd_add(args: argparse.Namespace) -> None:
    """Store a false-positive dismissal."""
    learnings = load_learnings(args.project)
    learning_id = next_learning_id(learnings)

    learning: dict[str, Any] = {
        "id": learning_id,
        "finding_id": args.finding_id,
        "pattern": args.pattern,
        "reason": args.reason,
        "file_path": args.file_path or "",
        "category": args.category or "",
        "date": date.today().isoformat(),
        "match_count": 0,
    }

    learnings.append(learning)
    save_learnings(args.project, learnings)

    json.dump({"added": learning}, sys.stdout, indent=2)
    print()


def cmd_check(args: argparse.Namespace) -> None:
    """Check findings against stored learnings, adjust confidence."""
    raw = sys.stdin.read()
    try:
        findings = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"error: invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(findings, list):
        print("error: input must be a JSON array of findings", file=sys.stderr)
        sys.exit(1)

    learnings = load_learnings(args.project)
    modified = False

    for finding in findings:
        for learning in learnings:
            if matches_learning(finding, learning):
                conf = finding.get("confidence")
                if isinstance(conf, (int, float)):
                    finding["confidence"] = max(0.0, round(conf - 0.3, 4))
                finding["suppressed_by"] = learning["id"]
                learning["match_count"] = learning.get("match_count", 0) + 1
                modified = True
                break  # One match per finding

    if modified and not args.dry_run:
        save_learnings(args.project, learnings)

    json.dump(findings, sys.stdout, indent=2)
    print()


def cmd_list(args: argparse.Namespace) -> None:
    """List stored learnings for a project."""
    learnings = load_learnings(args.project)
    json.dump(learnings, sys.stdout, indent=2)
    print()


def cmd_clear(args: argparse.Namespace) -> None:
    """Clear all learnings for a project."""
    path = learnings_path(args.project)
    with contextlib.suppress(FileNotFoundError):
        path.unlink()
    json.dump({"cleared": slugify(args.project)}, sys.stdout, indent=2)
    print()


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Manage false-positive dismissals for honest-review.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = ap.add_subparsers(dest="command", required=True)

    # add
    sp_add = sub.add_parser("add", help="Store a false-positive dismissal.")
    sp_add.add_argument("--project", required=True, help="Project slug.")
    sp_add.add_argument("--finding-id", required=True, help="Finding ID (e.g., HR-S-005).")
    sp_add.add_argument("--pattern", required=True, help="Description of the false positive.")
    sp_add.add_argument("--reason", required=True, help="Why it was dismissed.")
    sp_add.add_argument("--file-path", default=None, help="File path the finding was about.")
    sp_add.add_argument("--category", default=None, help="OWASP/severity category.")

    # check
    sp_check = sub.add_parser("check", help="Check findings against stored learnings.")
    sp_check.add_argument("--project", required=True, help="Project slug.")
    sp_check.add_argument("--dry-run", action="store_true", help="Preview without persisting match counts.")

    # list
    sp_list = sub.add_parser("list", help="List stored learnings for a project.")
    sp_list.add_argument("--project", required=True, help="Project slug.")

    # clear
    sp_clear = sub.add_parser("clear", help="Clear all learnings for a project.")
    sp_clear.add_argument("--project", required=True, help="Project slug.")

    args = ap.parse_args()

    if args.command == "add":
        cmd_add(args)
    elif args.command == "check":
        cmd_check(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "clear":
        cmd_clear(args)


if __name__ == "__main__":
    main()
