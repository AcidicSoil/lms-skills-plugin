#!/usr/bin/env bash
# tm-delete-tag.sh
# Interactive tag deletion helper for Task Master.
#
# What it does:
# 1) Shows existing tags
# 2) Prompts for a tag name
# 3) Double-confirms
# 4) Deletes the tag using: task-master delete-tag <tag> --yes
#
# Usage:
#   ./tm-delete-tag.sh
#   ./tm-delete-tag.sh <tag>
#
# Options (env):
#   TM_BIN=task-master     # override the task-master binary name/path
#   ALLOW_MASTER=1         # allow deleting the "master" tag

set -euo pipefail

TM_BIN="${TM_BIN:-task-master}"

die() { echo "Error: $*" >&2; exit 1; }

trim() {
  # trims leading/trailing whitespace without external deps
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

if ! command -v "$TM_BIN" >/dev/null 2>&1; then
  die "'$TM_BIN' not found in PATH. Install Task Master or set TM_BIN to its path."
fi

echo "Available tags:"
"$TM_BIN" tags || die "Failed to list tags."

echo

TAG="${1:-}"
if [[ -z "${TAG}" ]]; then
  read -r -p "Enter the tag to delete: " TAG
fi
TAG="$(trim "$TAG")"

if [[ -z "${TAG}" ]]; then
  die "No tag provided."
fi

if [[ "${TAG}" == "master" && "${ALLOW_MASTER:-0}" != "1" ]]; then
  die "Refusing to delete 'master' by default. Re-run with ALLOW_MASTER=1 to allow it."
fi

echo
echo "You are about to DELETE tag: '${TAG}'"
echo "This will delete the tag and all tasks under it."
echo

read -r -p "Confirm by typing the tag name again (or press Enter to cancel): " CONFIRM_1
CONFIRM_1="$(trim "$CONFIRM_1")"
if [[ "${CONFIRM_1}" != "${TAG}" ]]; then
  echo "Cancelled."
  exit 0
fi

read -r -p "Final confirm: type DELETE to proceed (or press Enter to cancel): " CONFIRM_2
CONFIRM_2="$(trim "$CONFIRM_2")"
if [[ "${CONFIRM_2}" != "DELETE" ]]; then
  echo "Cancelled."
  exit 0
fi

"$TM_BIN" delete-tag "${TAG}" --yes
echo "Deleted tag: '${TAG}'"
