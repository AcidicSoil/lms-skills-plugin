#!/usr/bin/env python3
"""Codebase scanner that detects project metadata for badge generation.

Outputs structured JSON to stdout; warnings to stderr.
Pure stdlib — zero pip dependencies.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:
    tomllib = None  # type: ignore[assignment]

# ---------------------------------------------------------------------------
# Language map: key → (icon slug, brand hex color)
# ---------------------------------------------------------------------------
LANG_MAP: dict[str, tuple[str, str]] = {
    "python": ("python", "3776AB"),
    "javascript": ("javascript", "F7DF1E"),
    "typescript": ("typescript", "3178C6"),
    "rust": ("rust", "000000"),
    "go": ("go", "00ADD8"),
    "java": ("openjdk", "ED8B00"),
    "ruby": ("ruby", "CC342D"),
    "php": ("php", "777BB4"),
    "csharp": ("dotnet", "512BD4"),
    "swift": ("swift", "F05138"),
    "dart": ("dart", "0175C2"),
    "elixir": ("elixir", "4B275F"),
    "kotlin": ("kotlin", "7F52FF"),
}

# ---------------------------------------------------------------------------
# Framework map: dep name → (display name, icon slug | None, color | None)
# ---------------------------------------------------------------------------
FRAMEWORK_MAP: dict[str, tuple[str, str | None, str | None]] = {
    # Python
    "fastapi": ("FastAPI", "fastapi", "009688"),
    "django": ("Django", "django", "092E20"),
    "flask": ("Flask", "flask", "000000"),
    "typer": ("Typer", None, None),
    "click": ("Click", None, None),
    "fastmcp": ("FastMCP", None, None),
    "gradio": ("Gradio", None, None),
    "streamlit": ("Streamlit", "streamlit", "FF4B4B"),
    "celery": ("Celery", "celery", "37814A"),
    # JS/TS
    "react": ("React", "react", "61DAFB"),
    "vue": ("Vue.js", "vuedotjs", "4FC08D"),
    "next": ("Next.js", "nextdotjs", "000000"),
    "nuxt": ("Nuxt", "nuxt", "00DC82"),
    "express": ("Express", "express", "000000"),
    "nestjs": ("NestJS", "nestjs", "E0234E"),
    "angular": ("Angular", "angular", "DD0031"),
    "svelte": ("Svelte", "svelte", "FF3E00"),
    # Ruby
    "rails": ("Rails", "rubyonrails", "D30001"),
    "sinatra": ("Sinatra", None, "000000"),
    # PHP
    "laravel": ("Laravel", "laravel", "FF2D20"),
    "symfony": ("Symfony", "symfony", "000000"),
    # Java
    "spring-boot": ("Spring Boot", "springboot", "6DB33F"),
    # Rust
    "actix-web": ("Actix Web", None, None),
    "axum": ("Axum", None, None),
    "rocket": ("Rocket", None, None),
}

# Badge service patterns
BADGE_SERVICES = [
    "img.shields.io",
    "badgen.net",
    "forthebadge.com",
    "badge.svg",
    "codecov.io",
    "coveralls.io",
    "sonarcloud.io",
    "api.scorecard.dev",
]

DEAD_SERVICES: dict[str, str] = {
    "david-dm.org": "Use Dependabot or Renovate instead",
    "godoc.org": "Use pkg.go.dev instead",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _warn(msg: str) -> None:
    print(f"[detect] {msg}", file=sys.stderr)


def _read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def _load_toml(path: Path) -> dict | None:
    if tomllib is None:
        _warn(f"tomllib unavailable, skipping {path}")
        return None
    try:
        with open(path, "rb") as f:
            return tomllib.load(f)
    except Exception as e:
        _warn(f"Failed to parse {path}: {e}")
        return None


def _load_json(path: Path) -> dict | None:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        _warn(f"Failed to parse {path}: {e}")
        return None


_FILE_CACHE: dict[str, dict | None] = {}


def _load_toml_cached(path: Path) -> dict | None:
    key = str(path)
    if key not in _FILE_CACHE:
        _FILE_CACHE[key] = _load_toml(path)
    return _FILE_CACHE[key]


def _load_json_cached(path: Path) -> dict | None:
    key = str(path)
    if key not in _FILE_CACHE:
        _FILE_CACHE[key] = _load_json(path)
    return _FILE_CACHE[key]


def _run(cmd: list[str], cwd: Path | None = None) -> str | None:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=10, cwd=cwd)
        if r.returncode == 0:
            return r.stdout.strip()
    except Exception as e:
        _warn(f"Command failed: {' '.join(cmd)}: {e}")
    return None


def _exists(root: Path, *parts: str) -> bool:
    return (root / Path(*parts)).exists()


def _glob_any(root: Path, pattern: str) -> list[Path]:
    return list(root.glob(pattern))


# ---------------------------------------------------------------------------
# Detectors
# ---------------------------------------------------------------------------

def detect_readme(root: Path) -> dict:
    candidates = [
        ("README.md", "markdown"),
        ("readme.md", "markdown"),
        ("README.rst", "restructuredtext"),
        ("README.adoc", "asciidoc"),
        ("README.txt", None),
        ("README", None),
    ]
    for name, fmt in candidates:
        p = root / name
        if p.is_file():
            return {"path": name, "format": fmt}
    return {"path": None, "format": None}


def detect_repo(root: Path) -> dict:
    result: dict = {
        "owner": None,
        "name": None,
        "platform": None,
        "default_branch": None,
        "remote_url": None,
        "visibility": None,
    }
    try:
        url = _run(["git", "remote", "get-url", "origin"], cwd=root)
        if not url:
            # Fallback: parse .git/config
            config_path = root / ".git" / "config"
            content = _read_text(config_path)
            if content:
                m = re.search(r'\[remote "origin"\][^[]*url\s*=\s*(.+)', content, re.DOTALL)
                if m:
                    url = m.group(1).strip().split("\n")[0].strip()
        if url:
            result["remote_url"] = url
            # Parse owner/repo/platform
            # SSH: git@github.com:owner/repo.git
            # HTTPS: https://github.com/owner/repo.git
            m = re.match(r"(?:https?://|ssh://[^@]*@|git@)([^/:]+)(?::\d+)?[:/](.+?)/([^/\s]+?)(?:\.git)?/?$", url)
            if m:
                host = m.group(1).lower()
                result["owner"] = m.group(2)
                result["name"] = m.group(3)
                if "github" in host:
                    result["platform"] = "github"
                elif "gitlab" in host:
                    result["platform"] = "gitlab"
                elif "bitbucket" in host:
                    result["platform"] = "bitbucket"

        # Default branch
        head_path = root / ".git" / "HEAD"
        if head_path.is_file():
            head_content = _read_text(head_path)
            if head_content:
                # Check for refs/remotes/origin/HEAD
                remote_head = root / ".git" / "refs" / "remotes" / "origin" / "HEAD"
                if remote_head.is_file():
                    rh = _read_text(remote_head)
                    if rh:
                        m = re.match(r"ref:\s*refs/remotes/origin/(\S+)", rh)
                        if m:
                            result["default_branch"] = m.group(1)
                if not result["default_branch"]:
                    # Try packed-refs
                    packed = root / ".git" / "packed-refs"
                    if packed.is_file():
                        packed_content = _read_text(packed)
                        if packed_content:
                            m = re.search(r"ref: refs/remotes/origin/(\S+)", packed_content)
                            if m:
                                result["default_branch"] = m.group(1)
                if not result["default_branch"]:
                    m_head = re.match(r"ref:\s*refs/heads/(\S+)", head_content)
                    if m_head:
                        result["default_branch"] = m_head.group(1)

        # Visibility via gh CLI
        if result["owner"] and result["name"]:
            vis = _run(["gh", "api", f"repos/{result['owner']}/{result['name']}", "--jq", ".private"])
            if vis == "true":
                result["visibility"] = "private"
            elif vis == "false":
                result["visibility"] = "public"
    except Exception as e:
        _warn(f"repo detection error: {e}")
    return result


def detect_languages(root: Path, pkg_managers: list[dict]) -> list[dict]:
    langs: dict[str, dict] = {}
    # Infer from manifest files
    manifest_lang: dict[str, str] = {
        "pyproject.toml": "python",
        "setup.py": "python",
        "setup.cfg": "python",
        "package.json": "javascript",
        "go.mod": "go",
        "Cargo.toml": "rust",
        "Gemfile": "ruby",
        "pom.xml": "java",
        "build.gradle": "java",
        "build.gradle.kts": "java",
        "composer.json": "php",
        "mix.exs": "elixir",
        "pubspec.yaml": "dart",
        "Package.swift": "swift",
        "deno.json": "typescript",
    }
    for fname, lang in manifest_lang.items():
        if (root / fname).is_file():
            if lang in LANG_MAP:
                icon, color = LANG_MAP[lang]
                langs[lang] = {"name": lang, "icon": icon, "color": color}

    # .csproj files → csharp (check root + one level deep, avoid recursive glob)
    if _glob_any(root, "*.csproj") or _glob_any(root, "*/*.csproj"):
        icon, color = LANG_MAP["csharp"]
        langs["csharp"] = {"name": "csharp", "icon": icon, "color": color}

    # TypeScript detection from tsconfig or package.json devDeps
    if (root / "tsconfig.json").is_file():
        icon, color = LANG_MAP["typescript"]
        langs["typescript"] = {"name": "typescript", "icon": icon, "color": color}

    # Kotlin detection from Gradle Kotlin plugin
    for gf in ("build.gradle.kts", "build.gradle"):
        gf_path = root / gf
        if gf_path.is_file():
            content = _read_text(gf_path)
            if content and ("kotlin(" in content or "org.jetbrains.kotlin" in content):
                icon, color = LANG_MAP["kotlin"]
                langs["kotlin"] = {"name": "kotlin", "icon": icon, "color": color}
                break

    return list(langs.values())


def detect_package_managers(root: Path) -> list[dict]:
    managers: list[dict] = []
    try:
        # pyproject.toml
        pyp = root / "pyproject.toml"
        if pyp.is_file():
            data = _load_toml_cached(pyp)
            if data:
                name = data.get("project", {}).get("name")
                version = data.get("project", {}).get("version")
                python_requires = data.get("project", {}).get("requires-python")
                # Determine manager: uv vs poetry vs pip
                mgr = "pip"
                if data.get("tool", {}).get("uv") is not None or (root / "uv.lock").is_file():
                    mgr = "uv"
                elif data.get("tool", {}).get("poetry") is not None:
                    mgr = "poetry"
                managers.append({
                    "file": "pyproject.toml",
                    "manager": mgr,
                    "name": name,
                    "version": version,
                    "python_requires": python_requires,
                })

        # package.json
        pkg = root / "package.json"
        if pkg.is_file():
            data = _load_json_cached(pkg)
            if data:
                name = data.get("name")
                version = data.get("version")
                mgr = "npm"
                if (root / "pnpm-lock.yaml").is_file():
                    mgr = "pnpm"
                elif (root / "yarn.lock").is_file():
                    mgr = "yarn"
                elif (root / "package-lock.json").is_file():
                    mgr = "npm"
                managers.append({
                    "file": "package.json",
                    "manager": mgr,
                    "name": name,
                    "version": version,
                    "python_requires": None,
                })

        # go.mod
        gomod = root / "go.mod"
        if gomod.is_file():
            content = _read_text(gomod)
            name = None
            if content:
                m = re.search(r"^module\s+(\S+)", content, re.MULTILINE)
                if m:
                    name = m.group(1)
            managers.append({
                "file": "go.mod",
                "manager": "go",
                "name": name,
                "version": None,
                "python_requires": None,
            })

        # Cargo.toml
        cargo = root / "Cargo.toml"
        if cargo.is_file():
            data = _load_toml_cached(cargo)
            name = None
            version = None
            if data:
                pkg_section = data.get("package", {})
                name = pkg_section.get("name")
                version = pkg_section.get("version")
            managers.append({
                "file": "Cargo.toml",
                "manager": "cargo",
                "name": name,
                "version": version,
                "python_requires": None,
            })

        # Gemfile
        if (root / "Gemfile").is_file():
            managers.append({
                "file": "Gemfile",
                "manager": "bundler",
                "name": None,
                "version": None,
                "python_requires": None,
            })

        # pom.xml
        if (root / "pom.xml").is_file():
            managers.append({
                "file": "pom.xml",
                "manager": "maven",
                "name": None,
                "version": None,
                "python_requires": None,
            })

        # build.gradle / build.gradle.kts
        for gf in ("build.gradle", "build.gradle.kts"):
            if (root / gf).is_file():
                managers.append({
                    "file": gf,
                    "manager": "gradle",
                    "name": None,
                    "version": None,
                    "python_requires": None,
                })
                break

        # composer.json
        comp = root / "composer.json"
        if comp.is_file():
            data = _load_json_cached(comp)
            managers.append({
                "file": "composer.json",
                "manager": "composer",
                "name": data.get("name") if data else None,
                "version": data.get("version") if data else None,
                "python_requires": None,
            })

        # mix.exs
        if (root / "mix.exs").is_file():
            managers.append({
                "file": "mix.exs",
                "manager": "mix",
                "name": None,
                "version": None,
                "python_requires": None,
            })

        # pubspec.yaml
        if (root / "pubspec.yaml").is_file():
            managers.append({
                "file": "pubspec.yaml",
                "manager": "pub",
                "name": None,
                "version": None,
                "python_requires": None,
            })

        # Package.swift
        if (root / "Package.swift").is_file():
            managers.append({
                "file": "Package.swift",
                "manager": "swift",
                "name": None,
                "version": None,
                "python_requires": None,
            })

        # deno.json
        if (root / "deno.json").is_file():
            data = _load_json_cached(root / "deno.json")
            managers.append({
                "file": "deno.json",
                "manager": "deno",
                "name": data.get("name") if data else None,
                "version": data.get("version") if data else None,
                "python_requires": None,
            })

    except Exception as e:
        _warn(f"package_managers detection error: {e}")
    return managers


def detect_frameworks(root: Path) -> list[dict]:
    frameworks: list[dict] = []
    seen: set[str] = set()

    def _add(dep_name: str, source_file: str) -> None:
        key = dep_name.lower().replace("-", "").replace("_", "")
        for fw_key, (display, icon, color) in FRAMEWORK_MAP.items():
            if fw_key.replace("-", "") == key:
                if fw_key not in seen:
                    seen.add(fw_key)
                    frameworks.append({
                        "name": display,
                        "icon": icon,
                        "color": color,
                        "file": source_file,
                    })
                return

    try:
        # pyproject.toml
        pyp = root / "pyproject.toml"
        if pyp.is_file():
            data = _load_toml_cached(pyp)
            if data:
                deps = data.get("project", {}).get("dependencies", [])
                if isinstance(deps, list):
                    for dep in deps:
                        # Extract package name from PEP 508 string
                        m = re.match(r"([a-zA-Z0-9_-]+)", str(dep))
                        if m:
                            _add(m.group(1), "pyproject.toml")
                # Also check optional-dependencies
                opt_deps = data.get("project", {}).get("optional-dependencies", {})
                if isinstance(opt_deps, dict):
                    for group_deps in opt_deps.values():
                        if isinstance(group_deps, list):
                            for dep in group_deps:
                                m = re.match(r"([a-zA-Z0-9_-]+)", str(dep))
                                if m:
                                    _add(m.group(1), "pyproject.toml")

        # package.json
        pkg = root / "package.json"
        if pkg.is_file():
            data = _load_json_cached(pkg)
            if data:
                for section in ("dependencies", "devDependencies", "peerDependencies"):
                    deps = data.get(section, {})
                    if isinstance(deps, dict):
                        for dep_name in deps:
                            # JS packages may have @ scope
                            clean = dep_name.split("/")[-1] if "/" in dep_name else dep_name
                            _add(clean, "package.json")

        # Gemfile
        gemfile = root / "Gemfile"
        if gemfile.is_file():
            content = _read_text(gemfile)
            if content:
                for m in re.finditer(r"""gem\s+['"]([^'"]+)""", content):
                    _add(m.group(1), "Gemfile")

        # Cargo.toml
        cargo = root / "Cargo.toml"
        if cargo.is_file():
            data = _load_toml_cached(cargo)
            if data:
                for dep_name in data.get("dependencies", {}):
                    _add(dep_name, "Cargo.toml")

        # composer.json
        comp = root / "composer.json"
        if comp.is_file():
            data = _load_json_cached(comp)
            if data:
                for section in ("require", "require-dev"):
                    deps = data.get(section, {})
                    if isinstance(deps, dict):
                        for dep_name in deps:
                            clean = dep_name.split("/")[-1] if "/" in dep_name else dep_name
                            _add(clean, "composer.json")

        # pom.xml — basic regex
        pom = root / "pom.xml"
        if pom.is_file():
            content = _read_text(pom)
            if content:
                for m in re.finditer(r"<artifactId>([^<]+)</artifactId>", content):
                    _add(m.group(1), "pom.xml")

    except Exception as e:
        _warn(f"frameworks detection error: {e}")
    return frameworks


