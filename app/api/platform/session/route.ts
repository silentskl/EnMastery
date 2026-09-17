import { adminCookie, adminSessionValue, clearAdminCookie, getAdminSecret, isAdminRequest } from "@/lib/auth/admin";

export async function GET(request: Request) {
  return Response.json({ authenticated: await isAdminRequest(request) });
}

export async function POST(request: Request) {
  const secret = getAdminSecret();
  if (!secret) return Response.json({ error: "ADMIN_ACCESS_TOKEN is not configured on the Worker" }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { token?: string };
  if (!body.token || body.token !== secret) return Response.json({ error: "Invalid administrator token" }, { status: 401 });
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", adminCookie(await adminSessionValue(secret)));
  return response;
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", clearAdminCookie());
  return response;
}
