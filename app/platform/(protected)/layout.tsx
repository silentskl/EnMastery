import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isAdminCookieValue } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const authenticated = await isAdminCookieValue(jar.get(ADMIN_COOKIE)?.value);
  if (!authenticated) redirect("/platform/login");
  return children;
}