def detect_ci_cd(root: Path) -> list[dict]:
    platforms: list[dict] = []
    try:
        # GitHub Actions
        wf_dir = root / ".github" / "workflows"
        if wf_dir.is_dir():
            workflows: list[dict] = []
            for f in sorted(wf_dir.iterdir()):
                if f.suffix in (".yml", ".yaml"):
                    wf_name = None
                    content = _read_text(f)
                    if content:
                        m = re.search(r"^\s*name:\s*['\"]?(.+?)['\"]?\s*$", content, re.MULTILINE)
                        if m:
                            wf_name = m.group(1).strip()
                    workflows.append({"file": f".github/workflows/{f.name}", "name": wf_name})
            if workflows:
                platforms.append({"platform": "github-actions", "workflows": workflows})

        # Other CI systems
        ci_files: dict[str, str] = {
            ".gitlab-ci.yml": "gitlab-ci",
            ".circleci/config.yml": "circleci",
            ".travis.yml": "travis-ci",
            "Jenkinsfile": "jenkins",
            "azure-pipelines.yml": "azure-pipelines",
            "bitbucket-pipelines.yml": "bitbucket-pipelines",
        }
        for path_str, platform in ci_files.items():
            if (root / path_str).is_file():
                platforms.append({"platform": platform, "workflows": [{"file": path_str, "name": None}]})

    except Exception as e:
        _warn(f"ci_cd detection error: {e}")
    return platforms


