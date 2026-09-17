"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/platform/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/platform/login");
    router.refresh();
  }
  return <button type="button" className="adminSignOut" disabled={busy} onClick={signOut}>{busy ? "Signing out…" : "Sign out"}</button>;
}
