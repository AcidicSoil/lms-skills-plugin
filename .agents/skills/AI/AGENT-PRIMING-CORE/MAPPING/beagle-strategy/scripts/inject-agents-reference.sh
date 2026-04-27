#!/usr/bin/env bash
set -euo pipefail

BUNDLE_DIR="${1:-}"
TARGET_FILE="${2:-AGENTS.md}"
TARGET_KIND="${3:-}"

if [ -z "$BUNDLE_DIR" ]; then
  echo "Usage: plugins/beagle-strategy/scripts/inject-agents-reference.sh <bundle-dir> [target-file] [target-kind]" >&2
  exit 1
fi

BLOCK_FILE="$BUNDLE_DIR/agent-instruction-block.md"
TARGETS_FILE="$BUNDLE_DIR/agent-instruction-targets.json"
REFERENCE_FILE="$BUNDLE_DIR/agents-reference.md"

for required_file in "$BLOCK_FILE" "$TARGETS_FILE" "$REFERENCE_FILE"; do
  if [ ! -f "$required_file" ]; then
    echo "Missing generated artifact: $required_file" >&2
    exit 1
  fi
done

mkdir -p "$(dirname "$TARGET_FILE")"

python3 - "$BUNDLE_DIR" "$TARGET_FILE" "$TARGET_KIND" <<'PY'
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

bundle_dir = Path(sys.argv[1])
target_file = Path(sys.argv[2])
target_kind = sys.argv[3].strip().lower()

canonical_block = (bundle_dir / 'agent-instruction-block.md').read_text(encoding='utf-8').strip()
target_rules = json.loads((bundle_dir / 'agent-instruction-targets.json').read_text(encoding='utf-8'))
version = target_rules.get('managed_block', {}).get('version') or target_rules.get('schema_version', '1.0')

def infer_target_kind(path: Path) -> str:
    normalized = path.as_posix().lower()
    name = path.name.lower()
    if name == 'claude.md':
        return 'claude'
    if name == 'hermes.md':
        return 'hermes'
    if normalized.endswith('.codex/agents.md'):
        return 'codex'
    if normalized.endswith('.pi/agents.md'):
        return 'pi'
    return 'agents'

kind = target_kind or infer_target_kind(target_file)
if kind not in target_rules['targets']:
    valid = ', '.join(sorted(target_rules['targets']))
    raise SystemExit(f"Unsupported target kind: {kind}. Expected one of: {valid}")

spec = target_rules['targets'][kind]
begin_marker = f"<!-- BEGIN beagle-strategy:managed-block target={kind} version={version} -->"
end_marker = '<!-- END beagle-strategy:managed-block -->'

sections: list[str] = []
sections.extend(spec.get('prelude') or [])
sections.append('## Beagle Strategy')
sections.append(canonical_block)
sections.extend(spec.get('appendix') or [])
managed_block = '\n\n'.join(section.rstrip() for section in sections if section and section.strip())

existing = target_file.read_text(encoding='utf-8') if target_file.exists() else ''
existing = re.sub(r'<!-- BEGIN beagle-strategy:managed-block target=.*?version=.*? -->[\s\S]*?<!-- END beagle-strategy:managed-block -->\n?', '', existing, flags=re.MULTILINE)
existing = existing.rstrip()
rendered = f"{begin_marker}\n{managed_block}\n{end_marker}\n"
if existing:
    rendered = f"{existing}\n\n{rendered}"

target_file.write_text(rendered, encoding='utf-8')
print(f"Injected managed Beagle strategy block into {target_file} for target kind {kind}")
PY