def detect_testing(root: Path) -> dict:
    result: dict = {"frameworks": [], "coverage_tool": None}
    try:
        # pytest
        pyp = root / "pyproject.toml"
        if pyp.is_file():
            data = _load_toml_cached(pyp)
            if data and data.get("tool", {}).get("pytest"):
                result["frameworks"].append("pytest")
            if data and (data.get("tool", {}).get("coverage") or (root / ".coveragerc").is_file()):
                result["coverage_tool"] = "coverage.py"
        if (root / "pytest.ini").is_file() and "pytest" not in result["frameworks"]:
            result["frameworks"].append("pytest")

        # .coveragerc standalone
        if (root / ".coveragerc").is_file() and not result["coverage_tool"]:
            result["coverage_tool"] = "coverage.py"

        # codecov.yml
        if (root / "codecov.yml").is_file() or (root / ".codecov.yml").is_file():
            result["coverage_tool"] = "codecov"

        # jest
        for pat in ("jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.cjs"):
            if (root / pat).is_file():
                result["frameworks"].append("jest")
                break

        # vitest
        for pat in ("vitest.config.js", "vitest.config.ts", "vitest.config.mjs", "vitest.config.mts"):
            if (root / pat).is_file():
                result["frameworks"].append("vitest")
                break

    except Exception as e:
        _warn(f"testing detection error: {e}")
    return result


