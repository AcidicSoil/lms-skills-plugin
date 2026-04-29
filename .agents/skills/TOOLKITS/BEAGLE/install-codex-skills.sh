#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dest="${BEAGLE_SKILLS_DEST:-${1:-$HOME/.agents/skills}}"

mkdir -p "$dest"

plugins=(
  beagle-ai
  beagle-analysis
  beagle-core
  beagle-docs
  beagle-elixir
  beagle-go
  beagle-ios
  beagle-python
  beagle-react
  beagle-rust
  beagle-testing
)

for plugin in "${plugins[@]}"; do
  src="$repo_root/plugins/$plugin/skills"

  if [[ ! -d "$src" ]]; then
    echo "missing skills directory: $src" >&2
    exit 1
  fi

  ln -sfn "$src" "$dest/$plugin"
done

echo "Installed Beagle skills into $dest"
