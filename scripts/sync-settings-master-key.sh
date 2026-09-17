#!/usr/bin/env bash
set -euo pipefail

# Sync SETTINGS_MASTER_KEY to all 3 English Mastery Cloudflare Workers:
#   1) main web Worker
#   2) task-runner Worker
#   3) syllabus-monitor Worker
#
# Run from the English Mastery project root.

ROOT_CONFIG="${ROOT_CONFIG:-wrangler.jsonc}"
TASK_RUNNER_CONFIG="${TASK_RUNNER_CONFIG:-workers/task-runner/wrangler.jsonc}"
SYLLABUS_MONITOR_CONFIG="${SYLLABUS_MONITOR_CONFIG:-workers/syllabus-monitor/wrangler.jsonc}"

SECRET_NAME="SETTINGS_MASTER_KEY"

command -v npx >/dev/null 2>&1 || {
  echo "ERROR: npx is not installed or not in PATH." >&2
  exit 1
}

for f in "$ROOT_CONFIG" "$TASK_RUNNER_CONFIG" "$SYLLABUS_MONITOR_CONFIG"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: Wrangler config not found: $f" >&2
    echo "Run this script from the English Mastery project root." >&2
    exit 1
  fi
done

if [[ -n "${SETTINGS_MASTER_KEY:-}" ]]; then
  KEY="$SETTINGS_MASTER_KEY"
  echo "Using SETTINGS_MASTER_KEY from the current environment."
else
  echo "Enter the SETTINGS_MASTER_KEY that must be identical on all 3 Workers."
  read -r -s -p "SETTINGS_MASTER_KEY: " KEY
  echo
  read -r -s -p "Confirm key:         " KEY_CONFIRM
  echo

  if [[ "$KEY" != "$KEY_CONFIRM" ]]; then
    echo "ERROR: The two values do not match." >&2
    exit 1
  fi
fi

if [[ -z "$KEY" ]]; then
  echo "ERROR: SETTINGS_MASTER_KEY cannot be empty." >&2
  exit 1
fi

# Basic sanity check only. Existing deployments may use a different valid length,
# so warn rather than fail.
if (( ${#KEY} < 32 )); then
  echo "WARNING: SETTINGS_MASTER_KEY is shorter than 32 characters."
  read -r -p "Continue anyway? [y/N] " ANSWER
  case "$ANSWER" in
    y|Y|yes|YES) ;;
    *) echo "Cancelled."; exit 1 ;;
  esac
fi

put_secret() {
  local label="$1"
  local config="$2"

  echo
  echo "==> Setting $SECRET_NAME on $label"
  printf '%s' "$KEY" | npx wrangler secret put "$SECRET_NAME" --config "$config"
}

put_secret "main web Worker" "$ROOT_CONFIG"
put_secret "task-runner Worker" "$TASK_RUNNER_CONFIG"
put_secret "syllabus-monitor Worker" "$SYLLABUS_MONITOR_CONFIG"

unset KEY
unset KEY_CONFIRM 2>/dev/null || true

echo
echo "SUCCESS: $SECRET_NAME has been submitted to all 3 Workers."
echo
echo "Important:"
echo "  - All three Workers now receive the same SETTINGS_MASTER_KEY value."
echo "  - If this key differs from the key previously used to encrypt managed"
echo "    integration secrets in D1, re-save ModelBridge / YouTube / Azure keys"
echo "    in the admin UI so they are encrypted with this key."
echo "  - Re-run or retry failed queue jobs after deployment/config propagation."