def detect_docs(root: Path) -> dict:
    result: dict = {"tool": None, "hosted": None}
    try:
        if (root / "mkdocs.yml").is_file():
            result["tool"] = "mkdocs"
        for pat in ("docusaurus.config.js", "docusaurus.config.ts"):
            if (root / pat).is_file():
                result["tool"] = "docusaurus"
                break
        if (root / ".readthedocs.yml").is_file() or (root / ".readthedocs.yaml").is_file():
            result["hosted"] = "readthedocs"
        if (root / "typedoc.json").is_file():
            result["tool"] = "typedoc"
    except Exception as e:
        _warn(f"docs detection error: {e}")
    return result


def detect_infrastructure(root: Path) -> dict:
    result = {"docker": False, "kubernetes": False, "terraform": False}
    try:
        if (root / "Dockerfile").is_file() or _glob_any(root, "Dockerfile.*") or _glob_any(root, "*.Dockerfile"):
            result["docker"] = True
        if (root / "docker-compose.yml").is_file() or (root / "docker-compose.yaml").is_file():
            result["docker"] = True
        if (root / "kubernetes").is_dir() or (root / "k8s").is_dir():
            result["kubernetes"] = True
        if _glob_any(root, "*.tf"):
            result["terraform"] = True
    except Exception as e:
        _warn(f"infrastructure detection error: {e}")
    return result


