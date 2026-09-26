#!/usr/bin/env bash
set -Eeuo pipefail

# English Mastery V0.9.0 R25 - Cloudflare Free-first deploy/update helper.
# First run provisions D1 + R2, patches Wrangler configs, applies migrations,
# deploys the web Worker + syllabus monitor, then configures Worker secrets.
# Later runs reuse the same resources and perform an in-place update.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_WORKER="english-mastery"
MONITOR_WORKER="english-mastery-syllabus-monitor"
TASK_WORKER="english-mastery-task-runner"
QUEUE_NAME="english-mastery-jobs"
DLQ_NAME="english-mastery-jobs-dlq"
DB_NAME="english-mastery"
R2_BUCKET="english-mastery-media"
MAIN_CONFIG="$ROOT_DIR/wrangler.jsonc"
MONITOR_CONFIG="$ROOT_DIR/workers/syllabus-monitor/wrangler.jsonc"
TASK_CONFIG="$ROOT_DIR/workers/task-runner/wrangler.jsonc"
STATE_FILE="$ROOT_DIR/.deploy.env"
MODE="deploy"
NON_INTERACTIVE=0
SKIP_INSTALL=0
SKIP_BUILD=0

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy.sh [deploy|update|status] [options]

Commands:
  deploy    First deploy or idempotent redeploy (default)
  update    Reuse existing resources, apply migrations, build and redeploy
  status    Show Cloudflare identity, configured resources and migration state

Options:
  --non-interactive  Do not prompt; required values must come from env/.deploy.env
  --skip-install     Skip npm install
  --skip-build       Skip local OpenNext build verification before deploy
  -h, --help         Show this help

Optional environment variables (also persisted in .deploy.env except secrets):
  MODELBRIDGE_CHAT_MODEL      optional platform fallback; configure in Platform > Integrations
  MODELBRIDGE_BASE_URL
  MODELBRIDGE_STT_MODEL      optional; /v1/audio/transcriptions
  MODELBRIDGE_TTS_MODEL      optional; /v1/audio/speech
  MODELBRIDGE_TTS_VOICE      optional; defaults to alloy
  AZURE_SPEECH_REGION        optional; enables acoustic pronunciation with AZURE_SPEECH_KEY
  MODELBRIDGE_API_KEY       optional legacy fallback secret; managed Platform settings preferred
  ADMIN_MONITOR_TOKEN      secret; never persisted by this script
  ADMIN_ACCESS_TOKEN       platform-operator password for /platform; never persisted by this script
  YOUTUBE_API_KEY          optional secret; enables public YouTube channel discovery
  AZURE_SPEECH_KEY         optional legacy fallback secret; managed Platform settings preferred
  SETTINGS_MASTER_KEY      bootstrap secret for encrypted Platform/Tenant settings; auto-generated

Cloudflare Free profile:
  Required: Workers, D1, R2 Standard, Queues, Cron
  Removed:  Workers KV, Workflows
  Queue:    persistent background generation; 24h retention on Free
  Email:    SMTP is configured after deploy in Platform > Integrations (use 465/587, not port 25)
EOF
}

log(){ printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die(){ printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }
have(){ command -v "$1" >/dev/null 2>&1; }

while (($#)); do
  case "$1" in
    deploy|update|status) MODE="$1" ;;
    --non-interactive) NON_INTERACTIVE=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
  shift
done

have node || die "Node.js is required (Node 22+)."
have npm || die "npm is required."
have python3 || die "python3 is required."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 22 )) || die "Node 22+ is required; found $(node -v)."

