#!/usr/bin/env python3
"""Parse dependency lockfiles and extract package names, versions, and ecosystems."""

import argparse
import json
import os
import re
import sys

LOCKFILE_PARSERS = {
    "package-lock.json": "npm",
    "yarn.lock": "npm",
    "pnpm-lock.yaml": "npm",
    "requirements.txt": "pypi",
    "uv.lock": "pypi",
    "Cargo.lock": "crates",
    "go.sum": "go",
    "Gemfile.lock": "rubygems",
    "composer.lock": "packagist",
}


def parse_package_lock(filepath):
    deps = []
    with open(filepath) as f:
        data = json.load(f)
    packages = data.get("packages", {})
    if not packages:
        packages = data.get("dependencies", {})
        for name, info in packages.items():
            version = info.get("version", "unknown")
            deps.append({"name": name, "version": version, "ecosystem": "npm"})
    else:
        for path, info in packages.items():
            if not path or path == "":
                continue
            name = path.split("node_modules/")[-1]
            version = info.get("version", "unknown")
            deps.append({"name": name, "version": version, "ecosystem": "npm"})
    return deps


def parse_requirements_txt(filepath):
    deps = []
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            match = re.match(r"^([A-Za-z0-9_.\-\[\]]+)\s*(?:[=<>!~]+\s*(.+))?", line)
            if match:
                name = match.group(1).split("[")[0]
                version = match.group(2) or "unpinned"
                deps.append({"name": name, "version": version.strip(), "ecosystem": "pypi"})
    return deps


def parse_uv_lock(filepath):
    deps = []
    with open(filepath) as f:
        content = f.read()
    blocks = re.split(r"\[\[package\]\]", content)
    for block in blocks[1:]:
        name_match = re.search(r'name\s*=\s*"([^"]+)"', block)
        version_match = re.search(r'version\s*=\s*"([^"]+)"', block)
        if name_match:
            name = name_match.group(1)
            version = version_match.group(1) if version_match else "unknown"
            deps.append({"name": name, "version": version, "ecosystem": "pypi"})
    return deps


def parse_cargo_lock(filepath):
    deps = []
    with open(filepath) as f:
        content = f.read()
    blocks = re.split(r"\[\[package\]\]", content)
    for block in blocks[1:]:
        name_match = re.search(r'name\s*=\s*"([^"]+)"', block)
        version_match = re.search(r'version\s*=\s*"([^"]+)"', block)
        if name_match:
            name = name_match.group(1)
            version = version_match.group(1) if version_match else "unknown"
            deps.append({"name": name, "version": version, "ecosystem": "crates"})
    return deps


def parse_go_sum(filepath):
    deps = []
    seen = set()
    with open(filepath) as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 2:
                name = parts[0]
                version = parts[1].split("/")[0].lstrip("v")
                key = f"{name}@{version}"
                if key not in seen:
                    seen.add(key)
                    deps.append({"name": name, "version": version, "ecosystem": "go"})
    return deps


def parse_gemfile_lock(filepath):
    SECTION_HEADERS = {"PLATFORMS", "DEPENDENCIES", "BUNDLED WITH", "GIT", "PATH", "RUBY VERSION", "CHECKSUMS"}
    deps = []
    in_specs = False
    with open(filepath) as f:
        for line in f:
            stripped = line.strip()
            if stripped == "specs:":
                in_specs = True
                continue
            if in_specs:
                if not stripped:
                    continue  # skip blank lines inside specs block
                if stripped in SECTION_HEADERS or (stripped.endswith(":") and not line.startswith("    ")):
                    in_specs = False
                    continue
                match = re.match(r"^\s{4}(\S+)\s+\((.+)\)", line)
                if match:
                    deps.append({"name": match.group(1), "version": match.group(2), "ecosystem": "rubygems"})
    return deps


def parse_composer_lock(filepath):
    deps = []
    with open(filepath) as f:
        data = json.load(f)
    for pkg in data.get("packages", []) + data.get("packages-dev", []):
        name = pkg.get("name", "unknown")
        version = pkg.get("version", "unknown").lstrip("v")
        deps.append({"name": name, "version": version, "ecosystem": "packagist"})
    return deps


def parse_yarn_lock(filepath):
    deps = []
    with open(filepath) as f:
        content = f.read()
    pattern = re.compile(r'^"?([^@\s][^@]*?)@[^:]+:\s*\n\s+version\s+"([^"]+)"', re.MULTILINE)
    for match in pattern.finditer(content):
        deps.append({"name": match.group(1), "version": match.group(2), "ecosystem": "npm"})
    return deps


def parse_pnpm_lock(filepath):
    # NOTE: pnpm v6+ lockfile format is not yet supported
    deps = []
    with open(filepath) as f:
        content = f.read()
    in_deps = False
    for line in content.split("\n"):
        if line.strip() in ("dependencies:", "devDependencies:", "optionalDependencies:"):
            in_deps = True
            continue
        if in_deps and line.startswith("  ") and ":" in line:
            parts = line.strip().split(":")
            if len(parts) >= 2:
                name = parts[0].strip().strip("'\"")
                version = parts[1].strip().strip("'\"")
                deps.append({"name": name, "version": version, "ecosystem": "npm"})
        elif in_deps and not line.startswith(" "):
            in_deps = False
    return deps


PARSERS = {
    "package-lock.json": parse_package_lock,
    "yarn.lock": parse_yarn_lock,
    "pnpm-lock.yaml": parse_pnpm_lock,
    "requirements.txt": parse_requirements_txt,
    "uv.lock": parse_uv_lock,
    "Cargo.lock": parse_cargo_lock,
    "go.sum": parse_go_sum,
    "Gemfile.lock": parse_gemfile_lock,
    "composer.lock": parse_composer_lock,
}


def find_lockfiles(path):
    found = []
    if os.path.isfile(path):
        basename = os.path.basename(path)
        if basename in LOCKFILE_PARSERS:
            found.append(path)
        return found
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".venv", "venv"}]
        for f in files:
            if f in LOCKFILE_PARSERS:
                found.append(os.path.join(root, f))
    return found


def main():
    parser = argparse.ArgumentParser(description="Parse dependency lockfiles")
    parser.add_argument("path", help="File or directory to scan for lockfiles")
    args = parser.parse_args()

    path = os.path.abspath(args.path)
    if not os.path.exists(path):
        print(json.dumps({"error": f"Path not found: {path}", "lockfiles": [], "dependencies": []}))
        sys.exit(1)

    lockfiles = find_lockfiles(path)
    all_deps = []
    parsed_files = []

    for lockfile in lockfiles:
        basename = os.path.basename(lockfile)
        parse_fn = PARSERS.get(basename)
        if parse_fn:
            try:
                deps = parse_fn(lockfile)
                all_deps.extend(deps)
                parsed_files.append({"file": lockfile, "ecosystem": LOCKFILE_PARSERS[basename], "count": len(deps)})
            except Exception as e:
                print(f"Warning: Failed to parse {lockfile}: {e}", file=sys.stderr)
                parsed_files.append({"file": lockfile, "ecosystem": LOCKFILE_PARSERS[basename], "error": str(e)})

    result = {
        "path": path,
        "lockfiles": parsed_files,
        "total_dependencies": len(all_deps),
        "by_ecosystem": {},
        "dependencies": all_deps,
    }
    for d in all_deps:
        eco = d["ecosystem"]
        result["by_ecosystem"][eco] = result["by_ecosystem"].get(eco, 0) + 1

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