def detect_code_quality(root: Path) -> dict:
    result: dict = {"linters": [], "formatters": [], "type_checkers": []}
    try:
        pyp = root / "pyproject.toml"
        pyp_data = None
        dependency_names: set[str] = set()
        if pyp.is_file():
            pyp_data = _load_toml_cached(pyp)
            if pyp_data:
                def _record_dep_names(values: object) -> None:
                    if not isinstance(values, list):
                        return
                    for dep in values:
                        m = re.match(r"([a-zA-Z0-9_-]+)", str(dep))
                        if m:
                            dependency_names.add(m.group(1).lower().replace("_", "-"))

                _record_dep_names(pyp_data.get("project", {}).get("dependencies", []))
                opt_deps = pyp_data.get("project", {}).get("optional-dependencies", {})
                if isinstance(opt_deps, dict):
                    for group_deps in opt_deps.values():
                        _record_dep_names(group_deps)
                dep_groups = pyp_data.get("dependency-groups", {})
                if isinstance(dep_groups, dict):
                    for group_deps in dep_groups.values():
                        _record_dep_names(group_deps)

        # Linters
        if (root / "ruff.toml").is_file() or (pyp_data and pyp_data.get("tool", {}).get("ruff")):
            result["linters"].append("ruff")
        eslint_patterns = [".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml", ".eslintrc.yaml", ".eslintrc.cjs"]
        eslint_found = any((root / p).is_file() for p in eslint_patterns)
        if not eslint_found:
            eslint_found = bool(_glob_any(root, "eslint.config.*"))
        if eslint_found:
            result["linters"].append("eslint")
        if (root / "biome.json").is_file() or (root / "biome.jsonc").is_file():
            result["linters"].append("biome")

        # Formatters
        prettier_patterns = [".prettierrc", ".prettierrc.js", ".prettierrc.json", ".prettierrc.yml",
                             ".prettierrc.yaml", ".prettierrc.cjs", ".prettierrc.mjs", ".prettierrc.toml",
                             "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs"]
        if any((root / p).is_file() for p in prettier_patterns):
            result["formatters"].append("prettier")
        if pyp_data and pyp_data.get("tool", {}).get("black"):
            result["formatters"].append("black")

        # Type checkers
        if (
            (root / "ty.toml").is_file()
            or (pyp_data and pyp_data.get("tool", {}).get("ty") is not None)
            or "ty" in dependency_names
        ):
            result["type_checkers"].append("ty")
        if (
            (root / "mypy.ini").is_file()
            or (pyp_data and pyp_data.get("tool", {}).get("mypy") is not None)
            or "mypy" in dependency_names
        ):
            result["type_checkers"].append("mypy")
        if (root / "tsconfig.json").is_file():
            result["type_checkers"].append("typescript")

    except Exception as e:
        _warn(f"code_quality detection error: {e}")
    return result


