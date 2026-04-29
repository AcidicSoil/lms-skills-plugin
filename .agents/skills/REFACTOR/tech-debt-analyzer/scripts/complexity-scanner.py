#!/usr/bin/env python3
"""Multi-language AST complexity analysis. Outputs JSON to stdout."""
from __future__ import annotations

import argparse
import ast
import json
import os
import sys
from pathlib import Path

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", ".tox",
    "dist", "build", ".next", ".nuxt", "target", "vendor", ".mypy_cache",
    ".eggs", ".pytest_cache", ".ruff_cache", "site-packages",
}

THRESHOLDS = {"HIGH": 10, "MEDIUM": 5}


def cyclomatic_complexity(node: ast.AST) -> int:
    """Count decision points for cyclomatic complexity."""
    cc = 1
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
            cc += 1
        elif isinstance(child, ast.BoolOp):
            cc += len(child.values) - 1
        elif isinstance(child, ast.Assert):
            cc += 1
        elif isinstance(child, (ast.ListComp, ast.SetComp, ast.GeneratorExp, ast.DictComp)):
            cc += sum(1 for _ in child.generators)
    return cc


def cognitive_complexity(node: ast.AST, depth: int = 0) -> int:
    """Estimate cognitive complexity (nesting-weighted)."""
    total = 0
    for child in ast.iter_child_nodes(node):
        increment = 0
        nesting = 0
        if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler)):
            increment = 1
            nesting = depth
        elif isinstance(child, ast.BoolOp):
            increment = len(child.values) - 1
        elif isinstance(child, (ast.Break, ast.Continue)):
            increment = 1

        total += increment + nesting

        if isinstance(child, (ast.If, ast.While, ast.For, ast.ExceptHandler,
                              ast.With, ast.AsyncWith, ast.AsyncFor)):
            total += cognitive_complexity(child, depth + 1)
        else:
            total += cognitive_complexity(child, depth)
    return total


def analyze_python_file(filepath: Path) -> list[dict]:
    """Analyze a Python file for function-level complexity."""
    try:
        source = filepath.read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=str(filepath))
    except (SyntaxError, ValueError) as e:
        print(f"WARNING: Could not parse {filepath}: {e}", file=sys.stderr)
        return []

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            end_line = getattr(node, "end_lineno", node.lineno)
            loc = end_line - node.lineno + 1
            cc = cyclomatic_complexity(node)
            cog = cognitive_complexity(node)
            params = len(node.args.args) + len(node.args.posonlyargs) + len(node.args.kwonlyargs)
            if node.args.vararg:
                params += 1
            if node.args.kwarg:
                params += 1

            risk = "HIGH" if cc > THRESHOLDS["HIGH"] else "MEDIUM" if cc > THRESHOLDS["MEDIUM"] else "LOW"

            functions.append({
                "name": node.name,
                "line": node.lineno,
                "end_line": end_line,
                "cyclomatic_complexity": cc,
                "cognitive_complexity": cog,
                "loc": loc,
                "params": params,
                "risk": risk,
            })

    return functions


def scan_directory(root: Path) -> dict:
    """Scan directory for Python files and compute complexity metrics."""
    files_data = []
    all_cc = []
    high_risk_count = 0

    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if not fname.endswith(".py"):
                continue
            filepath = Path(dirpath) / fname
            functions = analyze_python_file(filepath)
            if functions:
                rel_path = str(filepath.relative_to(root))
                files_data.append({"path": rel_path, "functions": functions})
                for f in functions:
                    all_cc.append(f["cyclomatic_complexity"])
                    if f["risk"] == "HIGH":
                        high_risk_count += 1

    avg_cc = sum(all_cc) / len(all_cc) if all_cc else 0.0
    max_cc = max(all_cc) if all_cc else 0

    return {
        "files": files_data,
        "summary": {
            "total_files": len(files_data),
            "total_functions": len(all_cc),
            "avg_cyclomatic_complexity": round(avg_cc, 2),
            "max_cyclomatic_complexity": max_cc,
            "high_risk_count": high_risk_count,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan codebase for function complexity")
    parser.add_argument("path", nargs="?", default=".", help="Directory to scan")
    parser.add_argument("--threshold-high", type=int, default=10, help="CC threshold for HIGH risk")
    parser.add_argument("--threshold-medium", type=int, default=5, help="CC threshold for MEDIUM risk")
    args = parser.parse_args()

    THRESHOLDS["HIGH"] = args.threshold_high
    THRESHOLDS["MEDIUM"] = args.threshold_medium

    root = Path(args.path).resolve()
    if not root.is_dir():
        print(json.dumps({"error": f"Not a directory: {root}"}))
        sys.exit(1)

    result = scan_directory(root)
    json.dump(result, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