# Load non-secret local deployment state if present.
if [[ -f "$STATE_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  set +a
fi

MODELBRIDGE_BASE_URL="${MODELBRIDGE_BASE_URL:-https://ai.wisewavesg.com}"

prompt_value(){
  local var_name="$1" prompt="$2" default_value="${3:-}" secret="${4:-false}" current="${!var_name:-}"
  [[ -n "$current" ]] && return 0
  if (( NON_INTERACTIVE )); then
    [[ -n "$default_value" ]] && printf -v "$var_name" '%s' "$default_value" && export "$var_name" && return 0
    return 1
  fi
  local value
  if [[ "$secret" == "true" ]]; then
    read -r -s -p "$prompt" value; printf '\n'
  else
    if [[ -n "$default_value" ]]; then read -r -p "$prompt [$default_value]: " value; value="${value:-$default_value}"
    else read -r -p "$prompt: " value; fi
  fi
  printf -v "$var_name" '%s' "$value"
  export "$var_name"
}

persist_state(){
  umask 077
  cat > "$STATE_FILE" <<EOF
D1_DATABASE_ID=${D1_DATABASE_ID:-}
MODELBRIDGE_BASE_URL=${MODELBRIDGE_BASE_URL}
MODELBRIDGE_CHAT_MODEL=${MODELBRIDGE_CHAT_MODEL:-}
MODELBRIDGE_STT_MODEL=${MODELBRIDGE_STT_MODEL:-}
MODELBRIDGE_TTS_MODEL=${MODELBRIDGE_TTS_MODEL:-}
MODELBRIDGE_TTS_VOICE=${MODELBRIDGE_TTS_VOICE:-alloy}
AZURE_SPEECH_REGION=${AZURE_SPEECH_REGION:-}
EOF
  chmod 600 "$STATE_FILE"
}

wrangler(){ npx --no-install wrangler "$@"; }

required_node_bins(){
  local bins=(wrangler)
  if (( ! SKIP_BUILD )); then
    bins+=(tsc next opennextjs-cloudflare)
  fi
  printf '%s\n' "${bins[@]}"
}

node_deps_ready(){
  [[ -d node_modules ]] || return 1
  local bin
  while IFS= read -r bin; do
    [[ -x "node_modules/.bin/$bin" ]] || return 1
  done < <(required_node_bins)
  return 0
}

install_deps(){
  if node_deps_ready; then
    log "Required npm dependencies are present; dependency install skipped."
    return
  fi

  local missing=()
  local bin
  while IFS= read -r bin; do
    [[ -x "node_modules/.bin/$bin" ]] || missing+=("$bin")
  done < <(required_node_bins)

  if (( SKIP_INSTALL )); then
    die "--skip-install was requested, but required npm commands are missing: ${missing[*]}. Run npm run deps:install (or npm install --include=dev) and retry."
  fi

  warn "node_modules is missing or incomplete; required npm commands missing: ${missing[*]}. Reinstalling dependencies including devDependencies..."
  if [[ -x scripts/install-deps-resilient.sh ]]; then
    bash scripts/install-deps-resilient.sh
  else
    npm install --include=dev --no-audit --no-fund
  fi

  if ! node_deps_ready; then
    missing=()
    while IFS= read -r bin; do
      [[ -x "node_modules/.bin/$bin" ]] || missing+=("$bin")
    done < <(required_node_bins)
    die "Dependency installation completed but required npm commands are still missing: ${missing[*]}. Check NODE_ENV/npm_config_omit and the npm registry, then retry."
  fi
}

ensure_login(){
  log "Checking Cloudflare login..."
  wrangler whoami >/dev/null || die "Cloudflare login missing. Run: npx wrangler login"
}

get_existing_db_id(){
  python3 - <<'PY' 2>/dev/null || true
import json, subprocess
name='english-mastery'
try:
    p=subprocess.run(['npx','--no-install','wrangler','d1','list','--json'],text=True,capture_output=True,check=True)
    rows=json.loads(p.stdout)
    if isinstance(rows,dict): rows=rows.get('result',rows.get('databases',[]))
    for r in rows:
        if r.get('name')==name:
            print(r.get('uuid') or r.get('id') or '')
            break
except Exception:
    pass
PY
}

ensure_d1(){
  if [[ -n "${D1_DATABASE_ID:-}" && "$D1_DATABASE_ID" != REPLACE_WITH_* ]]; then
    log "Using configured D1: $DB_NAME ($D1_DATABASE_ID)"
    return
  fi
  local existing
  existing="$(get_existing_db_id | tail -n1)"
  if [[ -n "$existing" ]]; then
    D1_DATABASE_ID="$existing"; export D1_DATABASE_ID
    log "Found existing D1: $DB_NAME ($D1_DATABASE_ID)"
    return
  fi
  [[ "$MODE" != "update" ]] || die "D1 '$DB_NAME' does not exist; run ./scripts/deploy.sh deploy first."
  log "Creating D1 database '$DB_NAME' with APAC location hint..."
  local out
  out="$(wrangler d1 create "$DB_NAME" --location=apac 2>&1 | tee /dev/stderr)"
  D1_DATABASE_ID="$(printf '%s\n' "$out" | grep -Eo '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' | tail -n1 || true)"
  [[ -n "$D1_DATABASE_ID" ]] || D1_DATABASE_ID="$(get_existing_db_id | tail -n1)"
  [[ -n "$D1_DATABASE_ID" ]] || die "D1 created but database_id could not be discovered."
  export D1_DATABASE_ID
}

ensure_r2(){
  local list
  list="$(wrangler r2 bucket list 2>/dev/null || true)"
  if printf '%s\n' "$list" | grep -Fq "$R2_BUCKET"; then
    log "R2 bucket exists: $R2_BUCKET"
    return
  fi
  [[ "$MODE" != "update" ]] || die "R2 bucket '$R2_BUCKET' does not exist; run deploy first."
  log "Creating R2 Standard bucket '$R2_BUCKET'..."
  wrangler r2 bucket create "$R2_BUCKET"
}

queue_exists(){
  local name="$1" out
  # Best-effort discovery only. Wrangler output has changed between releases, so
  # creation below is also conflict-tolerant and is the authoritative check.
  out="$(wrangler queues list 2>/dev/null || true)"
  printf '%s\n' "$out" | grep -Fq "$name"
}

ensure_queue(){
  local name="$1" label="$2" out rc
  if queue_exists "$name"; then
    log "$label exists: $name"
    return 0
  fi

  log "Ensuring $label '$name' (24h retention)..."
  set +e
  out="$(wrangler queues create "$name" --message-retention-period-secs 86400 2>&1)"
  rc=$?
  set -e
  if (( rc == 0 )); then
    [[ -n "$out" ]] && printf '%s\n' "$out"
    return 0
  fi

  # Cloudflare API code 11009 means the queue already exists. This can happen
  # when `wrangler queues list` is stale, paginated, or changes output format.
  # Treat this race/idempotency case as success during deploy and update.
  if printf '%s\n' "$out" | grep -Eqi "code:[[:space:]]*11009|already[[:space:]]+(taken|exists)"; then
    log "$label already exists: $name (continuing idempotently)"
    return 0
  fi

  printf '%s\n' "$out" >&2
  die "Could not ensure $label '$name'."
}

ensure_queues(){
  ensure_queue "$QUEUE_NAME" "task queue"
  ensure_queue "$DLQ_NAME" "dead-letter queue"
}

configure_values(){
  # Provider configuration is managed from Platform > Integrations and each Tenant Admin workspace.
  # Existing .deploy.env / Wrangler values remain valid fallbacks during migration.
  MODELBRIDGE_CHAT_MODEL="${MODELBRIDGE_CHAT_MODEL:-}"
  MODELBRIDGE_STT_MODEL="${MODELBRIDGE_STT_MODEL:-}"
  MODELBRIDGE_TTS_MODEL="${MODELBRIDGE_TTS_MODEL:-}"
  MODELBRIDGE_TTS_VOICE="${MODELBRIDGE_TTS_VOICE:-alloy}"
  AZURE_SPEECH_REGION="${AZURE_SPEECH_REGION:-}"
  export MODELBRIDGE_CHAT_MODEL MODELBRIDGE_STT_MODEL MODELBRIDGE_TTS_MODEL MODELBRIDGE_TTS_VOICE AZURE_SPEECH_REGION

}

patch_configs(){
  log "Patching Wrangler configs for Free-first profile..."
  python3 - "$MAIN_CONFIG" "$MONITOR_CONFIG" "$TASK_CONFIG" <<'PY'
import json, os, sys
main_path, mon_path, task_path=sys.argv[1:4]
db=os.environ['D1_DATABASE_ID']
base=os.environ.get('MODELBRIDGE_BASE_URL','https://ai.wisewavesg.com')
model=os.environ.get('MODELBRIDGE_CHAT_MODEL','')
stt=os.environ.get('MODELBRIDGE_STT_MODEL','')
tts=os.environ.get('MODELBRIDGE_TTS_MODEL','')
tts_voice=os.environ.get('MODELBRIDGE_TTS_VOICE','alloy')
azure_region=os.environ.get('AZURE_SPEECH_REGION','')

with open(main_path) as f: main=json.load(f)
main.pop('kv_namespaces',None)
for d in main.get('d1_databases',[]):
    if d.get('binding')=='DB': d['database_id']=db
main.setdefault('vars',{})['MODELBRIDGE_BASE_URL']=base
main['vars']['MODELBRIDGE_CHAT_MODEL']=model
main['vars']['MODELBRIDGE_STT_MODEL']=stt
main['vars']['MODELBRIDGE_TTS_MODEL']=tts
main['vars']['MODELBRIDGE_TTS_VOICE']=tts_voice
main['vars']['AZURE_SPEECH_REGION']=azure_region
with open(main_path,'w') as f: json.dump(main,f,indent=2); f.write('\n')

with open(mon_path) as f: mon=json.load(f)
for d in mon.get('d1_databases',[]):
    if d.get('binding')=='DB': d['database_id']=db
vars=mon.setdefault('vars',{})
vars['MODELBRIDGE_BASE_URL']=base
vars['MODELBRIDGE_CHAT_MODEL']=model
mon.pop('send_email',None)
vars.pop('EMAIL_ENABLED',None)
vars.pop('NOTIFY_FROM',None)
vars.pop('NOTIFY_TO',None)
with open(mon_path,'w') as f: json.dump(mon,f,indent=2); f.write('\n')

with open(task_path) as f: task=json.load(f)
for d in task.get('d1_databases',[]):
    if d.get('binding')=='DB': d['database_id']=db
tvars=task.setdefault('vars',{})
tvars['MODELBRIDGE_BASE_URL']=base
tvars['MODELBRIDGE_CHAT_MODEL']=model
with open(task_path,'w') as f: json.dump(task,f,indent=2); f.write('\n')
PY
  persist_state
}

apply_migrations(){
  log "Applying D1 migrations to production..."
  wrangler d1 migrations apply "$DB_NAME" --remote
  local count
  count="$(wrangler d1 execute "$DB_NAME" --remote --command 'SELECT COUNT(*) AS skill_count FROM skills;' 2>/dev/null || true)"
  printf '%s\n' "$count" | grep -Eq '(^|[^0-9])39([^0-9]|$)' || warn "Could not confirm 39 seeded skills from Wrangler output; inspect D1 manually if deployment continues."
}

put_secret(){
  local worker_config="$1" secret_name="$2" secret_value="$3"
  [[ -n "$secret_value" ]] || return 0
  if [[ -n "$worker_config" ]]; then
    printf '%s' "$secret_value" | wrangler secret put "$secret_name" --config "$worker_config" >/dev/null
  else
    printf '%s' "$secret_value" | wrangler secret put "$secret_name" >/dev/null
  fi
}

secret_exists(){
  local worker_config="$1" secret_name="$2"
  local out
  if [[ -n "$worker_config" ]]; then out="$(wrangler secret list --config "$worker_config" 2>/dev/null || true)"
  else out="$(wrangler secret list 2>/dev/null || true)"; fi
  printf '%s\n' "$out" | grep -Fq "$secret_name"
}

ensure_settings_master_key(){
  local main_has=0 task_has=0 mon_has=0
  secret_exists "" SETTINGS_MASTER_KEY && main_has=1 || true
  secret_exists "$TASK_CONFIG" SETTINGS_MASTER_KEY && task_has=1 || true
  secret_exists "$MONITOR_CONFIG" SETTINGS_MASTER_KEY && mon_has=1 || true
  if [[ -n "${SETTINGS_MASTER_KEY:-}" ]]; then
    log "Updating SETTINGS_MASTER_KEY on web, task runner and monitor Workers..."
    put_secret "" SETTINGS_MASTER_KEY "$SETTINGS_MASTER_KEY"
    put_secret "$TASK_CONFIG" SETTINGS_MASTER_KEY "$SETTINGS_MASTER_KEY"
    put_secret "$MONITOR_CONFIG" SETTINGS_MASTER_KEY "$SETTINGS_MASTER_KEY"
    return
  fi
  if (( main_has==1 && task_has==1 && mon_has==1 )); then warn "SETTINGS_MASTER_KEY exists on all Workers, but Cloudflare does not expose secret values so equality cannot be verified. If queued AI jobs report that ModelBridge is not configured while the web UI shows it configured, redeploy with the SAME explicit SETTINGS_MASTER_KEY value for all Workers."; return; fi
  local secret_rows
  secret_rows="$(wrangler d1 execute "$DB_NAME" --remote --command "SELECT COUNT(*) AS n FROM integration_settings WHERE setting_type='secret';" 2>/dev/null || true)"
  if (( main_has+task_has+mon_has > 0 )) && printf '%s\n' "$secret_rows" | grep -Eq '(^|[^0-9])[1-9][0-9]*([^0-9]|$)'; then
    die "SETTINGS_MASTER_KEY is missing on one or more Workers while managed secrets already exist. Supply the original SETTINGS_MASTER_KEY explicitly to recover; do not rotate it blindly."
  fi
  if have openssl; then SETTINGS_MASTER_KEY="$(openssl rand -hex 32)"; else SETTINGS_MASTER_KEY="$(python3 - <<'PY3'
import secrets; print(secrets.token_hex(32))
PY3
)"; fi
  export SETTINGS_MASTER_KEY
  log "Creating SETTINGS_MASTER_KEY on web, task runner and monitor Workers..."
  put_secret "" SETTINGS_MASTER_KEY "$SETTINGS_MASTER_KEY"
  put_secret "$TASK_CONFIG" SETTINGS_MASTER_KEY "$SETTINGS_MASTER_KEY"
  put_secret "$MONITOR_CONFIG" SETTINGS_MASTER_KEY "$SETTINGS_MASTER_KEY"
}

configure_secrets(){
  ensure_settings_master_key
  # Platform provider secrets are configured from Platform > Integrations. Customer-tenant ModelBridge secrets are configured in each Tenant workspace and never fall back to the platform key.
  if [[ -n "${MODELBRIDGE_API_KEY:-}" ]]; then
    log "Updating ModelBridge secret on web, task runner and monitor Workers..."
    put_secret "" MODELBRIDGE_API_KEY "$MODELBRIDGE_API_KEY"
    put_secret "$TASK_CONFIG" MODELBRIDGE_API_KEY "$MODELBRIDGE_API_KEY"
    put_secret "$MONITOR_CONFIG" MODELBRIDGE_API_KEY "$MODELBRIDGE_API_KEY"
  fi

  # Admin login secret: configure once, then keep it across ordinary updates.
  if [[ -z "${ADMIN_ACCESS_TOKEN:-}" ]] && ! secret_exists "" ADMIN_ACCESS_TOKEN; then
    if (( NON_INTERACTIVE )); then
      warn "ADMIN_ACCESS_TOKEN is missing; the protected /platform login will be unavailable until you set an administrator password."
    else
      prompt_value ADMIN_ACCESS_TOKEN "Platform operator password for /platform (choose a strong value you will remember)" "" true || true
    fi
  fi
  if [[ -n "${ADMIN_ACCESS_TOKEN:-}" ]]; then
    log "Updating ADMIN_ACCESS_TOKEN on the main Worker..."
    put_secret "" ADMIN_ACCESS_TOKEN "$ADMIN_ACCESS_TOKEN"
  fi

  # YouTube discovery is optional. V0.6 keeps platform discovery in the task-runner Worker,
  # so an existing secret on the web Worker must be re-entered once if the new
  # task runner does not have its own copy. Secrets cannot be read back from Cloudflare.
  local main_has_youtube=0 task_has_youtube=0
  secret_exists "" YOUTUBE_API_KEY && main_has_youtube=1 || true
  secret_exists "$TASK_CONFIG" YOUTUBE_API_KEY && task_has_youtube=1 || true
  if [[ -n "${YOUTUBE_API_KEY:-}" ]]; then
    log "Updating optional YOUTUBE_API_KEY on web and task runner Workers..."
    put_secret "" YOUTUBE_API_KEY "$YOUTUBE_API_KEY"
    put_secret "$TASK_CONFIG" YOUTUBE_API_KEY "$YOUTUBE_API_KEY"
  elif (( main_has_youtube == 1 && task_has_youtube == 1 )); then
    log "Keeping existing YOUTUBE_API_KEY secrets."
  elif (( main_has_youtube == 1 )); then
    warn "Web Worker has YOUTUBE_API_KEY but task runner does not. Re-run update with YOUTUBE_API_KEY to enable queued YouTube discovery."
  else
    warn "No legacy YOUTUBE_API_KEY Worker secret detected. Configure YouTube from Platform > Integrations after deploy."
  fi

  # Optional Azure Speech key for acoustic pronunciation/prosody assessment.
  if [[ -n "${AZURE_SPEECH_REGION:-}" ]]; then
    if [[ -n "${AZURE_SPEECH_KEY:-}" ]]; then log "Updating optional AZURE_SPEECH_KEY on the main Worker..."; put_secret "" AZURE_SPEECH_KEY "$AZURE_SPEECH_KEY";
    elif secret_exists "" AZURE_SPEECH_KEY; then log "Keeping existing AZURE_SPEECH_KEY secret."; else warn "No legacy Azure Speech key detected. Configure Azure Speech from Platform > Integrations, or keep the free practice score."; fi
  fi

  # Do not rotate the monitor token on every update. Existing v0.1/v0.2 secrets remain valid.
  local main_has_monitor=0 mon_has_monitor=0
  secret_exists "" ADMIN_MONITOR_TOKEN && main_has_monitor=1 || true
  secret_exists "$MONITOR_CONFIG" ADMIN_MONITOR_TOKEN && mon_has_monitor=1 || true
  if [[ -n "${ADMIN_MONITOR_TOKEN:-}" ]]; then
    log "Updating admin monitor token on both Workers..."
    put_secret "" ADMIN_MONITOR_TOKEN "$ADMIN_MONITOR_TOKEN"
    put_secret "$MONITOR_CONFIG" ADMIN_MONITOR_TOKEN "$ADMIN_MONITOR_TOKEN"
  elif (( main_has_monitor == 0 || mon_has_monitor == 0 )); then
    if have openssl; then ADMIN_MONITOR_TOKEN="$(openssl rand -hex 32)";
    else ADMIN_MONITOR_TOKEN="$(python3 - <<'PY2'
import secrets; print(secrets.token_hex(32))
PY2
)"; fi
    export ADMIN_MONITOR_TOKEN
    log "Creating missing ADMIN_MONITOR_TOKEN on both Workers (existing tokens are never rotated implicitly)."
    put_secret "" ADMIN_MONITOR_TOKEN "$ADMIN_MONITOR_TOKEN"
    put_secret "$MONITOR_CONFIG" ADMIN_MONITOR_TOKEN "$ADMIN_MONITOR_TOKEN"
  else
    log "Keeping existing ADMIN_MONITOR_TOKEN secrets."
  fi
}

