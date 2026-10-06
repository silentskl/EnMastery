import { resolveLearnerAiIntegrations, requireAuthenticatedLearner } from "@/lib/settings/learner-runtime";
import { learnerCookie } from "@/lib/student/session";
import { evaluateConversation } from "@/lib/speaking/evaluate";
import { updateSkillEvidence } from "@/lib/student/mastery";
import { conversationOverallScore, recordDailySpeakingModeScore } from "@/lib/student/speaking-daily";
import { recordTenantAiUsage } from "@/lib/tenant/usage";

export async function POST(request: Request) {
  const { env, session, tenantId, quota } = await resolveLearnerAiIntegrations(request);
  const denied = requireAuthenticatedLearner(session);
  if (denied) return denied;
  if (!quota.allowed) return Response.json({ error: "This organisation has reached its monthly AI request quota" }, { status: 429 });
  if (!env.MODELBRIDGE_API_KEY || !env.MODELBRIDGE_CHAT_MODEL) return Response.json({ error: "Your organisation has not configured ModelBridge chat" }, { status: 503 });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const promptId = typeof body.promptId === "string" ? body.promptId : "";
  const transcript = typeof body.transcript === "string" ? body.transcript.trim().slice(0, 3000) : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1800) : "";
  const mode = body.mode === "stimulus" ? "stimulus" : "conversation";
  const track = body.track === "pet" ? "pet" : "daily";
  const targetSeconds = typeof body.targetSeconds === "number" ? Math.max(30, Math.min(120, Math.round(body.targetSeconds))) : undefined;
  let sessionId = typeof body.sessionId === "string" ? body.sessionId : "";

  const history = Array.isArray(body.history)
    ? body.history.filter((x): x is { role: "user" | "assistant"; content: string } =>
        Boolean(x) && typeof x === "object"
        && (((x as Record<string, unknown>).role) === "user" || ((x as Record<string, unknown>).role) === "assistant")
        && typeof (x as Record<string, unknown>).content === "string")
      .map(x => ({ role: x.role, content: x.content.slice(0, 900) })).slice(-6)
    : [];

  if (!transcript || !prompt) return Response.json({ error: "prompt and transcript are required" }, { status: 400 });

  // Use the published PET content as the source of truth for assessment.
  // A client-supplied question list must never override the selected photograph.
  let petQuestions: string[] = [];
  let petScene = "";
  let assessmentPrompt = prompt;
  if (track === "pet") {
    if (!promptId) return Response.json({ error: "PET promptId is required" }, { status: 400 });
    const selected = await env.DB.prepare(`SELECT v.body_json FROM content_items c
      JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
      WHERE c.id=? AND c.status='published' AND c.content_type='oral_prompt'
        AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
        AND json_extract(v.body_json,'$.examTrack')='PET' LIMIT 1`)
      .bind(promptId, tenantId).first<{ body_json: string }>();
    if (!selected) return Response.json({ error: "Published PET picture prompt not found" }, { status: 404 });
    let data: Record<string, unknown>;
    try { data = JSON.parse(selected.body_json) as Record<string, unknown>; }
    catch { return Response.json({ error: "PET prompt data is invalid" }, { status: 500 }); }
    if (!Array.isArray(data.examinerPrompts)) return Response.json({ error: "PET questions are missing" }, { status: 500 });
    petQuestions = data.examinerPrompts.filter((q): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 5);
    if (petQuestions.length < 3) return Response.json({ error: "PET requires 3-5 picture questions" }, { status: 500 });
    petScene = typeof data.stimulusAlt === "string" ? data.stimulusAlt.slice(0, 1000) : "";
    assessmentPrompt = typeof data.prompt === "string" ? data.prompt.slice(0, 1800) : prompt;
  }

  if (!sessionId) {
    sessionId = `speak-${crypto.randomUUID()}`;
    await env.DB.prepare("INSERT INTO speaking_sessions (id,child_id,mode,prompt_text,status) VALUES (?,?,?,?,'active')")
      .bind(sessionId, session.childId, mode, prompt).run();
  } else if (!await env.DB.prepare("SELECT id FROM speaking_sessions WHERE id=? AND child_id=?").bind(sessionId, session.childId).first()) {
    return Response.json({ error: "Speaking session not found" }, { status: 404 });
  }

  try {
    const feedback = await evaluateConversation({
      baseUrl: env.MODELBRIDGE_BASE_URL,
      apiKey: env.MODELBRIDGE_API_KEY,
      model: env.MODELBRIDGE_CHAT_MODEL,
      prompt: assessmentPrompt,
      transcript,
      examinerPrompts: petQuestions,
      sceneDescription: petScene,
      mode,
      history,
      track,
      targetSeconds,
    });
    const learnerTurn = `turn-${crypto.randomUUID()}`;
    const assistantTurn = `turn-${crypto.randomUUID()}`;

    await env.DB.batch([
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,transcript,evaluation_json) VALUES (?,?,?,'learner',?,?)")
        .bind(learnerTurn, sessionId, session.childId, transcript, JSON.stringify(feedback)),
      env.DB.prepare("INSERT INTO speaking_turns (id,session_id,child_id,speaker,reply_text) VALUES (?,?,?,'assistant',?)")
        .bind(assistantTurn, sessionId, session.childId, feedback.reply),
      env.DB.prepare("UPDATE speaking_sessions SET turn_count=turn_count+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(sessionId),
    ]);

    await updateSkillEvidence(env.DB, session.childId, "S-SBC-IDEA", Math.round((feedback.relevance + feedback.development) / 2));
    await updateSkillEvidence(env.DB, session.childId, "S-INTERACT", feedback.interaction);
    await env.DB.prepare("INSERT INTO xp_ledger (id,child_id,event_type,points,reference_id) VALUES (?,?,'speaking_turn',?,?)")
      .bind(`xp-${crypto.randomUUID()}`, session.childId, feedback.interaction >= 60 ? 8 : 5, learnerTurn).run();

    const dailySpeaking = track === "daily"
      ? await recordDailySpeakingModeScore(env.DB, { childId: session.childId, mode, promptId, score: conversationOverallScore(feedback) })
      : undefined;

    await recordTenantAiUsage(env.DB, {
      tenantId,
      childId: session.childId,
      purpose: track === "pet" ? "speaking_pet_picture_description" : "speaking_conversation",
      model: env.MODELBRIDGE_CHAT_MODEL,
    });

    const response = Response.json({ sessionId, feedback, dailySpeaking, track });
    if (session.isNew) response.headers.set("Set-Cookie", learnerCookie(session.sessionId));
    return response;
  } catch (e) {
    await recordTenantAiUsage(env.DB, {
      tenantId,
      childId: session.childId,
      purpose: track === "pet" ? "speaking_pet_picture_description" : "speaking_conversation",
      model: env.MODELBRIDGE_CHAT_MODEL,
      status: "failed",
    }).catch(() => undefined);
    return Response.json({ error: e instanceof Error ? e.message : "Speaking response failed" }, { status: 502 });
  }
}
