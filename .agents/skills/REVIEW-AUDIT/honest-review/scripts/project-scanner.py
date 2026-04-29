#!/usr/bin/env python3
"""Wave 0 deterministic pre-scan: detect project type, compute metrics, stratify risk."""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

MANIFEST_MAP: dict[str, tuple[str, str, str | None]] = {
    "pyproject.toml": ("python", "pyproject.toml", "uv"), "setup.py": ("python", "setup.py", "pip"),
    "requirements.txt": ("python", "requirements.txt", "pip"),
    "package.json": ("javascript", "package.json", None), "Cargo.toml": ("rust", "cargo", "cargo"),
    "go.mod": ("go", "go.mod", "go"), "Gemfile": ("ruby", "bundler", "bundler"),
    "pom.xml": ("java", "maven", "maven"), "build.gradle": ("java", "gradle", "gradle"),
    "build.gradle.kts": ("kotlin", "gradle", "gradle"),
}
LANG_EXT: dict[str, str] = {
    ".py": "python", ".js": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".jsx": "javascript", ".rs": "rust", ".go": "go", ".rb": "ruby",
    ".java": "java", ".kt": "kotlin", ".swift": "swift", ".c": "c",
    ".cpp": "cpp", ".cs": "csharp", ".php": "php",
}
FW_KW: dict[str, str] = {
    "fastapi": "fastapi", "flask": "flask", "django": "django", "express": "express",
    "react": "react", "next": "nextjs", "vue": "vue", "angular": "angular",
    "rails": "rails", "spring": "spring", "actix": "actix", "axum": "axum",
    "gin": "gin", "echo": "echo", "svelte": "svelte", "nuxt": "nuxt",
    "fastify": "fastify", "hono": "hono",
}
TEST_KW: dict[str, str] = {
    "pytest": "pytest", "unittest": "unittest", "jest": "jest", "mocha": "mocha",
    "vitest": "vitest", "rspec": "rspec", "junit": "junit",
}
HIGH_RISK_RE = re.compile(
    r"(auth|login|session|token|password|credential|secret|crypto|encrypt|decrypt|"
    r"payment|billing|checkout|stripe|invoice|user[_-]?data|pii|gdpr|privacy|"
    r"admin|permission|rbac|acl|security|migration|schema)", re.I)
SKIP = {".git", "node_modules", "__pycache__", ".venv", "venv", ".tox",
        "dist", "build", ".next", ".nuxt", "target", "vendor", ".mypy_cache"}
IMPORT_RE: dict[str, re.Pattern[str]] = {
    "python": re.compile(r"^(?:from\s+(\S+)\s+import|import\s+(\S+))", re.M),
    "typescript": re.compile(r"""^import\s+.*from\s+['"](\S+)['"]|require\(['"](\S+)['"]\)""", re.M),
    "javascript": re.compile(r"""^import\s+.*from\s+['"](\S+)['"]|require\(['"](\S+)['"]\)""", re.M),
    "go": re.compile(r'"(\S+)"'),
    "rust": re.compile(r"^(?:use\s+(\S+)|mod\s+(\S+))", re.M),
}

def _git(args: list[str], cwd: Path) -> str:
    try:
        r = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else ""
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return ""

def _detect_indent_unit(lines: list[str]) -> int:
    """Detect the most common indentation delta in a file.

    Examines transitions between consecutive non-empty lines to find the most
    frequent positive indent increase. Works with spaces, tabs, and mixed
    indentation. Returns the detected unit or 4 as a sensible default.
    """
    deltas: Counter[int] = Counter()
    prev_indent = 0
    for ln in lines:
        stripped = ln.lstrip()
        if not stripped:
            continue
        # Count raw leading whitespace chars (tabs count as 1 char each)
        cur_indent = len(ln) - len(stripped)
        diff = cur_indent - prev_indent
        if diff > 0:
            deltas[diff] += 1
        prev_indent = cur_indent
    if not deltas:
        return 4
    # Return the most common positive delta
    return deltas.most_common(1)[0][0]

def _metrics(p: Path) -> tuple[int, int]:
    try: lines = p.read_text(errors="replace").splitlines()
    except OSError: return 0, 0
    loc = sum(1 for ln in lines if ln.strip() and not ln.strip().startswith("#"))
    indent_unit = _detect_indent_unit(lines)
    mx = 0
    for ln in lines:
        s = ln.lstrip()
        if s:
            raw_indent = len(ln) - len(s)
            d = raw_indent // indent_unit if indent_unit else 0
            mx = max(mx, d)
    return loc, mx

