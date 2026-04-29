# CI Integration Guide

Run honest-review in CI pipelines for automated code review on pull requests.

## Contents

- [GitHub Actions](#github-actions)
- [Exit Codes](#exit-codes)
- [Inline PR Comments](#inline-pr-comments)
- [Conventional Comments in PR Annotations](#conventional-comments-in-pr-annotations)
- [Configuration](#configuration)

## GitHub Actions

Basic workflow that runs honest-review on every PR:

```yaml
name: Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for git diff
      - name: Run honest-review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude --skill honest-review "PR ${{ github.event.pull_request.number }}"
```

## Exit Codes

When running in CI, use exit codes to control pipeline flow:

| Exit Code | Meaning                   | Pipeline Action                |
| --------- | ------------------------- | ------------------------------ |
| 0         | No P0/P1 or S0 findings   | Pass                           |
| 1         | P1 or S0 findings present | Warn (non-blocking by default) |
| 2         | P0 findings present       | Fail (block merge)             |

Configure blocking behavior in the workflow:

```yaml
- name: Check review results
  run: |
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 2 ]; then
      echo "::error::Critical findings detected — merge blocked"
      exit 1
    elif [ $EXIT_CODE -eq 1 ]; then
      echo "::warning::Significant findings detected — review recommended"
    fi
```

## Inline PR Comments

Post findings as inline PR comments using the GitHub CLI with Conventional Comments format.

## Conventional Comments in PR Annotations

When posting review findings as PR comments, use Conventional Comments format
(references/conventional-comments.md) for machine-parseable, human-friendly output.

**Posting a finding as a PR comment:**

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments \
  --method POST \
  -f body="$(cat <<'EOF'
issue (non-blocking): Missing input validation on user-supplied path

**[HR-S-003]** [src/api/files.py:45-52] | Level: Correctness | Confidence: 0.85

**Reasoning:** The `file_path` parameter from the request body is passed directly
to `open()` without sanitization. An attacker could use path traversal (../) to
read arbitrary files on the server.

**Finding:** Path traversal vulnerability in file upload endpoint.

**Evidence:** OWASP A01:2021 Broken Access Control
**Fix:** Use `pathlib.Path.resolve()` and verify the resolved path is within the allowed directory.
EOF
)" \
  -f path="src/api/files.py" \
  -f line=45 \
  -f side="RIGHT" \
  -f commit_id="$(gh pr view {pr} --json headRefOid -q .headRefOid)"
```

**Label consistency:** All CI-posted comments MUST use Conventional Comments format.
This enables automated parsing by downstream tools and provides consistent developer experience
across manual reviews and CI annotations.

See references/conventional-comments.md for the full label taxonomy and severity mapping.

For batch posting, pipe findings through `scripts/finding-formatter.py` and iterate over the JSON output.

## Configuration

Environment variables for CI tuning:

| Variable                     | Default   | Description                                 |
| ---------------------------- | --------- | ------------------------------------------- |
| `HONEST_REVIEW_MODE`         | `session` | Force `session` or `audit` mode             |
| `HONEST_REVIEW_SEVERITY`     | `P1`      | Minimum severity to report (P0, P1, P2, P3) |
| `HONEST_REVIEW_CONFIDENCE`   | `0.7`     | Minimum confidence threshold                |
| `HONEST_REVIEW_MAX_FINDINGS` | `15`      | Cap on reported findings                    |
| `HONEST_REVIEW_EXIT_ON`      | `P0`      | Severity that triggers non-zero exit        |
| `HONEST_REVIEW_FORMAT`       | `text`    | Output format: `text`, `sarif`, `json`      |

These can be parsed by a wrapper script around the skill invocation to customize review behavior in CI.

## SARIF Upload

When `HONEST_REVIEW_FORMAT=sarif`, pipe output to GitHub Code Scanning:

```yaml
- name: Upload SARIF
  if: always()
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
    category: honest-review
```

Or upload manually via `scripts/sarif-uploader.py`. See `references/sarif-output.md` for full SARIF format spec.

## GitHub Check Runs

Create detailed check runs with inline annotations for richer PR feedback:

```bash
# Create a check run with annotations
gh api repos/{owner}/{repo}/check-runs \
  --method POST \
  -f name="honest-review" \
  -f head_sha="$(git rev-parse HEAD)" \
  -f status="completed" \
  -f conclusion="action_required" \
  -f "output[title]=Honest Review: 3 findings" \
  -f "output[summary]=P0: 1, P1: 2, P2: 0" \
  --input annotations.json
```

Check runs provide collapsible annotations in the PR Files tab — richer than PR comments for large reviews.