def detect_license(root: Path) -> dict:
    result: dict = {"spdx": None, "file": None}
    try:
        # Check pyproject.toml first
        pyp = root / "pyproject.toml"
        if pyp.is_file():
            data = _load_toml_cached(pyp)
            if data:
                lic = data.get("project", {}).get("license")
                if isinstance(lic, str):
                    result["spdx"] = lic
                elif isinstance(lic, dict):
                    result["spdx"] = lic.get("text") or lic.get("file")

        # Find LICENSE file
        for name in ("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "LICENCE.txt"):
            if (root / name).is_file():
                result["file"] = name
                # Try to detect SPDX from file content if not already set
                if not result["spdx"]:
                    content = _read_text(root / name)
                    if content:
                        if "MIT License" in content or "Permission is hereby granted" in content:
                            result["spdx"] = "MIT"
                        elif "Apache License" in content and "Version 2.0" in content:
                            result["spdx"] = "Apache-2.0"
                        elif "GNU GENERAL PUBLIC LICENSE" in content:
                            if "Version 3" in content:
                                result["spdx"] = "GPL-3.0"
                            elif "Version 2" in content:
                                result["spdx"] = "GPL-2.0"
                        elif "BSD 2-Clause" in content:
                            result["spdx"] = "BSD-2-Clause"
                        elif "BSD 3-Clause" in content:
                            result["spdx"] = "BSD-3-Clause"
                        elif "ISC License" in content:
                            result["spdx"] = "ISC"
                        elif "Mozilla Public License" in content:
                            result["spdx"] = "MPL-2.0"
                        elif "The Unlicense" in content or "UNLICENSE" in content.upper():
                            result["spdx"] = "Unlicense"
                break

        # package.json fallback
        if not result["spdx"]:
            pkg = root / "package.json"
            if pkg.is_file():
                data = _load_json_cached(pkg)
                if data and "license" in data:
                    result["spdx"] = data["license"]

    except Exception as e:
        _warn(f"license detection error: {e}")
    return result


def detect_release(root: Path) -> dict:
    result = {
        "semantic_release": False,
        "changesets": False,
        "release_please": False,
        "conventional_commits": False,
        "changelog": False,
    }
    try:
        if (root / ".releaserc").is_file() or (root / ".releaserc.json").is_file() or (root / ".releaserc.yml").is_file():
            result["semantic_release"] = True
        if (root / ".changeset").is_dir():
            result["changesets"] = True
        if (root / ".release-please-manifest.json").is_file():
            result["release_please"] = True
        commit_lint_patterns = ["commitlint.config.js", "commitlint.config.cjs", "commitlint.config.mjs",
                                "commitlint.config.ts", ".commitlintrc", ".commitlintrc.json", ".commitlintrc.yml"]
        if any((root / p).is_file() for p in commit_lint_patterns):
            result["conventional_commits"] = True
        if (root / "CHANGELOG.md").is_file() or (root / "changelog.md").is_file():
            result["changelog"] = True
    except Exception as e:
        _warn(f"release detection error: {e}")
    return result


def detect_security(root: Path) -> dict:
    result = {"dependabot": False, "codeql": False, "snyk": False}
    try:
        if (root / ".github" / "dependabot.yml").is_file() or (root / ".github" / "dependabot.yaml").is_file():
            result["dependabot"] = True
        if (root / ".snyk").is_file():
            result["snyk"] = True
        # Check workflow files for codeql
        wf_dir = root / ".github" / "workflows"
        if wf_dir.is_dir():
            for f in wf_dir.iterdir():
                if f.suffix in (".yml", ".yaml"):
                    content = _read_text(f)
                    if content and "codeql" in content.lower():
                        result["codeql"] = True
                        break
    except Exception as e:
        _warn(f"security detection error: {e}")
    return result


def detect_developer_tooling(root: Path) -> dict:
    result = {"pre_commit": False, "makefile": False, "justfile": False}
    try:
        if (root / ".pre-commit-config.yaml").is_file():
            result["pre_commit"] = True
        if (root / "Makefile").is_file():
            result["makefile"] = True
        if (root / "justfile").is_file() or (root / "Justfile").is_file():
            result["justfile"] = True
    except Exception as e:
        _warn(f"developer_tooling detection error: {e}")
    return result


def detect_monorepo(root: Path) -> dict:
    result: dict = {"tool": None, "packages": [], "package_count": 0}
    try:
        if (root / "nx.json").is_file():
            result["tool"] = "nx"
        elif (root / "turbo.json").is_file():
            result["tool"] = "turbo"
        elif (root / "lerna.json").is_file():
            result["tool"] = "lerna"
        elif (root / "pnpm-workspace.yaml").is_file():
            result["tool"] = "pnpm"

        # Check pyproject.toml for uv workspace
        pyp = root / "pyproject.toml"
        if pyp.is_file():
            data = _load_toml_cached(pyp)
            if data:
                uv_ws = data.get("tool", {}).get("uv", {}).get("workspace")
                if isinstance(uv_ws, dict):
                    if not result["tool"]:
                        result["tool"] = "uv"
                    members = uv_ws.get("members", [])
                    all_pkgs: list[str] = []
                    for pattern in members:
                        # Expand glob patterns
                        matched = _glob_any(root, pattern)
                        for p in matched:
                            if p.is_dir():
                                all_pkgs.append(str(p.relative_to(root)))
                    result["package_count"] = len(all_pkgs)
                    result["packages"] = all_pkgs[:20]

        # For JS monorepo tools, try to find packages
        if result["tool"] in ("nx", "turbo", "lerna", "pnpm") and not result["packages"]:
            pkg_dir = root / "packages"
            if pkg_dir.is_dir():
                pkgs = [p.name for p in sorted(pkg_dir.iterdir()) if p.is_dir() and not p.name.startswith(".")]
                result["package_count"] = len(pkgs)
                result["packages"] = pkgs[:20]

    except Exception as e:
        _warn(f"monorepo detection error: {e}")
    return result


def detect_databases(root: Path) -> list[dict]:
    databases: list[dict] = []
    seen: set[str] = set()

    DB_MAP: dict[str, tuple[str, str, str]] = {
        "postgresql": ("postgresql", "postgresql", "4169E1"),
        "mysql": ("mysql", "mysql", "4479A1"),
        "mongodb": ("mongodb", "mongodb", "47A248"),
        "redis": ("redis", "redis", "FF4438"),
        "mariadb": ("mariadb", "mariadb", "003545"),
        "sqlite": ("sqlite", "sqlite", "003B57"),
    }

    # Map specific database drivers (not ORMs) to databases.
    # ORMs like sqlmodel/sqlalchemy/prisma are database-agnostic
    # and should not assume a specific database.
    DB_DRIVER_MAP: dict[str, str] = {
        # Python PostgreSQL drivers
        "psycopg2": "postgresql",
        "psycopg2-binary": "postgresql",
        "psycopg": "postgresql",
        "asyncpg": "postgresql",
        # Python MySQL drivers
        "pymysql": "mysql",
        "mysqlclient": "mysql",
        "aiomysql": "mysql",
        "mysql-connector-python": "mysql",
        # Python MongoDB drivers
        "pymongo": "mongodb",
        "motor": "mongodb",
        # Python Redis drivers
        "redis": "redis",
        "aioredis": "redis",
        # Python SQLite driver
        "aiosqlite": "sqlite",
        # JS/TS PostgreSQL drivers
        "pg": "postgresql",
        # JS/TS MySQL drivers
        "mysql2": "mysql",
        # JS/TS MongoDB drivers
        "mongodb": "mongodb",
        "mongoose": "mongodb",
        # JS/TS Redis drivers
        "ioredis": "redis",
    }

    def _add_db(db_name: str, source: str) -> None:
        if db_name in seen:
            return
        seen.add(db_name)
        info = DB_MAP.get(db_name, (db_name, db_name, "000000"))
        databases.append({
            "name": info[0],
            "icon": info[1],
            "color": info[2],
            "source": source,
        })

    try:
        # Check pyproject.toml dependencies
        pyp = root / "pyproject.toml"
        if pyp.is_file():
            data = _load_toml_cached(pyp)
            if data:
                deps = data.get("project", {}).get("dependencies", [])
                if isinstance(deps, list):
                    for dep in deps:
                        m = re.match(r"([a-zA-Z0-9_.-]+)", str(dep))
                        if m:
                            dep_name = m.group(1).lower().replace("-", "").replace("_", "")
                            for orm_key, db in DB_DRIVER_MAP.items():
                                if orm_key.replace(".", "").replace("-", "") == dep_name:
                                    _add_db(db, f"{orm_key} in pyproject.toml")
                                    break

        # Check package.json dependencies
        pkg = root / "package.json"
        if pkg.is_file():
            data = _load_json_cached(pkg)
            if data:
                for section in ("dependencies", "devDependencies"):
                    deps = data.get(section, {})
                    if isinstance(deps, dict):
                        for dep_name in deps:
                            clean = dep_name.split("/")[-1] if "/" in dep_name else dep_name
                            clean_lower = clean.lower().replace("-", "")
                            for orm_key, db in DB_DRIVER_MAP.items():
                                if orm_key.replace("-", "") == clean_lower:
                                    _add_db(db, f"{dep_name} in package.json")
                                    break

        # Check docker-compose for database services
        for dc_name in ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"):
            dc_path = root / dc_name
            if dc_path.is_file():
                content = _read_text(dc_path)
                if content:
                    # Simple regex to find image: lines
                    for m in re.finditer(r"image:\s*['\"]?([^'\"\s]+)", content):
                        image = m.group(1).lower()
                        for db_key in DB_MAP:
                            if db_key in image:
                                _add_db(db_key, f"{image} in {dc_name}")
                                break
                break

    except Exception as e:
        _warn(f"databases detection error: {e}")
    return databases


def detect_community(root: Path) -> dict:
    result = {
        "contributing": False,
        "code_of_conduct": False,
        "security_policy": False,
        "funding": False,
    }
    try:
        for name in ("CONTRIBUTING.md", "contributing.md", "CONTRIBUTING", "CONTRIBUTING.rst"):
            if (root / name).is_file():
                result["contributing"] = True
                break
        for name in ("CODE_OF_CONDUCT.md", "code_of_conduct.md", "CODE_OF_CONDUCT"):
            if (root / name).is_file():
                result["code_of_conduct"] = True
                break
        for name in ("SECURITY.md", "security.md", "SECURITY"):
            if (root / name).is_file():
                result["security_policy"] = True
                break
        if (root / ".github" / "FUNDING.yml").is_file():
            result["funding"] = True
    except Exception as e:
        _warn(f"community detection error: {e}")
    return result


def detect_existing_badges(root: Path, readme_info: dict) -> dict:
    result: dict = {
        "count": 0,
        "style": None,
        "badges": [],
        "has_markers": False,
        "dead_services": [],
    }
    try:
        if not readme_info.get("path"):
            return result

        content = _read_text(root / readme_info["path"])
        if not content:
            return result

        # Detect markers
        if "<!-- BADGES:START -->" in content and "<!-- BADGES:END -->" in content:
            result["has_markers"] = True

        # Find badge URLs in markdown ![...](url) format
        md_badges = re.findall(r"!\[[^\]]*\]\(([^)]+)\)", content)
        # Find badge URLs in HTML <img> format
        html_badges = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', content)

        all_urls = md_badges + html_badges
        badge_urls: list[str] = []

        for url in all_urls:
            for svc in BADGE_SERVICES:
                if svc in url:
                    badge_urls.append(url)
                    break

        result["count"] = len(badge_urls)
        result["badges"] = badge_urls

        # Extract style from first shields.io badge
        for url in badge_urls:
            if "img.shields.io" in url:
                m = re.search(r"[?&]style=([^&]+)", url)
                if m:
                    result["style"] = m.group(1)
                break

        # Detect dead services in all URLs (not just badge URLs)
        for url in all_urls:
            for dead_host, suggestion in DEAD_SERVICES.items():
                if dead_host in url:
                    result["dead_services"].append({
                        "url": url,
                        "service": dead_host,
                        "suggestion": suggestion,
                    })

    except Exception as e:
        _warn(f"existing_badges detection error: {e}")
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Scan a codebase and output metadata as JSON")
    parser.add_argument("root", nargs="?", default=".", help="Root path to scan (default: .)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        _warn(f"Not a directory: {root}")
        sys.exit(1)

    readme = detect_readme(root)
    repo = detect_repo(root)
    pkg_managers = detect_package_managers(root)
    languages = detect_languages(root, pkg_managers)
    frameworks = detect_frameworks(root)
    ci_cd = detect_ci_cd(root)
    testing = detect_testing(root)
    docs = detect_docs(root)
    infrastructure = detect_infrastructure(root)
    code_quality = detect_code_quality(root)
    license_info = detect_license(root)
    release = detect_release(root)
    security = detect_security(root)
    developer_tooling = detect_developer_tooling(root)
    monorepo = detect_monorepo(root)
    databases = detect_databases(root)
    community = detect_community(root)
    existing_badges = detect_existing_badges(root, readme)

    output = {
        "repo": repo,
        "readme": readme,
        "languages": languages,
        "package_managers": pkg_managers,
        "frameworks": frameworks,
        "ci_cd": ci_cd,
        "testing": testing,
        "docs": docs,
        "infrastructure": infrastructure,
        "code_quality": code_quality,
        "license": license_info,
        "release": release,
        "security": security,
        "developer_tooling": developer_tooling,
        "monorepo": monorepo,
        "databases": databases,
        "community": community,
        "existing_badges": existing_badges,
    }

    json.dump(output, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
