# path: scripts/task-master-workflow.sh
#!/usr/bin/env bash
set -euo pipefail

# Task Master typical workflow:
#   init -> parse-prd -> analyze-complexity -> expand
#
# This script supports:
# - Flags and positional args (project dir + PRD spec)
# - PRD "spec" resolution: explicit path OR a prefix that resolves to:
#     prd.md | prd.txt | <prefix>.prd.md | <prefix>.prd.txt
#   in common locations (repo root, .taskmaster/docs, docs)

usage() {
  cat <<'EOF'
Usage:
  scripts/task-master-workflow.sh [options] [--] [<prd>|<project-dir>] [<prd>|<project-dir>]

Positional args (optional):
  If one arg is provided:
    - If it's a directory, it's treated as <project-dir>
    - Otherwise it's treated as <prd>
  If two args are provided:
    - If either is a directory, that one becomes <project-dir> and the other becomes <prd>
    - Otherwise defaults to: <prd> then <project-dir>

PRD resolution:
  <prd> can be:
    - An existing file path (e.g., docs/prd.md)
    - A prefix (e.g., "foo") that resolves to:
        foo.prd.md, foo.prd.txt
      also searched under:
        .taskmaster/docs/, docs/, and repo root
  If <prd> is omitted, the script will try (in order):
    1) .taskmaster/docs/prd.md
    2) .taskmaster/docs/prd.txt
    3) if exactly one exists: .taskmaster/docs/*.prd.md|*.prd.txt
       otherwise, it errors and prints candidates (or use --choose-prd).

Notes:
  A bare "--" ends option parsing; anything after is treated as positional, even if it starts with "-".

Options:
  --project-dir <dir>     Project root (default: current directory)
  --prd <spec>            PRD spec (path or prefix). See PRD resolution above.
  --choose-prd            If multiple PRDs match, prompt to choose interactively.
  --rules <csv>           Pass-through for init: --rules cursor,windsurf,vscode
  --num-tasks <n>         Pass-through for parse-prd: --num-tasks=<n> (0 = auto)
  --research              Enable research mode where supported (default: on)
  --no-research           Disable research mode
  --force-init            Run init even if .taskmaster already exists
  --models-setup          Run: task-master models --setup (interactive) after init
  --force-expand          Pass-through for expand: --force (regenerate subtasks)
  --bin <cmd>             Override binary (e.g., task-master or tm)
  -h, --help              Show help

Examples:
  scripts/task-master-workflow.sh --prd docs/prd.md
  scripts/task-master-workflow.sh docs/prd.md
  scripts/task-master-workflow.sh --prd foo            # resolves foo.prd.md/txt (common dirs)
  scripts/task-master-workflow.sh /path/to/repo foo    # project-dir + PRD prefix
  scripts/task-master-workflow.sh --choose-prd         # interactive if multiple candidates
  scripts/task-master-workflow.sh -- --weird-prd-name-starts-with-dash.md
EOF
}

PROJECT_DIR="$(pwd)"
PRD_SPEC=""
RULES_CSV=""
NUM_TASKS=""
RESEARCH=1
FORCE_INIT=0
MODELS_SETUP=0
FORCE_EXPAND=0
CHOOSE_PRD=0
TM_BIN=""
POSITIONALS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-dir)
      if [[ $# -lt 2 ]]; then echo "ERROR: --project-dir requires a value" >&2; usage; exit 2; fi
      PROJECT_DIR="$2"; shift 2
      ;;
    --prd)
      if [[ $# -lt 2 ]]; then echo "ERROR: --prd requires a value" >&2; usage; exit 2; fi
      PRD_SPEC="$2"; shift 2
      ;;
    --choose-prd) CHOOSE_PRD=1; shift ;;
    --rules)
      if [[ $# -lt 2 ]]; then echo "ERROR: --rules requires a value" >&2; usage; exit 2; fi
      RULES_CSV="$2"; shift 2
      ;;
    --num-tasks)
      if [[ $# -lt 2 ]]; then echo "ERROR: --num-tasks requires a value" >&2; usage; exit 2; fi
      NUM_TASKS="$2"; shift 2
      ;;
    --research) RESEARCH=1; shift ;;
    --no-research) RESEARCH=0; shift ;;
    --force-init) FORCE_INIT=1; shift ;;
    --models-setup) MODELS_SETUP=1; shift ;;
    --force-expand) FORCE_EXPAND=1; shift ;;
    --bin)
      if [[ $# -lt 2 ]]; then echo "ERROR: --bin requires a value" >&2; usage; exit 2; fi
      TM_BIN="$2"; shift 2
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do
        POSITIONALS+=("$1")
        shift
      done
      ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 2 ;;
    *) POSITIONALS+=("$1"); shift ;;
  esac
done

# Apply positional args (positional overrides flags for the same value).
if [[ ${#POSITIONALS[@]} -eq 1 ]]; then
  if [[ -d "${POSITIONALS[0]}" ]]; then
    PROJECT_DIR="${POSITIONALS[0]}"
  else
    PRD_SPEC="${POSITIONALS[0]}"
  fi
elif [[ ${#POSITIONALS[@]} -eq 2 ]]; then
  if [[ -d "${POSITIONALS[0]}" ]]; then
    PROJECT_DIR="${POSITIONALS[0]}"
    PRD_SPEC="${POSITIONALS[1]}"
  elif [[ -d "${POSITIONALS[1]}" ]]; then
    PRD_SPEC="${POSITIONALS[0]}"
    PROJECT_DIR="${POSITIONALS[1]}"
  else
    PRD_SPEC="${POSITIONALS[0]}"
    PROJECT_DIR="${POSITIONALS[1]}"
  fi
elif [[ ${#POSITIONALS[@]} -gt 2 ]]; then
  echo "ERROR: Too many positional arguments: ${POSITIONALS[*]}" >&2
  usage
  exit 2
fi

cd "$PROJECT_DIR"

# Resolve Task Master executable.
# Preference order:
#  1) --bin override
#  2) task-master on PATH
#  3) tm on PATH (some setups alias it)
#  4) npx --no-install task-master (for local node_modules/.bin)
TM=()
if [[ -n "${TM_BIN}" ]]; then
  TM=("${TM_BIN}")
elif command -v task-master >/dev/null 2>&1; then
  TM=("task-master")
elif command -v tm >/dev/null 2>&1; then
  TM=("tm")
elif command -v npx >/dev/null 2>&1; then
  TM=("npx" "--no-install" "task-master")
else
  echo "ERROR: Could not find task-master (or tm) and npx is unavailable." >&2
  echo "Install Task Master (npm package: task-master-ai) or run from a project with local install." >&2
  exit 1
fi

supports_flag() {
  # supports_flag <subcommand> <flag>
  # Uses '--help' output; safe for scripting. If help fails, returns false.
  local sub="$1"
  local flag="$2"
  if "${TM[@]}" "${sub}" --help >/dev/null 2>&1; then
    "${TM[@]}" "${sub}" --help 2>&1 | grep -qE -- "(^|[[:space:]])${flag}([=,[:space:]]|$)"
  else
    return 1
  fi
}

run_step() {
  local label="$1"; shift
  echo "==> ${label}"
  echo "+ $*"
  "$@"
  echo
}

dedupe_paths() {
  # Prints unique paths in input order.
  # Uses an associative array (Bash 4+).
  local -A seen=()
  local -a uniq=()
  local p=""
  for p in "$@"; do
    if [[ -z "${seen[$p]+x}" ]]; then
      uniq+=("$p")
      seen["$p"]=1
    fi
  done
  printf '%s\n' "${uniq[@]}"
}

resolve_prd() {
  # resolve_prd <spec> <choose_flag>
  # spec: empty | existing file path | prefix
  # choose_flag: 0|1 (interactive select when ambiguous)
  local spec="${1:-}"
  local choose="${2:-0}"

  local -a candidates=()

  add_if_file() {
    local p="$1"
    if [[ -f "$p" ]]; then
      candidates+=("$p")
    fi
  }

  # If spec is an existing file path, use it immediately.
  if [[ -n "$spec" && -f "$spec" ]]; then
    echo "$spec"
    return 0
  fi

  # Add common resolution variants for a base name in a directory.
  add_variants_in_dir() {
    local dir="$1"
    local base="$2"

    # Prefer Markdown over txt when both exist.
    add_if_file "${dir%/}/${base}.prd.md"
    add_if_file "${dir%/}/${base}.prd.txt"
    add_if_file "${dir%/}/${base}.md"
    add_if_file "${dir%/}/${base}.txt"
    add_if_file "${dir%/}/${base}"
  }

  if [[ -n "$spec" ]]; then
    # If spec looks like a path (contains '/'), still try common suffixes next to it.
    if [[ "$spec" == */* ]]; then
      add_if_file "${spec}.prd.md"
      add_if_file "${spec}.prd.txt"
      add_if_file "${spec}.md"
      add_if_file "${spec}.txt"
      add_if_file "$spec"
    else
      # Treat as prefix and search common locations.
      add_variants_in_dir "." "$spec"
      add_variants_in_dir ".taskmaster/docs" "$spec"
      add_variants_in_dir "docs" "$spec"
    fi
  else
    # No spec: try conventional defaults first.
    add_if_file ".taskmaster/docs/prd.md"
    add_if_file ".taskmaster/docs/prd.txt"

    # If still not found, consider *.prd.{md,txt} in .taskmaster/docs.
    if [[ ${#candidates[@]} -eq 0 && -d ".taskmaster/docs" ]]; then
      local -a found=()
      while IFS= read -r line; do
        found+=("$line")
      done < <(find ".taskmaster/docs" -maxdepth 1 -type f \( -name "*.prd.md" -o -name "*.prd.txt" \) 2>/dev/null | sort)

      if [[ ${#found[@]} -eq 1 ]]; then
        candidates+=("${found[0]}")
      elif [[ ${#found[@]} -gt 1 ]]; then
        candidates+=("${found[@]}")
      fi
    fi
  fi

  # Dedupe while preserving order.
  local -a uniq=()
  while IFS= read -r line; do
    uniq+=("$line")
  done < <(dedupe_paths "${candidates[@]}")

  if [[ ${#uniq[@]} -eq 0 ]]; then
    if [[ -n "$spec" ]]; then
      echo "ERROR: No PRD matches for spec: ${spec}" >&2
      echo "Tried: ${spec}, ${spec}.prd.md/.prd.txt, ${spec}.md/.txt in: repo root, .taskmaster/docs, docs" >&2
    else
      echo "ERROR: No PRD found." >&2
      echo "Tried: .taskmaster/docs/prd.md, .taskmaster/docs/prd.txt, and .taskmaster/docs/*.prd.md|*.prd.txt" >&2
    fi
    exit 1
  fi

  if [[ ${#uniq[@]} -eq 1 ]]; then
    echo "${uniq[0]}"
    return 0
  fi

  # Ambiguous.
  if [[ "$choose" -eq 1 ]]; then
    echo "Multiple PRDs found. Choose one:" >&2
    local PS3="Select PRD file: "
    select opt in "${uniq[@]}"; do
      if [[ -n "${opt:-}" ]]; then
        echo "$opt"
        break
      fi
      echo "Invalid selection." >&2
    done
  else
    echo "ERROR: Multiple PRDs match. Specify one with --prd <path> or a more specific prefix, or use --choose-prd." >&2
    printf '  - %s\n' "${uniq[@]}" >&2
    exit 2
  fi
}

# 1) init
if [[ ${FORCE_INIT} -eq 1 || ! -d ".taskmaster" ]]; then
  INIT_ARGS=()
  if [[ -n "${RULES_CSV}" ]]; then
    INIT_ARGS+=(--rules "${RULES_CSV}")
  fi
  run_step "task-master init" "${TM[@]}" init "${INIT_ARGS[@]}"
else
  echo "==> task-master init (skipped: .taskmaster already exists)"
  echo
fi

# Optional: configure models (interactive).
if [[ ${MODELS_SETUP} -eq 1 ]]; then
  run_step "task-master models --setup (interactive)" "${TM[@]}" models --setup
fi

# Resolve/validate PRD before parsing.
PRD_PATH="$(resolve_prd "${PRD_SPEC}" "${CHOOSE_PRD}")"
if [[ ! -f "${PRD_PATH}" ]]; then
  echo "ERROR: PRD file not found after resolution: ${PRD_PATH}" >&2
  exit 1
fi

# 2) parse-prd
# Docs show positional PRD file. Some versions also accept --input=...; detect if present.
PARSE_ARGS=()
if supports_flag "parse-prd" "--input"; then
  PARSE_ARGS+=(--input="${PRD_PATH}")
else
  PARSE_ARGS+=("${PRD_PATH}")
fi
if [[ -n "${NUM_TASKS}" ]]; then
  PARSE_ARGS+=(--num-tasks="${NUM_TASKS}")
fi

# Research flag: only pass if the subcommand supports it.
if [[ ${RESEARCH} -eq 1 ]] && supports_flag "parse-prd" "--research"; then
  PARSE_ARGS+=(--research)
fi

run_step "task-master parse-prd" "${TM[@]}" parse-prd "${PARSE_ARGS[@]}"

# 3) analyze-complexity
ANALYZE_ARGS=()
if [[ ${RESEARCH} -eq 1 ]]; then
  ANALYZE_ARGS+=(--research)
fi
run_step "task-master analyze-complexity" "${TM[@]}" analyze-complexity "${ANALYZE_ARGS[@]}"

# 4) expand
EXPAND_ARGS=(--all)
if [[ ${FORCE_EXPAND} -eq 1 ]]; then
  EXPAND_ARGS+=(--force)
fi
if [[ ${RESEARCH} -eq 1 ]]; then
  EXPAND_ARGS+=(--research)
fi
run_step "task-master expand" "${TM[@]}" expand "${EXPAND_ARGS[@]}"

echo "Done. Next typical commands: task-master list, task-master next, task-master show <id>." >&2
