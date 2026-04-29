#!/usr/bin/env python3
"""Upload SARIF results to GitHub Code Scanning API.

Usage:
    python sarif-uploader.py --input results.sarif
    cat results.sarif | python sarif-uploader.py

Requires: gh CLI authenticated with repo scope.
"""

import argparse
import base64
import gzip
import json
import subprocess
import sys


def get_repo_info() -> tuple[str, str]:
    """Get owner/repo from gh CLI."""
    result = subprocess.run(
        ["gh", "repo", "view", "--json", "owner,name"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Error: Could not determine repository: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    data = json.loads(result.stdout)
    return data["owner"]["login"], data["name"]


def get_commit_sha() -> str:
    """Get current HEAD commit SHA."""
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Error: Could not determine commit SHA: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def get_current_ref() -> str:
    """Get current git ref."""
    result = subprocess.run(
        ["git", "symbolic-ref", "HEAD"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        # Fallback for detached HEAD
        return "refs/heads/main"
    return result.stdout.strip()


def validate_sarif(sarif_data: dict) -> bool:
    """Basic SARIF v2.1 validation."""
    if sarif_data.get("version") != "2.1.0":
        print("Error: SARIF version must be 2.1.0", file=sys.stderr)
        return False
    if "runs" not in sarif_data or not sarif_data["runs"]:
        print("Error: SARIF must contain at least one run", file=sys.stderr)
        return False
    for run in sarif_data["runs"]:
        if "tool" not in run:
            print("Error: Each run must have a tool section", file=sys.stderr)
            return False
    return True


def upload_sarif(sarif_content: str, owner: str, repo: str, commit_sha: str, ref: str) -> dict:
    """Upload SARIF to GitHub Code Scanning API."""
    compressed = gzip.compress(sarif_content.encode("utf-8"))
    encoded = base64.b64encode(compressed).decode("utf-8")

    result = subprocess.run(
        [
            "gh", "api",
            f"repos/{owner}/{repo}/code-scanning/sarifs",
            "--method", "POST",
            "-f", f"commit_sha={commit_sha}",
            "-f", f"ref={ref}",
            "-f", f"sarif={encoded}",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Error uploading SARIF: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    return json.loads(result.stdout) if result.stdout.strip() else {}


def main():
    parser = argparse.ArgumentParser(description="Upload SARIF to GitHub Code Scanning")
    parser.add_argument("--input", "-i", help="Path to SARIF file (reads stdin if not provided)")
    args = parser.parse_args()

    # Read SARIF
    if args.input:
        with open(args.input) as f:
            sarif_content = f.read()
    else:
        sarif_content = sys.stdin.read()

    if not sarif_content.strip():
        print("Error: Empty SARIF input", file=sys.stderr)
        sys.exit(1)

    # Parse and validate
    sarif_data = json.loads(sarif_content)
    if not validate_sarif(sarif_data):
        sys.exit(1)

    # Count findings
    total_results = sum(len(run.get("results", [])) for run in sarif_data["runs"])

    # Get repo context
    owner, repo = get_repo_info()
    commit_sha = get_commit_sha()
    ref = get_current_ref()

    # Upload
    response = upload_sarif(sarif_content, owner, repo, commit_sha, ref)

    # Output result as JSON
    output = {
        "status": "uploaded",
        "repository": f"{owner}/{repo}",
        "commit": commit_sha,
        "ref": ref,
        "findings_count": total_results,
        "response": response,
    }
    json.dump(output, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
