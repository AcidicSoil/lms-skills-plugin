#!/usr/bin/env python3
"""Find unused functions, classes, and imports in Python codebases. Outputs JSON to stdout."""
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

# Names that are conventionally used and should not be flagged
IGNORE_NAMES = {
    "__init__", "__main__", "__all__", "__str__", "__repr__", "__eq__",
    "__hash__", "__len__", "__iter__", "__next__", "__enter__", "__exit__",
    "__getitem__", "__setitem__", "__delitem__", "__contains__", "__call__",
    "__get__", "__set__", "__delete__", "__new__", "__del__", "__bool__",
    "__lt__", "__le__", "__gt__", "__ge__", "__ne__", "__add__", "__sub__",
    "__mul__", "__truediv__", "__floordiv__", "__mod__", "__pow__",
    "setUp", "tearDown", "setUpClass", "tearDownClass", "main",
    "app", "cli", "server", "setup", "configure", "register",
}


class DefinitionCollector(ast.NodeVisitor):
    """Collect all function and class definitions."""

    def __init__(self, filepath: str) -> None:
        self.filepath = filepath
        self.definitions: list[dict] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if node.name not in IGNORE_NAMES and not node.name.startswith("_"):
            # Check for decorators that indicate the function is externally referenced
            decorator_names = []
            for dec in node.decorator_list:
                if isinstance(dec, ast.Name):
                    decorator_names.append(dec.id)
                elif isinstance(dec, ast.Attribute):
                    decorator_names.append(dec.attr)
            # Skip functions with route/endpoint decorators
            route_decorators = {"route", "get", "post", "put", "delete", "patch", "app", "api"}
            if not route_decorators.intersection(decorator_names):
                self.definitions.append({
                    "name": node.name,
                    "type": "function",
                    "line": node.lineno,
                    "path": self.filepath,
                })
        self.generic_visit(node)

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        if node.name not in IGNORE_NAMES and not node.name.startswith("_"):
            self.definitions.append({
                "name": node.name,
                "type": "class",
                "line": node.lineno,
                "path": self.filepath,
            })
        self.generic_visit(node)


class ReferenceCollector(ast.NodeVisitor):
    """Collect all name references (usage)."""

    def __init__(self) -> None:
        self.references: set[str] = set()

    def visit_Name(self, node: ast.Name) -> None:
        self.references.add(node.id)
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        self.references.add(node.attr)
        self.generic_visit(node)



def collect_unused_imports(tree: ast.AST) -> list[dict]:
    """Find imports that are never referenced in the module."""
    imports: list[dict] = []
    references: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                name = alias.asname or alias.name.split(".")[0]
                imports.append({"name": alias.name, "local_name": name, "line": node.lineno})
        elif isinstance(node, ast.ImportFrom):
            if node.names:
                for alias in node.names:
                    if alias.name == "*":
                        continue
                    name = alias.asname or alias.name
                    imports.append({"name": f"{node.module}.{alias.name}" if node.module else alias.name,
                                    "local_name": name, "line": node.lineno})
        elif isinstance(node, ast.Name):
            references.add(node.id)
        elif isinstance(node, ast.Attribute):
            references.add(node.attr)

    unused = []
    for imp in imports:
        if imp["local_name"] not in references:
            unused.append({
                "name": imp["name"],
                "type": "import",
                "line": imp["line"],
                "confidence": 0.9,
            })
    return unused


def scan_directory(root: Path) -> dict:
    """Scan directory for unused definitions."""
    all_definitions: list[dict] = []
    all_references: set[str] = set()
    unused_imports_by_file: dict[str, list[dict]] = {}

    # First pass: collect all definitions and references
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if not fname.endswith(".py"):
                continue
            filepath = Path(dirpath) / fname
            try:
                source = filepath.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(source, filename=str(filepath))
            except (SyntaxError, ValueError) as e:
                print(f"WARNING: Could not parse {filepath}: {e}", file=sys.stderr)
                continue

            rel_path = str(filepath.relative_to(root))

            # Collect definitions
            def_collector = DefinitionCollector(rel_path)
            def_collector.visit(tree)
            all_definitions.extend(def_collector.definitions)

            # Collect references
            ref_collector = ReferenceCollector()
            ref_collector.visit(tree)
            all_references.update(ref_collector.references)

            # Collect unused imports per file
            file_unused_imports = collect_unused_imports(tree)
            if file_unused_imports:
                for imp in file_unused_imports:
                    imp["path"] = rel_path
                unused_imports_by_file[rel_path] = file_unused_imports

    # Second pass: find definitions not referenced anywhere
    unused = []
    for defn in all_definitions:
        if defn["name"] not in all_references:
            confidence = 0.85
            # Lower confidence for short names (more likely to be used dynamically)
            if len(defn["name"]) <= 3:
                confidence = 0.5
            # Higher confidence for test files
            if "test" in defn["path"].lower():
                confidence = 0.6
            unused.append({
                "path": defn["path"],
                "name": defn["name"],
                "type": defn["type"],
                "line": defn["line"],
                "confidence": confidence,
            })

    # Add unused imports
    for file_imports in unused_imports_by_file.values():
        unused.extend(file_imports)

    return {
        "unused": sorted(unused, key=lambda x: (-x["confidence"], x["path"], x["line"])),
        "summary": {
            "total_definitions": len(all_definitions),
            "unused_count": len(unused),
            "by_type": {
                "functions": sum(1 for u in unused if u["type"] == "function"),
                "classes": sum(1 for u in unused if u["type"] == "class"),
                "imports": sum(1 for u in unused if u["type"] == "import"),
            },
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Detect dead code in Python projects")
    parser.add_argument("path", nargs="?", default=".", help="Directory to scan")
    parser.add_argument("--min-confidence", type=float, default=0.5,
                        help="Minimum confidence to report (0.0-1.0)")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.is_dir():
        print(json.dumps({"error": f"Not a directory: {root}"}))
        sys.exit(1)

    result = scan_directory(root)

    # Filter by confidence threshold
    result["unused"] = [u for u in result["unused"] if u["confidence"] >= args.min_confidence]
    result["summary"]["reported_count"] = len(result["unused"])

    json.dump(result, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
