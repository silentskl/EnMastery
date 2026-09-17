import { getEnv } from "@/lib/cloudflare";
import { resolvePlatformIntegrations } from "@/lib/settings/runtime";
import { requireAdmin } from "@/lib/auth/admin";
import { validatePublicUrl } from "@/lib/content/extract";

function youtubeRef(raw: string) {
  const v = raw.trim();
  if (!v) throw new Error("YouTube channel URL, handle or channel ID is required");
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(v)) return { providerRef: v, baseUrl: `https://www.youtube.com/channel/${v}` };
  if (/^@[A-Za-z0-9._-]{3,}$/.test(v)) return { providerRef: v, baseUrl: `https://www.youtube.com/${v}` };
  const url = validatePublicUrl(v);
  if (!(url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com"))) throw new Error("YouTube source must use youtube.com");
  const parts = url.pathname.split("/").filter(Boolean);
  const handle = parts.find((x) => x.startsWith("@"));
  const channelIdx = parts.indexOf("channel");
  const providerRef = handle || (channelIdx >= 0 ? parts[channelIdx + 1] : "");
  if (!providerRef) throw new Error("Use a YouTube @handle or /channel/UC... URL");
  return { providerRef, baseUrl: url.toString() };
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const env = await resolvePlatformIntegrations(getEnv());
  const rows = await env.DB.prepare("SELECT * FROM listening_sources ORDER BY enabled DESC, name").all();
  return Response.json({ sources: rows.results, youtubeEnabled: Boolean(env.YOUTUBE_API_KEY) });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const raw = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  const sourceType = body.sourceType === "youtube_channel" ? "youtube_channel" : "podcast_rss";
  if (!name || !raw) return Response.json({ error: "name and source URL/handle are required" }, { status: 400 });
  try {
    let baseUrl: string, providerRef: string | null = null, allowedHost: string | null = null;
    if (sourceType === "youtube_channel") {
      const parsed = youtubeRef(raw); baseUrl = parsed.baseUrl; providerRef = parsed.providerRef; allowedHost = "youtube.com";
    } else {
      const url = validatePublicUrl(raw); baseUrl = url.toString(); allowedHost = url.hostname.replace(/^www\./, "");
    }
    const env = await resolvePlatformIntegrations(getEnv());
    const id = `listen-source-${crypto.randomUUID()}`;
    await env.DB.prepare("INSERT INTO listening_sources (id,name,source_type,base_url,provider_ref,allowed_host,topic,default_level,usage_mode,enabled) VALUES (?,?,?,?,?,?,?,?,?,1)")
      .bind(id, name, sourceType, baseUrl, providerRef, allowedHost, typeof body.topic === "string" ? body.topic.trim() : null, body.defaultLevel === "P5" ? "P5" : "P6", typeof body.usageMode === "string" ? body.usageMode : "reference_only").run();
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid listening source" }, { status: 400 });
  }
}


export async function PATCH(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Source id is required" }, { status: 400 });
  const env = await resolvePlatformIntegrations(getEnv());
  const current = await env.DB.prepare("SELECT id FROM listening_sources WHERE id=?").bind(id).first();
  if (!current) return Response.json({ error: "Listening source not found" }, { status: 404 });
  const sets: string[] = []; const values: unknown[] = [];
  if (typeof body.enabled === "boolean") { sets.push("enabled=?"); values.push(body.enabled ? 1 : 0); }
  if (typeof body.name === "string" && body.name.trim()) { sets.push("name=?"); values.push(body.name.trim()); }
  if (typeof body.topic === "string") { sets.push("topic=?"); values.push(body.topic.trim() || null); }
  if (body.defaultLevel === "P5" || body.defaultLevel === "P6") { sets.push("default_level=?"); values.push(body.defaultLevel); }
  if (!sets.length) return Response.json({ error: "No changes supplied" }, { status: 400 });
  values.push(id);
  await env.DB.prepare(`UPDATE listening_sources SET ${sets.join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values).run();
  return Response.json({ ok: true });
}
