#!/usr/bin/env python3
"""Parse coverage reports and output coverage gaps ranked by complexity-weighted risk."""

import argparse
import json
import sys
from pathlib import Path


def parse_coverage_json(data: dict) -> list[dict]:
    """Parse coverage.py JSON format."""
    files = []
    for filepath, info in data.get("files", {}).items():
        summary = info.get("summary", {})
        total = summary.get("num_statements", 0)
        missing = summary.get("missing_lines", 0)
        if total == 0:
            continue
        executed = total - missing
        coverage_pct = round(executed / total * 100, 1)
        missing_lines = info.get("missing_lines", [])
        # Estimate complexity: more missing lines in longer files = higher risk
        complexity_weighted_risk = round(
            missing * (1 + len(missing_lines) / max(total, 1)), 2
        )
        files.append({
            "path": filepath,
            "coverage_pct": coverage_pct,
            "statements": total,
            "missing_count": missing,
            "missing_lines": missing_lines,
            "complexity_weighted_risk": complexity_weighted_risk,
        })
    return files


def parse_lcov(content: str) -> list[dict]:
    """Parse lcov.info format."""
    files = []
    current_file = None
    lines_found = 0
    lines_hit = 0
    missing_lines = []

    for line in content.splitlines():
        if line.startswith("SF:"):
            current_file = line[3:]
            lines_found = 0
            lines_hit = 0
            missing_lines = []
        elif line.startswith("LF:"):
            lines_found = int(line[3:])
        elif line.startswith("LH:"):
            lines_hit = int(line[3:])
        elif line.startswith("DA:"):
            parts = line[3:].split(",")
            if len(parts) >= 2 and int(parts[1]) == 0:
                missing_lines.append(int(parts[0]))
        elif line == "end_of_record" and current_file:
            if lines_found == 0:
                current_file = None
                continue
            coverage_pct = round(lines_hit / lines_found * 100, 1)
            missing_count = lines_found - lines_hit
            complexity_weighted_risk = round(
                missing_count * (1 + len(missing_lines) / max(lines_found, 1)), 2
            )
            files.append({
                "path": current_file,
                "coverage_pct": coverage_pct,
                "statements": lines_found,
                "missing_count": missing_count,
                "missing_lines": missing_lines,
                "complexity_weighted_risk": complexity_weighted_risk,
            })
            current_file = None

    return files


def analyze(report_path: str) -> dict:
    """Analyze a coverage report and return structured results."""
    path = Path(report_path)
    if not path.exists():
        print(f"Error: Report not found: {report_path}", file=sys.stderr)
        sys.exit(1)

    content = path.read_text()

    # Detect format
    if path.suffix == ".json":
        data = json.loads(content)
        files = parse_coverage_json(data)
        report_format = "coverage.py-json"
    elif path.name.endswith(".info") or "SF:" in content[:200]:
        files = parse_lcov(content)
        report_format = "lcov"
    else:
        print(f"Error: Unsupported format: {path.name}", file=sys.stderr)
        print("Supported: coverage.py JSON (.json), lcov (.info)", file=sys.stderr)
        sys.exit(1)

    # Sort by complexity-weighted risk (highest first)
    files.sort(key=lambda f: f["complexity_weighted_risk"], reverse=True)

    # Calculate overall coverage
    total_statements = sum(f["statements"] for f in files)
    total_missing = sum(f["missing_count"] for f in files)
    overall_coverage = (
        round((total_statements - total_missing) / total_statements * 100, 1)
        if total_statements > 0
        else 0.0
    )

    # Identify gaps (files below 80% coverage)
    gaps = [f for f in files if f["coverage_pct"] < 80]

    return {
        "report_format": report_format,
        "report_path": str(report_path),
        "overall_coverage": overall_coverage,
        "total_files": len(files),
        "total_statements": total_statements,
        "total_missing": total_missing,
        "files": files,
        "gaps": gaps,
        "gap_count": len(gaps),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Analyze coverage reports for gaps ranked by complexity-weighted risk"
    )
    parser.add_argument("report", help="Path to coverage report (JSON or lcov)")
    args = parser.parse_args()

    result = analyze(args.report)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
