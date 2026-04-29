import os

#!/usr/bin/env python3
"""Persist and compare honest-review results across sessions.

Stores review JSON in ~/.claude/honest-reviews/ with date-project-mode naming.
Supports save, load, list, and diff subcommands. All output is JSON to stdout.

Usage:
  cat findings.json | python review-store.py save --project my-app --mode session --commit abc1234
  python review-store.py load --project my-app
  python review-store.py load --project my-app --date 2026-02-22
  python review-store.py list
  python review-store.py list --project my-app --limit 5
  python review-store.py diff --project my-app --old previous --new latest
  python review-store.py diff --project my-app --old 2026-02-20 --new 2026-02-22
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
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

STATE_DIR = get_agent_dir("honest-reviews")

# Finding ID pattern: HR-S-001 or HR-A-015
FINDING_ID_RE = re.compile(r"^HR-[SA]-\d{3}$")


def slugify(name: str) -> str:
    """Convert a project name to a filesystem-safe slug.

    Lowercase, replace non-alphanumeric runs with hyphens, strip leading/trailing hyphens.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower())
    return slug.strip("-") or "unnamed"


def ensure_state_dir() -> Path:
    """Create state directory if it does not exist, return the path."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return STATE_DIR


def review_filename(review_date: str, project: str, mode: str) -> str:
    """Build the canonical filename for a review."""
    return f"{review_date}-{slugify(project)}-{mode}.json"


def compute_statistics(findings: list[dict[str, Any]], *, schema_version: int = 1) -> dict[str, Any]:
    """Derive statistics block from a findings array."""
    severity_counter: Counter[str] = Counter()
    level_counter: Counter[str] = Counter()
    discarded = 0
    reported = 0
    strengths = 0
    with_reasoning = 0

    for f in findings:
        priority = f.get("priority", "")
        level = f.get("level", "")
        confidence = f.get("confidence")

        # Strengths are findings whose priority starts with S
        if priority.startswith("S"):
            strengths += 1

        # Track reasoning chain presence (v5.0 adoption metric)
        if f.get("reasoning"):
            with_reasoning += 1

        # Confidence-based classification
        # P0/S0 still reported as unconfirmed, but others below 0.3 are discarded
        if isinstance(confidence, (int, float)) and confidence < 0.3 and priority not in ("P0", "S0"):
            discarded += 1
            continue

        reported += 1
        if priority.startswith("P"):
            severity_counter[priority] += 1
        if level:
            level_counter[level.lower()] += 1

    return {
        "schema_version": schema_version,
        "total": len(findings),
        "reported": reported,
        "discarded": discarded,
        "strengths": strengths,
        "with_reasoning": with_reasoning,
        "total_findings": len(findings),
        "by_severity": {
            "P0": severity_counter.get("P0", 0),
            "P1": severity_counter.get("P1", 0),
            "P2": severity_counter.get("P2", 0),
            "P3": severity_counter.get("P3", 0),
        },
        "by_level": {
            "correctness": level_counter.get("correctness", 0),
            "design": level_counter.get("design", 0),
            "efficiency": level_counter.get("efficiency", 0),
        },
    }


REVIEW_FILENAME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-(.+)-(session|audit)\.json$")


def list_reviews_for_project(project: str | None) -> list[Path]:
    """Return review files matching a project slug, sorted newest first."""
    state = ensure_state_dir()
    files = sorted(state.glob("*.json"), reverse=True)
    if project:
        slug = slugify(project)
        filtered = []
        for f in files:
            m = REVIEW_FILENAME_RE.match(f.name)
            if m and m.group(1) == slug:
                filtered.append(f)
        files = filtered
    return files


def parse_review_meta(path: Path) -> dict[str, Any]:
    """Extract lightweight metadata from a review file without loading findings."""
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {"file": path.name, "error": "unreadable"}
    return {
        "file": path.name,
        "date": data.get("date", ""),
        "project": data.get("project", ""),
        "mode": data.get("mode", ""),
        "commit": data.get("commit", ""),
        "scope": data.get("scope", ""),
        "total_findings": data.get("statistics", {}).get("total", 0),
        "reported": data.get("statistics", {}).get("reported", 0),
    }


def resolve_review_path(project: str, date_spec: str | None) -> Path | None:
    """Find a review file by project and optional date.

    date_spec can be a YYYY-MM-DD string, "latest", "previous", or None (defaults to latest).
    """
    candidates = list_reviews_for_project(project)
    if not candidates:
        return None

    if date_spec is None or date_spec == "latest":
        return candidates[0]

    if date_spec == "previous":
        return candidates[1] if len(candidates) >= 2 else None

    # Exact date match — require full YYYY-MM-DD format
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_spec):
        return None
    for c in candidates:
        if c.name.startswith(date_spec + "-"):
            return c
    return None


def _finding_key(f: dict[str, Any]) -> str:
    """Build a stable identity key for a finding.

    Prefer the finding ID (HR-S-001). Fall back to file+line proximity.
    """
    fid = f.get("id", "")
    if fid and FINDING_ID_RE.match(fid):
        # Strip mode prefix to allow cross-mode matching: HR-S-001 -> 001
        return fid
    # Fallback: location + category
    loc = f.get("location", "")
    cat = f.get("category", "")
    return f"{loc}|{cat}"


def _location_proximity(loc_a: str, loc_b: str) -> bool:
    """Check whether two location strings refer to nearby code.

    Matches if same file and lines are within 10 lines of each other.
    """
    if not loc_a or not loc_b:
        return False
    # Parse "file:line" format
    parts_a = loc_a.split(":")
    parts_b = loc_b.split(":")
    if parts_a[0] != parts_b[0]:
        return False
    if len(parts_a) < 2 or len(parts_b) < 2:
        # Same file but no line numbers — treat as same location
        return True
    try:
        line_a = int(parts_a[1])
        line_b = int(parts_b[1])
        return abs(line_a - line_b) <= 10
    except ValueError:
        return parts_a[1] == parts_b[1]


def diff_findings(
    old_findings: list[dict[str, Any]],
    new_findings: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    """Compare two sets of findings and classify each as new, resolved, or recurring.

    Matching strategy:
    1. Match by finding ID (HR-S-NNN / HR-A-NNN) — exact match on the numeric suffix.
    2. Fall back to file+line proximity (same file, within 10 lines).
    """
    old_by_key: dict[str, dict[str, Any]] = {}
    for f in old_findings:
        old_by_key[_finding_key(f)] = f

    matched_old_keys: set[str] = set()
    recurring: list[dict[str, Any]] = []
    new: list[dict[str, Any]] = []

    for f in new_findings:
        key = _finding_key(f)
        matched = False

        # Strategy 1: exact key match
        if key in old_by_key:
            recurring.append(f)
            matched_old_keys.add(key)
            matched = True
        else:
            # Strategy 2: location proximity fallback
            new_loc = f.get("location", "")
            for old_key, old_f in old_by_key.items():
                if old_key in matched_old_keys:
                    continue
                old_loc = old_f.get("location", "")
                if _location_proximity(new_loc, old_loc):
                    recurring.append(f)
                    matched_old_keys.add(old_key)
                    matched = True
                    break

        if not matched:
            new.append(f)

    # Resolved = old findings not matched by any new finding
    resolved = [f for k, f in old_by_key.items() if k not in matched_old_keys]

    return {"new": new, "resolved": resolved, "recurring": recurring}


# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------


def cmd_save(args: argparse.Namespace) -> None:
    """Save review findings to the state directory."""
    # Read findings from file or stdin
    if args.input == "-" or args.input is None:
        if args.input is None and sys.stdin.isatty():
            print("error: no input provided. Pipe JSON to stdin or use --input <file>", file=sys.stderr)
            sys.exit(1)
        raw = sys.stdin.read()
    else:
        p = Path(args.input)
        if not p.exists():
            print(json.dumps({"error": f"input file not found: {args.input}"}))
            sys.exit(1)
        raw = p.read_text()

    try:
        findings = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"invalid JSON input: {e}"}))
        sys.exit(1)

    if not isinstance(findings, list):
        print(json.dumps({"error": "input must be a JSON array of findings"}))
        sys.exit(1)

    today = args.date or date.today().isoformat()
    project_slug = slugify(args.project)

    review = {
        "schema": 2,
        "date": today,
        "project": project_slug,
        "mode": args.mode,
        "commit": args.commit or "",
        "scope": args.scope or "",
        "findings": findings,
        "statistics": compute_statistics(findings, schema_version=2),
    }

    state = ensure_state_dir()
    filename = review_filename(today, project_slug, args.mode)
    filepath = state / filename
    filepath.write_text(json.dumps(review, indent=2) + "\n")

    json.dump({"saved": str(filepath)}, sys.stdout, indent=2)
    print()


def cmd_load(args: argparse.Namespace) -> None:
    """Load a review by project and optional date."""
    path = resolve_review_path(args.project, args.date)
    if path is None:
        json.dump({"error": f"no review found for project '{args.project}'"}, sys.stdout, indent=2)
        print()
        sys.exit(1)

    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        json.dump({"error": f"failed to read {path.name}: {e}"}, sys.stdout, indent=2)
        print()
        sys.exit(1)

    # Backward compatibility: handle v4.0 reviews (no schema field or schema 1)
    if data.get("schema") is None or data.get("schema") == 1:
        data.setdefault("schema", 1)
        for finding in data.get("findings", []):
            finding.setdefault("reasoning", None)

    json.dump(data, sys.stdout, indent=2)
    print()


def cmd_list(args: argparse.Namespace) -> None:
    """List saved reviews with optional project filter."""
    candidates = list_reviews_for_project(args.project)
    limited = candidates[: args.limit]
    result = [parse_review_meta(p) for p in limited]
    json.dump(result, sys.stdout, indent=2)
    print()


def cmd_diff(args: argparse.Namespace) -> None:
    """Compare two reviews and classify findings as new, resolved, or recurring."""
    old_path = resolve_review_path(args.project, args.old)
    new_path = resolve_review_path(args.project, args.new)

    if old_path is None:
        json.dump({"error": f"old review not found (spec: '{args.old}')"}, sys.stdout, indent=2)
        print()
        sys.exit(1)
    if new_path is None:
        json.dump({"error": f"new review not found (spec: '{args.new}')"}, sys.stdout, indent=2)
        print()
        sys.exit(1)

    try:
        old_data = json.loads(old_path.read_text())
        new_data = json.loads(new_path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        json.dump({"error": f"failed to read review files: {e}"}, sys.stdout, indent=2)
        print()
        sys.exit(1)

    old_findings = old_data.get("findings", [])
    new_findings = new_data.get("findings", [])

    result = diff_findings(old_findings, new_findings)
    result["old_file"] = old_path.name
    result["new_file"] = new_path.name
    result["old_date"] = old_data.get("date", "")
    result["new_date"] = new_data.get("date", "")
    result["summary"] = {
        "new_count": len(result["new"]),
        "resolved_count": len(result["resolved"]),
        "recurring_count": len(result["recurring"]),
    }

    json.dump(result, sys.stdout, indent=2)
    print()


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Persist and compare honest-review results.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = ap.add_subparsers(dest="command", required=True)

    # save
    sp_save = sub.add_parser("save", help="Save review findings to state directory.")
    sp_save.add_argument("--project", required=True, help="Project name (will be slugified).")
    sp_save.add_argument("--mode", choices=["session", "audit"], default="session", help="Review mode.")
    sp_save.add_argument("--commit", default="", help="Git commit hash.")
    sp_save.add_argument("--scope", default="", help="Review scope (path or description).")
    sp_save.add_argument("--input", default=None, help="JSON file with findings array, or '-' for stdin.")
    sp_save.add_argument("--date", default=None, help="Override date (YYYY-MM-DD). Defaults to today.")

    # load
    sp_load = sub.add_parser("load", help="Load a specific review.")
    sp_load.add_argument("--project", required=True, help="Project name.")
    sp_load.add_argument("--date", default=None, help="Date (YYYY-MM-DD), 'latest', or 'previous'. Defaults to latest.")

    # list
    sp_list = sub.add_parser("list", help="List saved reviews.")
    sp_list.add_argument("--project", default=None, help="Filter by project name.")
    sp_list.add_argument("--limit", type=int, default=10, help="Max results (default: 10).")

    # diff
    sp_diff = sub.add_parser("diff", help="Compare two reviews.")
    sp_diff.add_argument("--project", required=True, help="Project name.")
    sp_diff.add_argument("--old", default="previous", help="Old review: date (YYYY-MM-DD) or 'previous'.")
    sp_diff.add_argument("--new", default="latest", help="New review: date (YYYY-MM-DD) or 'latest'.")

    args = ap.parse_args()

    if args.command == "save":
        cmd_save(args)
    elif args.command == "load":
        cmd_load(args)
    elif args.command == "list":
        cmd_list(args)
    elif args.command == "diff":
        cmd_diff(args)


if __name__ == "__main__":
    main()
