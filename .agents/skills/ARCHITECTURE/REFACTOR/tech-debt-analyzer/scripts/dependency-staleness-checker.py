#!/usr/bin/env python3
"""Parse lockfiles and manifests for outdated/deprecated packages. Outputs JSON to stdout."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Version pattern: major.minor.patch with optional pre-release
VERSION_RE = re.compile(r"(\d+)\.(\d+)(?:\.(\d+))?")


def parse_pyproject(filepath: Path) -> list[dict]:
    """Parse pyproject.toml for dependency declarations."""
    packages = []
    content = filepath.read_text(encoding="utf-8", errors="replace")

    in_deps = False
    in_array = False
    for line in content.splitlines():
        stripped = line.strip()

        # Section headers
        if stripped.startswith("[") and stripped.endswith("]"):
            in_deps = stripped in ("[project.dependencies]", "[tool.poetry.dependencies]")
            in_array = False
            continue

        # PEP 621: dependencies = [ ... ] under [project] or standalone
        if not in_deps and not in_array and stripped.startswith("dependencies") and "=" in stripped and "[" in stripped:
            in_array = True
            continue

        # End of array
        if in_array and stripped.startswith("]"):
            in_array = False
            continue

        # Parse PEP 508 strings from array: "package>=1.0",
        if in_array and (stripped.startswith('"') or stripped.startswith("'")):
            dep_str = stripped.strip('",\' ')
            match = re.match(r'([a-zA-Z0-9_-]+)([><=!~]+)?([\d.]*)', dep_str)
            if match and match.group(1):
                packages.append({
                    "name": match.group(1),
                    "current_version": match.group(3) or "unknown",
                    "source": str(filepath),
                })
            continue

        # Poetry style: key = "^version"
        if in_deps and "=" in stripped and not stripped.startswith("#"):
            if stripped.startswith('"') or stripped.startswith("'"):
                match = re.match(r'["\']?([a-zA-Z0-9_-]+)([><=!~]+)?([\d.]*)', stripped)
                if match:
                    packages.append({
                        "name": match.group(1),
                        "current_version": match.group(3) or "unknown",
                        "source": str(filepath),
                    })
            else:
                parts = stripped.split("=", 1)
                name = parts[0].strip().strip('"').strip("'")
                version_str = parts[1].strip().strip('"').strip("'")
                ver_match = VERSION_RE.search(version_str)
                version = ver_match.group(0) if ver_match else "unknown"
                if name and not name.startswith("#"):
                    packages.append({
                        "name": name,
                        "current_version": version,
                        "source": str(filepath),
                    })

    return packages


def parse_package_json(filepath: Path) -> list[dict]:
    """Parse package.json for dependencies."""
    packages = []
    try:
        data = json.loads(filepath.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, ValueError):
        return packages

    for dep_key in ("dependencies", "devDependencies", "peerDependencies"):
        deps = data.get(dep_key, {})
        if isinstance(deps, dict):
            for name, version_str in deps.items():
                ver_match = VERSION_RE.search(str(version_str))
                packages.append({
                    "name": name,
                    "current_version": ver_match.group(0) if ver_match else str(version_str),
                    "source": str(filepath),
                    "dep_type": dep_key,
                })

    return packages


def parse_requirements_txt(filepath: Path) -> list[dict]:
    """Parse requirements.txt for dependencies."""
    packages = []
    for line in filepath.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        name_match = re.match(r'([a-zA-Z0-9_-]+)', line)
        ver_match = VERSION_RE.search(line)
        if name_match:
            packages.append({
                "name": name_match.group(1),
                "current_version": ver_match.group(0) if ver_match else "unknown",
                "source": str(filepath),
            })
    return packages


def scan_directory(root: Path) -> dict:
    """Scan for manifest/lockfiles and extract dependency info."""
    packages: list[dict] = []

    parsers = {
        "pyproject.toml": parse_pyproject,
        "package.json": parse_package_json,
        "requirements.txt": parse_requirements_txt,
    }

    # Walk the directory tree (shallow — only check root and immediate subdirs)
    for manifest_name, parser_fn in parsers.items():
        # Check root
        manifest = root / manifest_name
        if manifest.is_file():
            packages.extend(parser_fn(manifest))

        # Check immediate subdirectories (monorepo support)
        try:
            children = list(root.iterdir())
        except (PermissionError, OSError):
            children = []
        for child in children:
            if child.is_dir() and not child.name.startswith(".") and child.name not in {
                "node_modules", "__pycache__", ".venv", "venv", "dist", "build"
            }:
                sub_manifest = child / manifest_name
                if sub_manifest.is_file():
                    packages.extend(parser_fn(sub_manifest))

    # Deduplicate by name (keep first occurrence)
    seen: set[str] = set()
    unique_packages = []
    for pkg in packages:
        if pkg["name"] not in seen:
            seen.add(pkg["name"])
            unique_packages.append(pkg)

    return {
        "packages": unique_packages,
        "summary": {
            "total_packages": len(unique_packages),
            "unknown_version_count": sum(1 for p in unique_packages if p["current_version"] == "unknown"),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Check dependency staleness")
    parser.add_argument("path", nargs="?", default=".", help="Project root directory")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.is_dir():
        print(json.dumps({"error": f"Not a directory: {root}"}))
        sys.exit(1)

    result = scan_directory(root)
    json.dump(result, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
