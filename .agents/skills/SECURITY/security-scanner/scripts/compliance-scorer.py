#!/usr/bin/env python3
"""Score codebase against compliance checklists (SOC2/GDPR/HIPAA heuristics)."""

import argparse
import json
import os
import re
import sys

CHECKS = {
    "soc2": [
        {"id": "SOC2-AC-1", "control": "Access Control", "check": "Authentication mechanism present", "patterns": [r"(?i)(auth|login|session|jwt|oauth|passport)", r"(?i)(middleware.*auth|require.*login)"]},
        {"id": "SOC2-AC-2", "control": "Access Control", "check": "Role-based access control", "patterns": [r"(?i)(rbac|role|permission|authorize|can_access)", r"(?i)(admin|moderator|user.*role)"]},
        {"id": "SOC2-LOG-1", "control": "Logging", "check": "Audit logging present", "patterns": [r"(?i)(audit.*log|log.*event|activity.*log)", r"(?i)(logger|logging|winston|bunyan|pino)"]},
        {"id": "SOC2-LOG-2", "control": "Logging", "check": "Error logging configured", "patterns": [r"(?i)(error.*handler|exception.*log|sentry|bugsnag|rollbar)"]},
        {"id": "SOC2-ENC-1", "control": "Encryption", "check": "Data encryption at rest", "patterns": [r"(?i)(encrypt|aes|cipher|kms|vault)", r"(?i)(bcrypt|argon2|scrypt|pbkdf2)"]},
        {"id": "SOC2-ENC-2", "control": "Encryption", "check": "TLS/HTTPS enforced", "patterns": [r"(?i)(https|tls|ssl|certificate)", r"(?i)(force.*ssl|redirect.*https|hsts)"]},
        {"id": "SOC2-CHG-1", "control": "Change Management", "check": "Version control in use", "patterns": [r"\.git", r"(?i)(changelog|version|semver)"]},
        {"id": "SOC2-CHG-2", "control": "Change Management", "check": "CI/CD pipeline configured", "patterns": [r"(?i)(github.*actions|circleci|jenkins|gitlab.*ci|travis)", r"\.(github|circleci|gitlab-ci)"]},
        {"id": "SOC2-MON-1", "control": "Monitoring", "check": "Health checks present", "patterns": [r"(?i)(health.*check|readiness|liveness|ping.*endpoint)", r"(?i)(/health|/status|/ready)"]},
        {"id": "SOC2-SEC-1", "control": "Security", "check": "Input validation present", "patterns": [r"(?i)(validate|sanitize|escape|parameterized|prepared.*statement)", r"(?i)(zod|joi|yup|pydantic|marshmallow)"]},
    ],
    "gdpr": [
        {"id": "GDPR-CON-1", "control": "Consent", "check": "Consent mechanism present", "patterns": [r"(?i)(consent|opt.?in|gdpr|cookie.*consent)", r"(?i)(privacy.*policy|terms.*service)"]},
        {"id": "GDPR-DEL-1", "control": "Right to Erasure", "check": "Data deletion capability", "patterns": [r"(?i)(delete.*user|remove.*data|purge|anonymize|right.*forget)", r"(?i)(soft.*delete|hard.*delete|erase)"]},
        {"id": "GDPR-PORT-1", "control": "Data Portability", "check": "Data export capability", "patterns": [r"(?i)(export.*data|download.*data|data.*portability)", r"(?i)(csv.*export|json.*export|backup.*user)"]},
        {"id": "GDPR-MIN-1", "control": "Data Minimization", "check": "Data collection minimized", "patterns": [r"(?i)(minimal|required.*fields|optional.*fields)", r"(?i)(prune|cleanup|retention)"]},
        {"id": "GDPR-ENC-1", "control": "Data Protection", "check": "Personal data encrypted", "patterns": [r"(?i)(encrypt.*personal|pii.*encrypt|encrypt.*pii)", r"(?i)(encrypt|cipher|hash.*password)"]},
        {"id": "GDPR-LOG-1", "control": "Processing Records", "check": "Data processing logged", "patterns": [r"(?i)(process.*log|data.*access.*log|audit)", r"(?i)(gdpr.*log|processing.*record)"]},
        {"id": "GDPR-BREACH-1", "control": "Breach Notification", "check": "Breach handling procedure", "patterns": [r"(?i)(breach|incident.*response|security.*event)", r"(?i)(notification|alert.*security)"]},
    ],
    "hipaa": [
        {"id": "HIPAA-AC-1", "control": "Access Control", "check": "Unique user identification", "patterns": [r"(?i)(user.*id|unique.*identifier|authentication)", r"(?i)(login|session.*management)"]},
        {"id": "HIPAA-AC-2", "control": "Access Control", "check": "Emergency access procedure", "patterns": [r"(?i)(emergency.*access|break.*glass|override.*access)", r"(?i)(admin.*override|emergency.*login)"]},
        {"id": "HIPAA-AUD-1", "control": "Audit Controls", "check": "Audit trail for PHI access", "patterns": [r"(?i)(audit.*trail|phi.*access.*log|hipaa.*log)", r"(?i)(audit|access.*log|activity.*monitor)"]},
        {"id": "HIPAA-INT-1", "control": "Integrity", "check": "Data integrity controls", "patterns": [r"(?i)(checksum|hash|integrity|tamper)", r"(?i)(validation|verify.*data|data.*quality)"]},
        {"id": "HIPAA-TRANS-1", "control": "Transmission Security", "check": "PHI encrypted in transit", "patterns": [r"(?i)(tls|ssl|https|encrypt.*transit)", r"(?i)(secure.*transport|end.*to.*end)"]},
        {"id": "HIPAA-ENC-1", "control": "Encryption", "check": "PHI encrypted at rest", "patterns": [r"(?i)(encrypt.*rest|aes|kms|vault)", r"(?i)(disk.*encrypt|database.*encrypt)"]},
    ],
}


