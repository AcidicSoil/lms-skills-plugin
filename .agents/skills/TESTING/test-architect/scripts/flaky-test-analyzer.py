#!/usr/bin/env python3
"""Parse test result logs for flaky test indicators."""

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# Patterns indicating test results
PYTEST_RESULT = re.compile(r"^(\S+::\S+)\s+(PASSED|FAILED|ERROR)")
JEST_PASS = re.compile(r"^\s*[✓✔]\s+(.+?)(?:\s+\(\d+\s*m?s\))?$")
JEST_FAIL = re.compile(r"^\s*[✕✖×]\s+(.+?)(?:\s+\(\d+\s*m?s\))?$")
TIMING_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*(?:s|ms|seconds?)")
FLAKY_MARKERS = [
    "flaky", "intermittent", "retry", "retried", "unstable",
    "timeout", "timed out", "connection refused", "connection reset",
    "race condition", "deadlock", "order dependent",
]

CAUSE_PATTERNS = {
    "timing": ["timeout", "timed out", "sleep", "wait", "delay", "slow", "deadline"],
    "ordering": ["order", "depend", "sequential", "after", "before", "setup"],
    "resource": ["connection", "refused", "reset", "socket", "port", "database", "network"],
    "state": ["state", "global", "shared", "singleton", "cache", "fixture", "setup"],
    "environment": ["platform", "timezone", "locale", "path", "env", "permission"],
}


def classify_cause(failure_messages: list[str]) -> str:
    """Classify likely root cause from failure messages."""
    combined = " ".join(failure_messages).lower()
    scores = {}
    for cause, keywords in CAUSE_PATTERNS.items():
        scores[cause] = sum(1 for kw in keywords if kw in combined)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "unknown"


def parse_log(content: str) -> dict:
    """Parse test log content for flaky indicators."""
    test_results = defaultdict(lambda: {"passes": 0, "failures": 0, "messages": []})

    lines = content.splitlines()
    for i, line in enumerate(lines):
        # Try pytest-style matching
        m = PYTEST_RESULT.match(line)
        if m:
            test_name = m.group(1)
            status = m.group(2)
            if status == "PASSED":
                test_results[test_name]["passes"] += 1
            else:
                test_results[test_name]["failures"] += 1
                # Capture context lines for cause analysis
                context = lines[max(0, i - 2):min(len(lines), i + 5)]
                test_results[test_name]["messages"].append(" ".join(context))
            continue

        # Try jest-style matching
        m = JEST_PASS.match(line)
        if m:
            test_results[m.group(1)]["passes"] += 1
            continue
        m = JEST_FAIL.match(line)
        if m:
            test_results[m.group(1)]["failures"] += 1
            context = lines[max(0, i - 2):min(len(lines), i + 5)]
            test_results[m.group(1)]["messages"].append(" ".join(context))

    # Identify flaky tests: tests with both passes and failures
    flaky_tests = []
    for name, results in test_results.items():
        if results["failures"] > 0 and results["passes"] > 0:
            cause = classify_cause(results["messages"])
            flaky_tests.append({
                "name": name,
                "pass_count": results["passes"],
                "failure_count": results["failures"],
                "failure_rate": round(
                    results["failures"] / (results["passes"] + results["failures"]) * 100, 1
                ),
                "likely_cause": cause,
                "failure_patterns": results["messages"][:3],
            })

    # Also flag tests that always fail (might be flaky in CI)
    always_failing = []
    for name, results in test_results.items():
        if results["failures"] > 1 and results["passes"] == 0:
            cause = classify_cause(results["messages"])
            always_failing.append({
                "name": name,
                "failure_count": results["failures"],
                "likely_cause": cause,
                "failure_patterns": results["messages"][:3],
            })

    # Check for flaky markers in the log
    marker_hits = []
    for i, line in enumerate(lines):
        lower = line.lower()
        for marker in FLAKY_MARKERS:
            if marker in lower:
                marker_hits.append({"line": i + 1, "marker": marker, "text": line.strip()})

    flaky_tests.sort(key=lambda t: t["failure_count"], reverse=True)

    return {
        "total_tests_seen": len(test_results),
        "flaky_tests": flaky_tests,
        "flaky_count": len(flaky_tests),
        "always_failing": always_failing,
        "always_failing_count": len(always_failing),
        "flaky_markers": marker_hits[:20],
    }


def main():
    parser = argparse.ArgumentParser(
        description="Analyze test logs for flaky test indicators"
    )
    parser.add_argument("log", help="Path to test result log file")
    args = parser.parse_args()

    path = Path(args.log)
    if not path.exists():
        print(f"Error: Log file not found: {args.log}", file=sys.stderr)
        sys.exit(1)

    content = path.read_text()
    result = parse_log(content)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