def _risk(path: str, loc: int, nest: int, hot: set[str], fan_in: int = 0) -> tuple[str, list[str]]:
    """Classify file risk using a weighted points system.

    Security-sensitive triggers carry heavier weight (3 points) than code-quality
    triggers (1 point each). HIGH requires >= 3 points, which means either one
    security trigger alone or three non-security triggers combined.
    MEDIUM requires >= 1 point.

    High fan-in files (imported by many others) are critical dependency hubs:
    fan_in >= 10 is an automatic HIGH; fan_in >= 5 adds 2 points.
    """
    reasons: list[str] = []
    # Fan-in >= 10 is an automatic HIGH — these are critical dependency hubs
    if fan_in >= 10:
        reasons.append(f"critical dependency hub (fan-in {fan_in})")
        return "HIGH", reasons
    points = 0
    # Fan-in >= 5 is a significant dependency indicator (weight: 2)
    if fan_in >= 5:
        reasons.append(f"high fan-in ({fan_in} importers)")
        points += 2
    # Security/data-sensitive triggers (weight: 3)
    if HIGH_RISK_RE.search(path):
        reasons.append("security/data-sensitive path")
        points += 3
    # Code-quality triggers (weight: 1 each)
    if loc > 300:
        reasons.append(f"high LOC ({loc})")
        points += 1
    if nest >= 5:
        reasons.append(f"high complexity (nesting {nest})")
        points += 1
    if path in hot:
        reasons.append("frequently changed (hot file)")
        points += 1
    if points >= 3:
        return "HIGH", reasons
    if points >= 1:
        return "MEDIUM", reasons
    return "LOW", reasons

def _build_dependency_graph(root: Path, files: list[dict]) -> dict[str, dict[str, list[str]]]:
    """Build a cross-file dependency graph for the project.

    For each source file, extract import statements using language-appropriate
    regex and attempt to resolve them to project-local file paths. External
    packages are silently skipped.

    Returns a dict mapping filepaths to {"imports": [...], "imported_by": [...]}.
    """
    try:
        # Build a lookup from possible module names to relative paths
        path_lookup: dict[str, str] = {}
        for f in files:
            rel = f["path"]
            p = Path(rel)
            # Map stem, full relative path, and dotted module paths
            path_lookup[p.stem] = rel
            path_lookup[rel] = rel
            path_lookup[str(p.with_suffix(""))] = rel
            # Python dotted module name: a/b/c.py -> a.b.c
            dotted = str(p.with_suffix("")).replace(os.sep, ".").replace("/", ".")
            path_lookup[dotted] = rel

        graph: dict[str, dict[str, list[str]]] = {}
        for f in files:
            rel = f["path"]
            graph.setdefault(rel, {"imports": [], "imported_by": []})

        for f in files:
            rel = f["path"]
            ext = Path(rel).suffix
            lang = LANG_EXT.get(ext)
            if not lang:
                continue
            pattern = IMPORT_RE.get(lang)
            if not pattern:
                continue
            try:
                text = (root / rel).read_text(errors="replace")
            except OSError:
                continue
            for m in pattern.finditer(text):
                # Each regex has up to 2 groups; take the first non-None match
                raw = next((g for g in m.groups() if g is not None), None)
                if raw is None:
                    continue
                # Normalize: strip leading dots (relative imports), trailing semicolons
                cleaned = raw.lstrip(".").rstrip(";")
                # Attempt resolution to a project-local file
                resolved = path_lookup.get(cleaned)
                if not resolved:
                    # Try stripping the first component (e.g. package name)
                    parts = cleaned.split(".")
                    if len(parts) > 1:
                        resolved = path_lookup.get(".".join(parts[1:]))
                if not resolved:
                    # Try as a relative path from the file's directory
                    candidate = str(Path(rel).parent / cleaned.replace(".", os.sep))
                    resolved = path_lookup.get(candidate)
                if resolved and resolved != rel:
                    if resolved not in graph[rel]["imports"]:
                        graph[rel]["imports"].append(resolved)
                    graph.setdefault(resolved, {"imports": [], "imported_by": []})
                    if rel not in graph[resolved]["imported_by"]:
                        graph[resolved]["imported_by"].append(rel)
        return graph
    except Exception:
        return {}


def _node_pm(root: Path) -> str:
    for lock, pm in [("pnpm-lock.yaml", "pnpm"), ("yarn.lock", "yarn"), ("bun.lockb", "bun"), ("bun.lock", "bun")]:
        if (root / lock).exists(): return pm
    return "npm"

