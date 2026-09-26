#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]
def src(path):
    p=ROOT/path
    if not p.exists(): errors.append(f"missing {path}"); return ""
    return p.read_text(errors="ignore")
def req(cond,msg):
    if not cond: errors.append(msg)

layout=src("app/admin/(protected)/layout.tsx")
req('force-dynamic' not in layout,"Admin protected layout must not force dynamic SSR")
req('cookies' not in layout and 'getEnv' not in layout,"Admin protected layout still performs server auth/D1 work")
req('TenantAuthGate' in layout,"Admin protected layout is missing TenantAuthGate")

gate=src("components/tenant-auth-gate.tsx")
req('/api/admin/session' in gate,"TenantAuthGate does not validate the session")
req('setReady(true)' in gate,"TenantAuthGate never opens after authentication")
req('router.replace(`/admin/login' in gate,"TenantAuthGate does not redirect unauthenticated users")

auth=src("lib/auth/tenant.ts")
req("10*60*1000" in auth,"Tenant session heartbeat is not throttled to ten minutes")
req("last_seen_at<datetime('now','-10 minutes')" in auth,"Tenant session heartbeat lacks guarded D1 update")

dash=src("app/api/admin/dashboard/route.ts")
req('db.batch([' in dash,"Admin dashboard does not use one D1 batch")
req('tenantAiQuotaStatus' not in dash,"Admin dashboard still performs a second quota query")
req('(SELECT COUNT(*)' not in dash,"Admin dashboard still uses scalar count subqueries")

badge=src("components/current-user-badge.tsx")
req('tenantSessionDisplayEvent' in badge,"Tenant badge does not reuse auth-gate identity")
req('import { tenantSessionDisplayCacheKey, tenantSessionDisplayEvent } from "@/components/tenant-auth-gate";' in badge,"Tenant badge session-display constants are not imported")
req('fetch("/api/admin/session"' not in badge,"Tenant badge still performs a redundant session request")

if errors:
    print("HOTFIX12.4.7 TEST FAIL")
    for e in errors: print('-',e)
    sys.exit(1)
print("HOTFIX12.4.7 TEST PASS: Admin shell is static-gated; redundant session fetch/write amplification removed; dashboard batched")
