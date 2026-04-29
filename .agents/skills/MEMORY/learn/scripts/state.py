"""Learning state tracker for the /learn skill."""

import argparse
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path


def _state_path(project: str | None = None) -> Path:
    """Return the state file path for a project."""
    if project:
        project_hash = hashlib.sha256(project.encode()).hexdigest()[:16]
    else:
        project_hash = hashlib.sha256(str(Path.cwd()).encode()).hexdigest()[:16]
    state_dir = Path.home() / ".claude" / "projects" / project_hash
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir / "learning-state.json"


def _load_state(path: Path) -> list[dict]:
    """Load learnings from state file."""
    if not path.exists():
        return []
    return json.loads(path.read_text())


def _save_state(path: Path, state: list[dict]) -> None:
    """Save learnings to state file."""
    path.write_text(json.dumps(state, indent=2) + "\n")


def add(args: argparse.Namespace) -> None:
    """Record a new learning or increment existing."""
    path = _state_path(args.project)
    state = _load_state(path)
    now = datetime.now(UTC).isoformat()

    # Check for existing learning with same text
    for entry in state:
        if entry["text"] == args.text:
            entry["count"] += 1
            entry["last_seen"] = now
            _save_state(path, state)
            print(f"Updated: '{args.text}' (count: {entry['count']})")
            return

    state.append({
        "text": args.text,
        "route_target": args.route or "unrouted",
        "count": 1,
        "first_seen": now,
        "last_seen": now,
        "promoted": False,
    })
    _save_state(path, state)
    print(f"Added: '{args.text}'")


def list_learnings(args: argparse.Namespace) -> None:
    """List learnings with frequency."""
    path = _state_path(args.project)
    state = _load_state(path)

    if not state:
        print("No learnings recorded.")
        return

    for entry in sorted(state, key=lambda x: x["count"], reverse=True):
        status = "[promoted]" if entry["promoted"] else ""
        print(f"  {entry['count']}x  {entry['text']}  -> {entry['route_target']} {status}")


def promote(args: argparse.Namespace) -> None:
    """List learnings ready for promotion."""
    path = _state_path(args.project)
    state = _load_state(path)
    min_count = args.min_count

    candidates = [e for e in state if e["count"] >= min_count and not e["promoted"]]
    if not candidates:
        print(f"No learnings with {min_count}+ occurrences ready for promotion.")
        return

    print(f"Learnings ready for promotion (>= {min_count} occurrences):")
    for entry in sorted(candidates, key=lambda x: x["count"], reverse=True):
        print(f"  {entry['count']}x  {entry['text']}  -> {entry['route_target']}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Learning state tracker")
    sub = parser.add_subparsers(dest="command")

    add_p = sub.add_parser("add", help="Record a learning")
    add_p.add_argument("--text", required=True, help="Learning text")
    add_p.add_argument("--route", default=None, help="Route target")
    add_p.add_argument("--project", default=None, help="Project name")

    list_p = sub.add_parser("list", help="List learnings")
    list_p.add_argument("--project", default=None, help="Project name")

    promote_p = sub.add_parser("promote", help="List promotion-ready learnings")
    promote_p.add_argument("--min-count", type=int, default=3, help="Minimum count")
    promote_p.add_argument("--project", default=None, help="Project name")

    args = parser.parse_args()
    if args.command == "add":
        add(args)
    elif args.command == "list":
        list_learnings(args)
    elif args.command == "promote":
        promote(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