def _deps(root: Path) -> list[dict[str, str]]:
    deps: list[dict[str, str]] = []
    pp = root / "pyproject.toml"
    if pp.exists():
        txt = pp.read_text(errors="replace")
        for m in re.finditer(r"(?:dependencies|requires)\s*=\s*\[([^\]]*)\]", txt):
            for dm in re.finditer(r'"([a-zA-Z0-9_][a-zA-Z0-9_.-]*?)(\[[^\]]*\])?\s*([><=!~][^"]*)?"\s*', m.group(1)):
                deps.append({"name": dm.group(1).lower(), "version": (dm.group(3) or "").strip() or "*", "source": "pyproject.toml"})
    rq = root / "requirements.txt"
    if rq.exists():
        try:
            for line in rq.read_text(errors="replace").splitlines():
                line = line.strip()
                if line and not line.startswith(("#", "-")):
                    m = re.match(r"([a-zA-Z0-9_][a-zA-Z0-9_.-]*)\s*([><=!~].*)?", line)
                    if m: deps.append({"name": m.group(1).lower(), "version": (m.group(2) or "").strip() or "*", "source": "requirements.txt"})
        except OSError: pass
    pkg = root / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(errors="replace"))
            for sec in ("dependencies", "devDependencies"):
                for n, v in data.get(sec, {}).items():
                    deps.append({"name": n, "version": v, "source": "package.json"})
        except (json.JSONDecodeError, OSError): pass
    return deps

def scan(root: Path) -> dict:
    root = root.resolve()
    langs: set[str] = set()
    bs: str | None = None
    pm: str | None = None
    for mf, (lang, b, p) in MANIFEST_MAP.items():
        if (root / mf).exists():
            langs.add(lang); bs = bs or b; pm = pm or p
    if "javascript" in langs or "typescript" in langs: pm = pm or _node_pm(root)
    if bs == "pyproject.toml": pm = "uv" if (root / "uv.lock").exists() else "pip"
    # Git stats
    hr = _git(["log", "--since=90 days ago", "--pretty=", "--name-only"], root)
    hc = Counter(hr.splitlines()) if hr else Counter()
    hot_files = [f for f, c in hc.most_common(20) if c >= 3]; hot_set = set(hot_files)
    br = _git(["shortlog", "-sn", "--all"], root)
    n_contrib = len(br.splitlines()) if br else 0
    high_blame: list[str] = []
    if n_contrib >= 3:
        for hf in hot_files[:10]:
            fb = _git(["shortlog", "-sn", "--all", "--", hf], root)
            if len(fb.splitlines()) >= max(2, n_contrib // 2): high_blame.append(hf)
    # Walk files — collect metrics first, then build dependency graph, then score risk
    deps = _deps(root); files: list[dict] = []; tloc = 0
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP]
        for fn in fns:
            ext = Path(fn).suffix
            if ext not in LANG_EXT: continue
            langs.add(LANG_EXT[ext])
            fp = Path(dp) / fn; rel = str(fp.relative_to(root))
            loc, nest = _metrics(fp); tloc += loc
            files.append({"path": rel, "loc": loc, "max_nesting": nest})
    # Build dependency graph and compute fan-in before risk scoring
    graph = _build_dependency_graph(root, files)
    for f in files:
        fan_in = len(graph.get(f["path"], {}).get("imported_by", []))
        risk, reasons = _risk(f["path"], f["loc"], f["max_nesting"], hot_set, fan_in=fan_in)
        f["risk"] = risk; f["risk_reasons"] = reasons
    files.sort(key=lambda f: ("HIGH", "MEDIUM", "LOW").index(f["risk"]))
    rs = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for f in files: rs[f["risk"]] += 1
    dep_names = {d["name"].lower() for d in deps}
    fws = sorted({fw for kw, fw in FW_KW.items() if any(kw in n for n in dep_names)})
    tfw = next((fw for kw, fw in TEST_KW.items() if kw in dep_names), None)
    if not tfw and (root / "pyproject.toml").exists() and "pytest" in (root / "pyproject.toml").read_text(errors="replace"):
        tfw = "pytest"
    high_fan_in = [f for f, data in graph.items() if len(data.get("imported_by", [])) >= 5]
    return {"project_root": str(root), "languages": sorted(langs), "frameworks": fws,
            "build_system": bs, "test_framework": tfw, "package_manager": pm,
            "file_count": len(files), "total_loc": tloc, "files": files, "dependencies": deps,
            "dependency_graph": graph, "high_fan_in": high_fan_in,
            "git_stats": {"hot_files": hot_files, "high_blame_density": high_blame}, "risk_summary": rs}

def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Deterministic project pre-scan: detect type, compute metrics,"
            " stratify risk. Outputs JSON to stdout."
        ),
    )
    parser.add_argument(
        "path",
        nargs="?",
        default=".",
        help="Project root directory to scan (default: current directory)",
    )
    return parser.parse_args(argv)

if __name__ == "__main__":
    args = _parse_args()
    target = Path(args.path).resolve()
    if not target.is_dir():
        print(f"Error: {target} is not a directory", file=sys.stderr); sys.exit(1)
    json.dump(scan(target), sys.stdout, indent=2); print()
