#!/usr/bin/env python3
"""Detect inconsistent patterns across a Python codebase. Outputs JSON to stdout."""
from __future__ import annotations

import argparse
import ast
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", ".tox",
    "dist", "build", ".next", ".nuxt", "target", "vendor", ".mypy_cache",
    ".eggs", ".pytest_cache", ".ruff_cache", "site-packages",
}

# Pattern categories to check
PATTERN_CHECKS = {
    "string_quoting": "Single vs double quotes",
    "import_style": "Absolute vs relative imports",
    "type_hints": "Type-annotated vs unannotated functions",
    "docstring_style": "Docstring conventions (Google/NumPy/reST/none)",
    "error_handling": "Exception handling patterns",
    "naming_convention": "Function naming (snake_case consistency)",
}


def check_string_quoting(tree: ast.AST, source: str) -> str | None:
    """Determine dominant string quoting style."""
    single_count = source.count("'") - source.count("\\'")
    double_count = source.count('"') - source.count('\\"')
    # Rough heuristic — exclude docstrings (triple quotes)
    triple_single = source.count("'''")
    triple_double = source.count('"""')
    single_count -= triple_single * 3
    double_count -= triple_double * 3
    if single_count > double_count * 1.5:
        return "single"
    if double_count > single_count * 1.5:
        return "double"
    return "mixed"


def check_import_style(tree: ast.AST) -> str | None:
    """Check import style: absolute vs relative."""
    absolute_count = 0
    relative_count = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.level and node.level > 0:
                relative_count += 1
            else:
                absolute_count += 1
    if absolute_count > 0 and relative_count == 0:
        return "absolute"
    if relative_count > 0 and absolute_count == 0:
        return "relative"
    if absolute_count > 0 and relative_count > 0:
        return "mixed"
    return None


def check_type_hints(tree: ast.AST) -> str | None:
    """Check type annotation usage."""
    annotated = 0
    unannotated = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            if node.returns or any(a.annotation for a in node.args.args):
                annotated += 1
            else:
                unannotated += 1
    if annotated > 0 and unannotated == 0:
        return "fully_annotated"
    if unannotated > 0 and annotated == 0:
        return "unannotated"
    if annotated > 0 and unannotated > 0:
        return "partially_annotated"
    return None


def check_docstring_style(tree: ast.AST) -> str | None:
    """Detect docstring convention."""
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Module)):
            docstring = ast.get_docstring(node)
            if docstring:
                if ":param " in docstring or ":type " in docstring:
                    return "reST"
                if "Args:" in docstring or "Returns:" in docstring:
                    return "google"
                if "Parameters\n" in docstring or "Returns\n" in docstring:
                    return "numpy"
                return "simple"
    return "none"


def check_error_handling(tree: ast.AST) -> str | None:
    """Check error handling patterns."""
    bare_except = 0
    typed_except = 0
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler):
            if node.type is None:
                bare_except += 1
            else:
                typed_except += 1
    if bare_except > 0 and typed_except == 0:
        return "bare_except"
    if typed_except > 0 and bare_except == 0:
        return "typed_except"
    if bare_except > 0 and typed_except > 0:
        return "mixed"
    return None


def analyze_file(filepath: Path, root: Path) -> dict | None:
    """Analyze a single file for pattern consistency."""
    try:
        source = filepath.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(filepath))
    except (SyntaxError, ValueError) as e:
        print(f"WARNING: Could not parse {filepath}: {e}", file=sys.stderr)
        return None

    rel_path = str(filepath.relative_to(root))
    patterns = {}

    quoting = check_string_quoting(tree, source)
    if quoting:
        patterns["string_quoting"] = quoting

    imports = check_import_style(tree)
    if imports:
        patterns["import_style"] = imports

    hints = check_type_hints(tree)
    if hints:
        patterns["type_hints"] = hints

    docstrings = check_docstring_style(tree)
    if docstrings:
        patterns["docstring_style"] = docstrings

    errors = check_error_handling(tree)
    if errors:
        patterns["error_handling"] = errors

    return {"path": rel_path, "patterns": patterns}


def find_inconsistencies(file_patterns: list[dict]) -> list[dict]:
    """Compare patterns across files to find inconsistencies."""
    # Group by pattern type
    pattern_values: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))

    for fp in file_patterns:
        for pattern_name, value in fp["patterns"].items():
            pattern_values[pattern_name][value].append(fp["path"])

    inconsistencies = []
    for pattern_name, values in pattern_values.items():
        if len(values) <= 1:
            continue  # Consistent

        # Find dominant style
        dominant_style = max(values.keys(), key=lambda k: len(values[k]))
        dominant_count = len(values[dominant_style])
        total_files = sum(len(files) for files in values.values())

        # Only report if there are actual outliers
        outlier_files = []
        for style, files in values.items():
            if style != dominant_style:
                outlier_files.extend(files)

        if outlier_files and dominant_count > len(outlier_files):
            inconsistencies.append({
                "pattern": pattern_name,
                "description": PATTERN_CHECKS.get(pattern_name, pattern_name),
                "dominant_style": dominant_style,
                "dominant_count": dominant_count,
                "total_files": total_files,
                "outliers": outlier_files[:10],  # Cap at 10 for readability
                "outlier_count": len(outlier_files),
            })

    return sorted(inconsistencies, key=lambda x: x["outlier_count"], reverse=True)


def scan_directory(root: Path) -> dict:
    """Scan directory for pattern inconsistencies."""
    file_patterns = []

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if not fname.endswith(".py"):
                continue
            filepath = Path(dirpath) / fname
            result = analyze_file(filepath, root)
            if result:
                file_patterns.append(result)

    inconsistencies = find_inconsistencies(file_patterns)

    return {
        "inconsistencies": inconsistencies,
        "summary": {
            "total_files_analyzed": len(file_patterns),
            "inconsistency_count": len(inconsistencies),
            "patterns_checked": list(PATTERN_CHECKS.keys()),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Check pattern consistency across codebase")
    parser.add_argument("path", nargs="?", default=".", help="Directory to scan")
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
