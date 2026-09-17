import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { validatePublicUrl } from "@/lib/content/extract";

const DOMAINS=["reading","speaking","writing","cloze"] as const;
function domainFrom(v:unknown){return DOMAINS.includes(v as (typeof DOMAINS)[number])?String(v):"";}
function domainsFrom(v:unknown){const values=Array.isArray(v)?v:[v];return [...new Set(values.map(domainFrom).filter(Boolean))];}

export async function GET(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const env = getEnv(),url=new URL(request.url),domain=domainFrom(url.searchParams.get("domain"));
  const rows = domain
    ? await env.DB.prepare("SELECT * FROM content_sources WHERE domains_json LIKE ? ORDER BY enabled DESC,name").bind(`%\"${domain}\"%`).all()
    : await env.DB.prepare("SELECT * FROM content_sources ORDER BY enabled DESC,name").all();
  return Response.json({ sources: rows.results });
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  const sourceType = body.sourceType === "webpage" ? "webpage" : "rss";
  const domains=domainsFrom(body.domains).length?domainsFrom(body.domains):["reading"];
  if (!name || !baseUrl) return Response.json({ error: "name and baseUrl are required" }, { status: 400 });
  const url = validatePublicUrl(baseUrl);
  const id = `source-${crypto.randomUUID()}`;
  const env = getEnv();
  await env.DB.prepare("INSERT INTO content_sources (id,name,source_type,base_url,allowed_host,topic,usage_mode,enabled,domains_json) VALUES (?,?,?,?,?,?,?,1,?)")
    .bind(id, name, sourceType, url.toString(), url.hostname.replace(/^www\./, ""), typeof body.topic === "string" ? body.topic.trim() : null, typeof body.usageMode === "string" ? body.usageMode : "reference_only",JSON.stringify(domains)).run();
  return Response.json({ ok: true, id }, { status: 201 });
}