build_verify(){
  log "Running release self-check..."
  npm run selfcheck
  if (( SKIP_BUILD )); then return; fi
  log "Running TypeScript typecheck..."
  npm run typecheck
  log "Running Worker TypeScript typecheck..."
  npm run typecheck:workers
  log "Building OpenNext bundle to catch Free-plan deployment issues before publish..."
  npx opennextjs-cloudflare build
  if [[ -f .open-next/worker.js ]]; then
    local bytes
    bytes="$(wc -c < .open-next/worker.js | tr -d ' ')"
    log "Generated worker.js size: ${bytes} bytes (Wrangler reports final upload/compressed size during deploy)."
  fi
}

deploy_workers(){
  log "Deploying persistent async task runner Worker first..."
  wrangler deploy --config "$TASK_CONFIG"

  log "Deploying main web Worker..."
  if (( SKIP_BUILD )); then
    npx opennextjs-cloudflare deploy
  else
    # build_verify already generated .open-next; deploy may rebuild depending on OpenNext version.
    npx opennextjs-cloudflare deploy
  fi
  log "Deploying syllabus monitor Worker..."
  wrangler deploy --config "$MONITOR_CONFIG"
}

show_status(){
  ensure_login
  printf '\nCloudflare identity:\n'; wrangler whoami || true
  printf '\nD1:\n'; wrangler d1 list || true
  printf '\nR2:\n'; wrangler r2 bucket list || true
  printf '\nQueues:\n'; wrangler queues list || true
  printf '\nD1 migrations:\n'; wrangler d1 migrations list "$DB_NAME" --remote || true
  printf '\nMain Worker production deployment:\n'; wrangler deployments status --name "$APP_WORKER" || true
  printf '\nTask Runner production deployment:\n'; wrangler deployments status --name "$TASK_WORKER" --config "$TASK_CONFIG" || true
  printf '\nSyllabus Monitor production deployment:\n'; wrangler deployments status --name "$MONITOR_WORKER" --config "$MONITOR_CONFIG" || true
  printf '\nLocal config:\n'
  python3 - <<'PY'
import json
for p in ('wrangler.jsonc','workers/task-runner/wrangler.jsonc','workers/syllabus-monitor/wrangler.jsonc'):
    try:
        d=json.load(open(p)); print(p)
        print('  worker:',d.get('name'))
        print('  d1:',[(x.get('database_name'),x.get('database_id')) for x in d.get('d1_databases',[])])
        print('  r2:',[x.get('bucket_name') for x in d.get('r2_buckets',[])])
        print('  queues:',d.get('queues',{}))
        print('  email transport: SMTP (managed in Platform > Integrations)')
    except Exception as e: print(p,e)
PY
}