def scan_codebase(path):
    content_map = {}
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}
    skip_ext = {".png", ".jpg", ".gif", ".ico", ".svg", ".woff", ".pyc", ".so"}

    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in skip_ext:
                continue
            filepath = os.path.join(root, filename)
            try:
                file_path = os.path.join(root, filename)
                if os.path.getsize(file_path) > 1_000_000:
                    continue  # skip files > 1MB
                with open(filepath, errors="ignore") as f:
                    content_map[filepath] = f.read()
            except (PermissionError, OSError):
                continue

    if len(content_map) > 10000:
        print("Warning: scanning over 10,000 files — consider narrowing the scan path", file=sys.stderr)

    dir_listing = []
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for d in dirs:
            dir_listing.append(os.path.join(root, d))
        for f in files:
            dir_listing.append(os.path.join(root, f))

    return content_map, dir_listing


def evaluate_check(check, content_map, dir_listing):
    evidence = []
    for filepath, content in content_map.items():
        for pattern in check["patterns"]:
            matches = re.findall(pattern, content)
            if matches:
                evidence.append({"file": filepath, "pattern": pattern, "matches": len(matches)})
                break
    for entry in dir_listing:
        for pattern in check["patterns"]:
            if re.search(pattern, entry):
                evidence.append({"file": entry, "pattern": pattern, "matches": 1})
                break

    # Deduplicate evidence by file path to avoid double-counting from content + path scans
    seen_files = set()
    unique_evidence = []
    for e in evidence:
        file_key = e["file"]
        if file_key not in seen_files:
            seen_files.add(file_key)
            unique_evidence.append(e)

    if len(unique_evidence) >= 2:
        status = "PASS"
    elif len(unique_evidence) == 1:
        status = "PARTIAL"
    else:
        status = "FAIL"

    return {
        "id": check["id"],
        "control": check["control"],
        "check": check["check"],
        "status": status,
        "evidence": [{"file": e["file"], "matches": e["matches"]} for e in unique_evidence[:5]],
    }


def main():
    parser = argparse.ArgumentParser(description="Score codebase against compliance checklist")
    parser.add_argument("path", help="Directory to scan")
    parser.add_argument("--standard", required=True, choices=["soc2", "gdpr", "hipaa"], help="Compliance standard")
    args = parser.parse_args()

    path = os.path.abspath(args.path)
    if not os.path.isdir(path):
        print(json.dumps({"error": f"Not a directory: {path}"}))
        sys.exit(1)

    checks = CHECKS.get(args.standard, [])
    content_map, dir_listing = scan_codebase(path)

    items = []
    passing = 0
    failing = 0
    partial = 0

    for check in checks:
        result = evaluate_check(check, content_map, dir_listing)
        items.append(result)
        if result["status"] == "PASS":
            passing += 1
        elif result["status"] == "FAIL":
            failing += 1
        else:
            partial += 1

    total = len(checks)
    score = round(((passing + partial * 0.5) / total) * 100, 1) if total > 0 else 0

    output = {
        "standard": args.standard.upper(),
        "path": path,
        "score": score,
        "total_controls": total,
        "passing": passing,
        "partial": partial,
        "failing": failing,
        "items": items,
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
