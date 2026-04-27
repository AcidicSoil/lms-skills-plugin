#!/usr/bin/env python3
"""Convert security-scanner findings JSON to SARIF v2.1 format."""

import argparse
import json
import os
import sys

SARIF_SCHEMA = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"
SARIF_VERSION = "2.1.0"

SEVERITY_TO_SARIF = {
    "CRITICAL": "error",
    "HIGH": "error",
    "MEDIUM": "warning",
    "LOW": "note",
    "INFO": "note",
}


def convert_to_sarif(findings_data, base_dir=None):
    findings = findings_data.get("findings", [])
    rules = {}
    results = []

    for finding in findings:
        cwe_id = finding.get("cwe", "CWE-0")
        rule_id = f"security-scanner/{finding.get('type', 'unknown')}"

        if rule_id not in rules:
            rule = {
                "id": rule_id,
                "name": finding.get("name", finding.get("type", "Unknown")),
                "shortDescription": {"text": finding.get("name", "Security finding")},
                "properties": {"tags": ["security"]},
            }
            if cwe_id != "CWE-0":
                rule["helpUri"] = f"https://cwe.mitre.org/data/definitions/{cwe_id.split('-')[1]}.html"
                rule["properties"]["tags"].append(cwe_id)
            rules[rule_id] = rule

        result = {
            "ruleId": rule_id,
            "level": SEVERITY_TO_SARIF.get(finding.get("severity", "MEDIUM"), "warning"),
            "message": {"text": finding.get("description", finding.get("name", "Security finding detected"))},
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {"uri": os.path.relpath(finding.get("file", "unknown"), base_dir)},
                    "region": {"startLine": finding.get("line", 1)},
                },
            }],
            "properties": {
                "confidence": finding.get("confidence", 0.5),
                "severity": finding.get("severity", "MEDIUM"),
            },
        }
        if finding.get("cwe"):
            result["properties"]["cwe"] = finding["cwe"]
        results.append(result)

    sarif = {
        "$schema": SARIF_SCHEMA,
        "version": SARIF_VERSION,
        "runs": [{
            "tool": {
                "driver": {
                    "name": "security-scanner",
                    "version": "1.0.0",
                    "informationUri": "https://github.com/wyattowalsh/agents",
                    "rules": list(rules.values()),
                },
            },
            "results": results,
        }],
    }
    return sarif


def main():
    parser = argparse.ArgumentParser(description="Convert findings to SARIF format")
    parser.add_argument("input", nargs="?", default="-", help="Input JSON file (default: stdin)")
    parser.add_argument("-o", "--output", default="-", help="Output file (default: stdout)")
    parser.add_argument(
        "--base-dir",
        default=os.getcwd(),
        help="Base directory for computing relative artifact paths (default: cwd)",
    )
    args = parser.parse_args()

    try:
        if args.input == "-":
            data = json.load(sys.stdin)
        else:
            with open(args.input) as f:
                data = json.load(f)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}), file=sys.stderr)
        sys.exit(1)

    sarif = convert_to_sarif(data, base_dir=args.base_dir)

    output = json.dumps(sarif, indent=2)
    if args.output == "-":
        print(output)
    else:
        with open(args.output, "w") as f:
            f.write(output)


if __name__ == "__main__":
    main()
