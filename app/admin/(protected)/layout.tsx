import type { ReactNode } from "react";
import { TenantAuthGate } from "@/components/tenant-auth-gate";

// Keep Admin pages statically renderable. Authentication remains enforced by every
// /api/admin/* endpoint; this client gate only controls access to the UI shell.
// Avoiding per-navigation Next.js SSR + D1 auth work materially lowers Cloudflare
// Worker CPU usage and prevents Error 1102 on the Admin route itself.
export default function Layout({ children }: { children: ReactNode }) {
  return <TenantAuthGate>{children}</TenantAuthGate>;
}
