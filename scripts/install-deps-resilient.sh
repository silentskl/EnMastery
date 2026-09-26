#!/usr/bin/env bash
set -euo pipefail

# Install English Mastery dependencies with registry failover.
# Override/put a private registry first with:
#   NPM_REGISTRY=https://your-registry.example/ npm run deps:install

REGISTRIES=()
if [[ -n "${NPM_REGISTRY:-}" ]]; then
  REGISTRIES+=("${NPM_REGISTRY%/}/")
fi
REGISTRIES+=(
  "https://registry.npmjs.org/"
  "https://registry.npmmirror.com/"
  "https://mirrors.cloud.tencent.com/npm/"
  "https://repo.huaweicloud.com/repository/npm/"
  "https://registry.yarnpkg.com/"
)

# Deduplicate while preserving order.
UNIQUE=()
for r in "${REGISTRIES[@]}"; do
  seen=0
  for x in "${UNIQUE[@]:-}"; do [[ "$x" == "$r" ]] && seen=1 && break; done
  [[ $seen -eq 0 ]] && UNIQUE+=("$r")
done

INSTALL_ARGS=(install --include=dev --no-audit --no-fund --fetch-retries=1 --fetch-retry-mintimeout=1000 --fetch-retry-maxtimeout=4000 --fetch-timeout=30000)

for registry in "${UNIQUE[@]}"; do
  echo "[deps] Trying registry: $registry"
  if npm "${INSTALL_ARGS[@]}" --registry="$registry"; then
    echo "[deps] Installed successfully from: $registry"
    npm ls --depth=0
    exit 0
  fi
  echo "[deps] Registry failed: $registry" >&2
  rm -rf node_modules/.package-lock.json 2>/dev/null || true
done

cat >&2 <<'MSG'
[deps] Dependency installation failed on every configured registry.
This usually means outbound DNS/HTTPS is blocked by the current host/network rather than a package/version problem.
Set NPM_REGISTRY to an accessible corporate/private npm proxy, or run this command from a network that can reach an npm registry.
MSG
exit 1