if [[ "$MODE" == "status" ]]; then
  if ! node_deps_ready; then install_deps; fi
  show_status
  exit 0
fi

install_deps
ensure_login
configure_values
ensure_d1
ensure_r2
ensure_queues
patch_configs
build_verify
apply_migrations
deploy_workers
configure_secrets

cat <<EOF

Deployment complete.

Cloudflare Free-first profile:
  Web Worker:       $APP_WORKER
  Monitor Worker:   $MONITOR_WORKER
  Task Runner:      $TASK_WORKER
  D1:               $DB_NAME ($D1_DATABASE_ID)
  R2:               $R2_BUCKET
  Queue:            $QUEUE_NAME (+ $DLQ_NAME)
  Queue execution:  serial (1 persisted job/invocation; listening uses resumable checkpoints)
  KV/Workflows:     not required
  Email alerts:     SMTP via Platform > Integrations
  Platform config:  /platform/settings/integrations
  Tenant AI config: /admin/settings/integrations
  YouTube:          Platform-managed key with Worker-secret fallback
  STT/TTS:          Platform/tenant ModelBridge providers; browser fallbacks enabled
  Pronunciation:    Platform-managed Azure Speech; free heuristic fallback enabled
  Site domain:      https://study.wisewavesg.com
  Platform Operator: https://study.wisewavesg.com/platform
  Tenant Admin:      https://study.wisewavesg.com/admin
  Cron:             23:00 UTC daily (07:00 Singapore)

For later updates, run:
  ./scripts/deploy.sh update

Check resources with:
  ./scripts/deploy.sh status

Note: ADMIN_ACCESS_TOKEN, ADMIN_MONITOR_TOKEN and SETTINGS_MASTER_KEY are intentionally not saved to disk.
Platform provider credentials should be managed from Platform > Integrations; customer tenants configure their own ModelBridge key in the Tenant Admin workspace. Existing Worker secrets remain platform-only fallback values.
EOF
