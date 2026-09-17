import { getEnv } from "@/lib/cloudflare";

export const ADMIN_COOKIE = "em_admin_session";

function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getAdminSecret() {
  const env = getEnv();
  return env.ADMIN_ACCESS_TOKEN || env.ADMIN_MONITOR_TOKEN || "";
}

export async function adminSessionValue(secret: string) {
  return sha256(`english-mastery-admin:${secret}`);
}

export async function isAdminRequest(request: Request) {
  const secret = getAdminSecret();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  const cookie = parseCookie(request.headers.get("cookie"), ADMIN_COOKIE);
  if (!cookie) return false;
  return cookie === await adminSessionValue(secret);
}

export async function isAdminCookieValue(value: string | undefined | null) {
  const secret = getAdminSecret();
  if (!secret || !value) return false;
  return value === await adminSessionValue(secret);
}

export async function requireAdmin(request: Request) {
  if (await isAdminRequest(request)) return null;
  return Response.json({ error: "Administrator authentication required" }, { status: 401 });
}

export function adminCookie(value: string) {
  return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}

export function clearAdminCookie() {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
