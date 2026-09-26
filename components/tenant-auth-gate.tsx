"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type TenantSession = {
  displayName?: string | null;
  email?: string | null;
  tenantName?: string | null;
  tenantSlug?: string | null;
};

const SESSION_EVENT = "em:tenant-session";
const SESSION_CACHE_KEY = "em:tenant-session-display";

export function TenantAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        const body = await response.json().catch(() => ({})) as {
          authenticated?: boolean;
          session?: TenantSession | null;
        };
        if (cancelled) return;
        if (!response.ok || !body.authenticated || !body.session) {
          sessionStorage.removeItem(SESSION_CACHE_KEY);
          const next = pathname && pathname !== "/admin" ? `?next=${encodeURIComponent(pathname)}` : "";
          router.replace(`/admin/login${next}`);
          return;
        }
        try {
          sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(body.session));
          window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: body.session }));
        } catch {}
        setReady(true);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        // A transient API failure should not repeatedly hammer the Worker. Keep the
        // protected shell closed and allow a manual reload instead of retry-looping.
        setReady(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, router]);

  if (!ready) {
    return <div className="emptyState">Checking Admin session…</div>;
  }
  return <>{children}</>;
}

export const tenantSessionDisplayEvent = SESSION_EVENT;
export const tenantSessionDisplayCacheKey = SESSION_CACHE_KEY;
