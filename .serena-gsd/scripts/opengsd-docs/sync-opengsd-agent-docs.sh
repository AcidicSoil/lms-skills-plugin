#!/usr/bin/env bash
set -euo pipefail

ROOT="${OPENGSD_AGENT_DOCS_ROOT:-${OPENGSD_DOCS_ROOT:-$HOME/agent-docs/opengsd}}"
PORT="${2:-8787}"
SERVE="false"
if [[ "${1:-}" == "--serve" ]]; then
  SERVE="true"
  PORT="${2:-8787}"
fi

CORE_REPO="$ROOT/gsd-core"
BROWSER_REPO="$ROOT/gsd-browser"

update_repo() {
  local name="$1"
  local url="$2"
  local dir="$3"

  echo "==> Updating $name"
  if [[ -d "$dir/.git" ]]; then
    git -C "$dir" fetch origin
    git -C "$dir" reset --hard origin/main
    git -C "$dir" clean -fd
  else
    git clone "$url" "$dir"
  fi
}

prune_non_english_core_docs() {
  local docs_dir="$CORE_REPO/docs"
  [[ -d "$docs_dir" ]] || return 0

  echo "==> Pruning non-English GSD Core docs"

  # Match the local opengsd-docs.bash behavior, while also pruning any future
  # locale directories that follow the same xx-YY naming pattern. English docs
  # live at the root docs/ tree; keep explicit English locale directories if
  # upstream ever adds them.
  find "$docs_dir" -mindepth 1 -maxdepth 1 -type d \
    | while IFS= read -r locale_dir; do
        local base
        base="$(basename "$locale_dir")"
        case "$base" in
          en|en-US|en-GB) ;;
          [a-z][a-z]-[A-Z][A-Z]) rm -rf "$locale_dir" ;;
        esac
      done
}

sync_live_docs_mirror() {
  echo "==> Syncing docs.opengsd.net markdown mirror"
  mkdir -p "$ROOT/site-md"
  curl -fsSL https://docs.opengsd.net/llms.txt -o "$ROOT/llms.txt"

  grep -oE 'https://docs\.opengsd\.net/[^) ]+' "$ROOT/llms.txt" \
    | sed 's/[.,]$//' \
    | sort -u \
    | while read -r url; do
        path="${url#https://docs.opengsd.net/}"
        mkdir -p "$ROOT/site-md/$(dirname "$path")"
        curl -fsSL "$url" -o "$ROOT/site-md/$path" || true
      done
}

sync_qmd_collections() {
  if ! command -v qmd >/dev/null 2>&1; then
    echo "==> qmd not found; skipping QMD collection refresh"
    return 0
  fi

  echo "==> Resetting QMD collections"
  qmd collection remove gsd-core 2>/dev/null || true
  qmd collection remove gsd-browser 2>/dev/null || true

  echo "==> Adding English-only GSD Core collection"
  qmd collection add "$CORE_REPO" \
    --name gsd-core \
    --mask '{README.md,AGENTS.md,ARCHITECTURE.md,BETA.md,COMMANDS.md,CONFIGURATION.md,docs/**/*.md,commands/**/*.md,agents/**/*.md,skills/**/*.md,**/SKILL.md,**/AGENT.md}'

  echo "==> Adding GSD Browser collection"
  qmd collection add "$BROWSER_REPO" \
    --name gsd-browser \
    --mask '{README.md,docs/**/*.md,**/SKILL.md,gsd-browser-skill/**/*.md}'

  echo "==> Forcing QMD index update"
  qmd update
}

write_index() {
  cat > "$ROOT/index.html" <<'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>OpenGSD Local Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
  <h1>OpenGSD Local Docs</h1>

  <h2>Live Docs Mirror</h2>
  <ul>
    <li><a href="./site-md/core/introduction.md">GSD Core Introduction</a></li>
    <li><a href="./site-md/core/concepts/workflow.md">GSD Core Workflow</a></li>
    <li><a href="./site-md/browser/introduction.md">GSD Browser Introduction</a></li>
    <li><a href="./site-md/browser/concepts/mcp-server.md">GSD Browser MCP Server</a></li>
    <li><a href="./site-md/browser/guides/ai-agent-setup.md">GSD Browser Agent Setup</a></li>
    <li><a href="./site-md/browser/guides/live-viewer.md">GSD Browser Live Viewer</a></li>
  </ul>

  <h2>Source Repos</h2>
  <ul>
    <li><a href="./gsd-core/README.md">GSD Core README</a></li>
    <li><a href="./gsd-browser/README.md">GSD Browser README</a></li>
    <li><a href="./gsd-browser/docs/AGENT-BEST-PRACTICES.md">GSD Browser Agent Best Practices</a></li>
    <li><a href="./gsd-browser/SKILL.md">GSD Browser SKILL.md</a></li>
  </ul>
</body>
</html>
HTML
}

mkdir -p "$ROOT"

sync_live_docs_mirror
update_repo "GSD Core" "https://github.com/open-gsd/gsd-core.git" "$CORE_REPO"
update_repo "GSD Browser" "https://github.com/open-gsd/gsd-browser.git" "$BROWSER_REPO"
prune_non_english_core_docs
sync_qmd_collections
write_index

printf 'OpenGSD agent docs synced at %s\n' "$ROOT"
printf 'Open %s/index.html directly, or serve it with: python3 -m http.server 8787 --directory %s\n' "$ROOT" "$ROOT"

if [[ "$SERVE" == "true" ]]; then
  python3 -m http.server "$PORT" --directory "$ROOT"
fi
