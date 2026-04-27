#!/usr/bin/env python3
"""Regex-based secrets detector. Scans files for API keys, tokens, passwords, private keys."""

import argparse
import json
import math
import os
import re
import sys

PATTERNS = [
    {"name": "AWS Access Key", "regex": r"AKIA[0-9A-Z]{16}", "severity": "CRITICAL", "type": "aws_access_key"},
    {"name": "AWS Secret Key", "regex": r"(?i)aws_secret_access_key\s*[=:]\s*['\"]?([A-Za-z0-9/+=]{40})", "severity": "CRITICAL", "type": "aws_secret_key"},
    {"name": "GitHub Token", "regex": r"ghp_[A-Za-z0-9]{36}", "severity": "CRITICAL", "type": "github_token"},
    {"name": "GitHub OAuth", "regex": r"gho_[A-Za-z0-9]{36}", "severity": "CRITICAL", "type": "github_oauth"},
    {"name": "GitHub App Token", "regex": r"ghu_[A-Za-z0-9]{36}", "severity": "HIGH", "type": "github_app_token"},
    {"name": "GitHub Refresh Token", "regex": r"ghr_[A-Za-z0-9]{36}", "severity": "HIGH", "type": "github_refresh_token"},
    {"name": "GitLab Token", "regex": r"glpat-[A-Za-z0-9\-]{20,}", "severity": "CRITICAL", "type": "gitlab_token"},
    {"name": "Slack Bot Token", "regex": r"xoxb-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{24}", "severity": "CRITICAL", "type": "slack_bot_token"},
    {"name": "Slack Webhook", "regex": r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+", "severity": "HIGH", "type": "slack_webhook"},
    {"name": "Stripe Secret Key", "regex": r"sk_live_[A-Za-z0-9]{24,}", "severity": "CRITICAL", "type": "stripe_secret"},
    {"name": "Stripe Publishable Key", "regex": r"pk_live_[A-Za-z0-9]{24,}", "severity": "MEDIUM", "type": "stripe_publishable"},
    {"name": "Google API Key", "regex": r"AIza[0-9A-Za-z_-]{35}", "severity": "HIGH", "type": "google_api_key"},
    {"name": "Google OAuth ID", "regex": r"[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com", "severity": "MEDIUM", "type": "google_oauth_id"},
    {"name": "Heroku API Key", "regex": r"(?i)heroku[_\s]*api[_\s]*key\s*[=:]\s*['\"]?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", "severity": "HIGH", "type": "heroku_api_key"},
    {"name": "JWT Token", "regex": r"eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+", "severity": "HIGH", "type": "jwt_token"},
    {"name": "SSH Private Key", "regex": r"-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----", "severity": "CRITICAL", "type": "ssh_private_key"},
    {"name": "PGP Private Key", "regex": r"-----BEGIN PGP PRIVATE KEY BLOCK-----", "severity": "CRITICAL", "type": "pgp_private_key"},
    {"name": "Generic Password Assignment", "regex": r"(?i)(?:password|passwd|pwd)\s*[=:]\s*['\"][^'\"]{8,}['\"]", "severity": "HIGH", "type": "generic_password"},
    {"name": "Generic Secret Assignment", "regex": r"(?i)(?:secret|token|api_key|apikey|api-key)\s*[=:]\s*['\"][^'\"]{8,}['\"]", "severity": "HIGH", "type": "generic_secret"},
    {"name": "Database Connection String", "regex": r"(?i)(?:postgres|mysql|mongodb|redis)://[^\s'\"]+:[^\s'\"]+@", "severity": "CRITICAL", "type": "database_url"},
    {"name": "SendGrid API Key", "regex": r"SG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}", "severity": "HIGH", "type": "sendgrid_key"},
    {"name": "Twilio API Key", "regex": r"SK[0-9a-fA-F]{32}", "severity": "HIGH", "type": "twilio_key"},
    {"name": "Mailgun API Key", "regex": r"key-[0-9a-zA-Z]{32}", "severity": "HIGH", "type": "mailgun_key"},
    {"name": "npm Token", "regex": r"npm_[A-Za-z0-9]{36}", "severity": "HIGH", "type": "npm_token"},
    {"name": "PyPI Token", "regex": r"pypi-[A-Za-z0-9\-_]{50,}", "severity": "HIGH", "type": "pypi_token"},
    {"name": "Azure Storage Key", "regex": r"(?i)DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}", "severity": "CRITICAL", "type": "azure_storage_key"},
    {"name": "Discord Bot Token", "regex": r"[MN][A-Za-z0-9]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}", "severity": "HIGH", "type": "discord_token"},
    {"name": "Telegram Bot Token", "regex": r"[0-9]{8,10}:[A-Za-z0-9_-]{35}", "severity": "HIGH", "type": "telegram_token"},
    {"name": "OpenAI API Key", "regex": r"sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}", "severity": "CRITICAL", "type": "openai_key"},
    {"name": "OpenAI API Key (new format)", "regex": r"sk-(?:proj|svcacct)-[A-Za-z0-9_\-]{48,}", "severity": "CRITICAL", "type": "openai_key_v2"},
    {"name": "Anthropic API Key", "regex": r"sk-ant-api[0-9]{2}-[A-Za-z0-9\-_]{80,}", "severity": "CRITICAL", "type": "anthropic_key"},
    {"name": "High Entropy String", "regex": r"(?i)(?:key|secret|token|password|credential)\s*[=:]\s*['\"]([A-Za-z0-9+/=]{32,})['\"]", "severity": "MEDIUM", "type": "high_entropy"},
]

SKIP_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4", ".zip", ".tar", ".gz", ".pyc", ".pyo", ".so", ".dylib", ".dll", ".exe", ".bin"}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".tox", "dist", "build", ".eggs", ".mypy_cache", ".ruff_cache"}


def shannon_entropy(s):
    if not s:
        return 0.0
    freq = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    length = len(s)
    return -sum((count / length) * math.log2(count / length) for count in freq.values())


def scan_file(filepath):
    findings = []
    try:
        with open(filepath, errors="ignore") as f:
            lines = f.readlines()
    except (PermissionError, OSError):
        return findings

    for i, line in enumerate(lines, 1):
        for pattern in PATTERNS:
            matches = re.finditer(pattern["regex"], line)
            for match in matches:
                matched_text = match.group(0)
                confidence = 0.9
                if pattern["type"] == "high_entropy":
                    secret_val = match.group(1) if match.lastindex else matched_text
                    entropy = shannon_entropy(secret_val)
                    if entropy < 3.5:
                        continue
                    confidence = min(0.6 + (entropy - 3.5) * 0.1, 0.95)
                if "example" in line.lower() or "test" in filepath.lower() or "mock" in line.lower():
                    confidence *= 0.5
                findings.append({
                    "file": filepath,
                    "line": i,
                    "type": pattern["type"],
                    "name": pattern["name"],
                    "severity": pattern["severity"],
                    "confidence": round(confidence, 2),
                    "pattern_matched": pattern["regex"][:60] + "..." if len(pattern["regex"]) > 60 else pattern["regex"],
                })
    return findings


def scan_directory(path):
    findings = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in SKIP_EXTENSIONS:
                continue
            filepath = os.path.join(root, filename)
            findings.extend(scan_file(filepath))
    return findings


def main():
    parser = argparse.ArgumentParser(description="Scan for secrets in source code")
    parser.add_argument("path", help="File or directory to scan")
    args = parser.parse_args()

    path = os.path.abspath(args.path)
    if not os.path.exists(path):
        print(json.dumps({"error": f"Path not found: {path}", "findings": []}))
        sys.exit(1)

    if os.path.isfile(path):
        findings = scan_file(path)
    else:
        findings = scan_directory(path)

    findings.sort(key=lambda f: {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}.get(f["severity"], 5))

    result = {
        "path": path,
        "total_findings": len(findings),
        "by_severity": {},
        "findings": findings,
    }
    for f in findings:
        sev = f["severity"]
        result["by_severity"][sev] = result["by_severity"].get(sev, 0) + 1

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
