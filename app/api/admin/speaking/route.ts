import { getEnv } from "@/lib/cloudflare";
import { duplicateSkip } from "@/lib/content/dedup";
import { requireTenantSession } from "@/lib/auth/tenant";

type Body = Record<string, unknown>;

function pickString(body: Body, keys: string[]) {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalise(body: Body) {
  const title = String(body.title || "").trim();
  const schoolLevel = body.schoolLevel === "P5" ? "P5" : "P6";
  const mode = body.mode === "reading_aloud" ? "reading_aloud" : body.mode === "stimulus" ? "stimulus" : "conversation";
  const topic = String(body.topic || "Oral Communication").trim() || "Oral Communication";
  const prompt = String(body.prompt || "").trim();
  const referenceText = String(body.referenceText || "").trim();
  const stimulusAlt = pickString(body, ["stimulusAlt", "stimulus_alt", "imageAlt", "image_alt"]);
  const stimulusImageUrl = pickString(body, ["stimulusImageUrl", "stimulus_image_url", "imageUrl", "image_url", "image"]);
  const stimulusImageAlt = pickString(body, ["stimulusImageAlt", "stimulus_image_alt", "imageDescription", "image_description", "imageAlt", "image_alt"]);
  const followUpGoals = Array.isArray(body.followUpGoals)
    ? body.followUpGoals.map(x => String(x).trim()).filter(Boolean).slice(0, 8)
    : String(body.followUpGoals || "").split(/\n|,/).map(x => x.trim()).filter(Boolean).slice(0, 8);
  return {
    title,
    schoolLevel,
    mode,
    topic,
    prompt,
    referenceText,
    stimulusAlt,
    stimulusImageUrl,
    stimulusImageAlt,
    followUpGoals,
    description: String(body.description || "").trim(),
  };
}

export async function GET(request: Request) {
  const a = await requireTenantSession(request);
  if (a.response) return a.response;
  const s = a.session!;
  const rows = await getEnv().DB.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.status,c.scope,c.description,v.body_json FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version WHERE c.content_type='oral_prompt' AND ((c.scope='global' AND c.status='published') OR (c.scope='tenant' AND c.tenant_id=?)) ORDER BY c.created_at DESC`).bind(s.tenant_id).all();
  return Response.json({
    prompts: rows.results.map((r: any) => {
      let b: any = {};
      try { b = JSON.parse(r.body_json); } catch {}
      return {
        ...r,
        mode: b.mode || "conversation",
        stimulusImageUrl: b.stimulusImageUrl || b.stimulus_image_url || b.imageUrl || b.image_url || b.image || null,
      };
    })
  });
}

export async function POST(request: Request) {
  const a = await requireTenantSession(request);
  if (a.response) return a.response;
  const s = a.session!;
  const db = getEnv().DB;
  const b = normalise(await request.json().catch(() => ({})) as Body);
  if (!b.title || b.prompt.length < 20) return Response.json({ error: "Title and speaking prompt are required" }, { status: 400 });
  if (b.mode === "reading_aloud" && b.referenceText.length < 80) return Response.json({ error: "Reading Aloud needs a reference passage of at least 80 characters" }, { status: 400 });
  if (b.mode === "stimulus" && !b.stimulusAlt && !b.stimulusImageUrl) return Response.json({ error: "Stimulus Conversation needs a scene description or a stimulus image" }, { status: 400 });
  const dup = await duplicateSkip(db, { contentType: "oral_prompt", schoolLevel: b.schoolLevel, scope: "tenant", tenantId: s.tenant_id, title: b.title });
  if (dup.skipped) return Response.json({ ok: true, status: "skipped", existingId: dup.existingId, existingStatus: dup.existingStatus });
  const id = `speak-${crypto.randomUUID()}`;
  const payload = {
    mode: b.mode,
    prompt: b.prompt,
    ...(b.referenceText ? { referenceText: b.referenceText } : {}),
    ...(b.stimulusAlt ? { stimulusAlt: b.stimulusAlt } : {}),
    ...(b.stimulusImageUrl ? { stimulusImageUrl: b.stimulusImageUrl } : {}),
    ...(b.stimulusImageAlt ? { stimulusImageAlt: b.stimulusImageAlt } : {}),
    followUpGoals: b.followUpGoals,
  };
  await db.batch([
    db.prepare("INSERT INTO content_items(id,content_type,title,school_level,topic,licence,status,active_version,description,source_attribution,published_at,tenant_id,scope) VALUES(?,'oral_prompt',?,?,?,'owned','published',1,?,'Tenant Admin original · MOE syllabus aligned',CURRENT_TIMESTAMP,?,'tenant')").bind(id, b.title, b.schoolLevel, b.topic, b.description || "Singapore primary oral communication practice", s.tenant_id),
    db.prepare("INSERT INTO content_versions(id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES(?,?,?,?,?,'SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved')").bind(`${id}-v1`, id, 1, JSON.stringify(payload), "tenant-admin")
  ]);
  return Response.json({ ok: true, id }, { status: 201 });
}
