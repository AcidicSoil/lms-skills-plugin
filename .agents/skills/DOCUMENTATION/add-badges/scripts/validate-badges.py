#!/usr/bin/env python3
"""Badge URL health checker — extracts badge image URLs from a README and verifies them.

Outputs JSON to stdout; warnings to stderr.
Pure stdlib — zero pip dependencies. Uses ThreadPoolExecutor for parallel requests.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MAX_WORKERS = 10
TIMEOUT_S = 5
SLOW_THRESHOLD_MS = 3000
MAX_RETRIES = 2

BADGE_URL_PATTERN = re.compile(
    r"(?:"
    r"!\[[^\]]*\]\(([^)]+)\)"  # markdown ![alt](url)
    r"|"
    r'<img[^>]+src=["\']([^"\']+)["\']'  # HTML <img src="url">
    r")"
)

BADGE_HOSTS = (
    "img.shields.io",
    "badgen.net",
    "forthebadge.com",
    "badge.svg",
    "codecov.io",
    "coveralls.io",
    "sonarcloud.io",
    "api.scorecard.dev",
    "bestpractices.dev",
    "readthedocs.org",
    "dl.circleci.com",
    "pkg.go.dev/badge",
)


def _warn(msg: str) -> None:
    print(f"[validate-badges] {msg}", file=sys.stderr)


def _is_badge_url(url: str) -> bool:
    return any(host in url for host in BADGE_HOSTS)


def _extract_badge_urls(content: str) -> list[str]:
    urls: list[str] = []
    for md_url, html_url in BADGE_URL_PATTERN.findall(content):
        url = md_url or html_url
        if url and _is_badge_url(url):
            urls.append(url)
    return urls


_RETRYABLE_CODES = {429, 500, 502, 503}


def _check_url(url: str) -> dict:
    """HEAD-request a URL with retry + exponential backoff on retryable errors."""
    last_status = 0
    for attempt in range(MAX_RETRIES + 1):
        start = time.monotonic()
        try:
            req = Request(url, method="HEAD")
            req.add_header("User-Agent", "validate-badges/1.0")
            with urlopen(req, timeout=TIMEOUT_S) as resp:
                elapsed_ms = int((time.monotonic() - start) * 1000)
                return {"url": url, "status": resp.status, "ms": elapsed_ms}
        except HTTPError as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            last_status = e.code
            if e.code in _RETRYABLE_CODES and attempt < MAX_RETRIES:
                wait = 2 ** attempt
                _warn(f"Retryable {e.code} on {url}, retrying in {wait}s")
                time.sleep(wait)
                continue
            return {"url": url, "status": e.code, "ms": elapsed_ms}
        except (URLError, TimeoutError, OSError) as e:
            elapsed_ms = int((time.monotonic() - start) * 1000)
            if attempt < MAX_RETRIES:
                time.sleep(2 ** attempt)
                continue
            return {"url": url, "status": 0, "ms": elapsed_ms, "error": str(e)}
    return {"url": url, "status": last_status, "ms": 0, "error": "max retries exceeded"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate badge URLs in a README file")
    parser.add_argument("readme", help="Path to the README file to check")
    args = parser.parse_args()

    readme_path = Path(args.readme)
    if not readme_path.is_file():
        _warn(f"File not found: {readme_path}")
        sys.exit(1)

    content = readme_path.read_text(encoding="utf-8", errors="replace")
    urls = _extract_badge_urls(content)

    if not urls:
        json.dump({"total": 0, "valid": 0, "broken": [], "slow": []}, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return

    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(_check_url, url): url for url in urls}
        for future in as_completed(futures):
            results.append(future.result())

    valid = [r for r in results if 200 <= r.get("status", 0) < 400]
    broken = [{"url": r["url"], "status": r.get("status", 0)} for r in results if r.get("status", 0) >= 400 or r.get("status", 0) == 0]
    slow = [{"url": r["url"], "ms": r["ms"]} for r in results if r["ms"] >= SLOW_THRESHOLD_MS and r.get("status", 0) < 400]

    output = {
        "total": len(urls),
        "valid": len(valid),
        "broken": broken,
        "slow": slow,
    }
    json.dump(output, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
