import { safeJson, type StoredQuestion } from "@/lib/content/store";
import type { ListeningBody, ListeningMaterial, QuestionBasis, StoredMedia } from "@/lib/listening/types";

export async function insertListeningMaterial(db: D1Database, args: {
  material: ListeningMaterial;
  schoolLevel: "P5" | "P6";
  skillIds: string[];
  status?: "draft" | "published";
  generationModel: string;
  sourceAttribution: string;
  sourceItemUrl: string;
  contentId?: string;
  licence?: string;
  media: {
    mediaKind: "youtube" | "podcast" | "owned_audio" | "external_video";
    provider: string;
    externalId?: string;
    mediaUrl?: string;
    embedUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    madeForKids?: boolean | null;
    sourceTitle?: string;
    questionBasis: QuestionBasis;
    transcriptPolicy?: "not_stored" | "owned" | "licensed";
  };
}) {
  const id = args.contentId || `listen-${crypto.randomUUID()}`;
  const status = args.status || "draft";
  const contentType = args.media.mediaKind === "youtube" ? "video_ref" : "audio";
  await db.batch([
    db.prepare("INSERT INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at) VALUES (?,?,?,?,?,?,?,?,1,?,?,?)")
      .bind(id, contentType, args.material.title, args.schoolLevel, args.material.topic, args.sourceItemUrl || null, args.licence || "reference_only", status, args.material.description, args.sourceAttribution, status === "published" ? new Date().toISOString() : null),
    db.prepare("INSERT INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES (?,?,?,?,?,?,?)")
      .bind(`${id}-v1`, id, 1, JSON.stringify(args.material.body), args.generationModel, "SG-PRIMARY-ENGLISH-2020-PSLE-2026", status === "published" ? "approved" : "draft"),
    db.prepare("INSERT INTO content_media (content_id,media_kind,provider,external_id,media_url,embed_url,thumbnail_url,duration_seconds,made_for_kids,source_title,source_item_url,question_basis,transcript_policy) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, args.media.mediaKind, args.media.provider, args.media.externalId || null, args.media.mediaUrl || null, args.media.embedUrl || null, args.media.thumbnailUrl || null, args.media.durationSeconds || null, typeof args.media.madeForKids === "boolean" ? (args.media.madeForKids ? 1 : 0) : null, args.media.sourceTitle || null, args.sourceItemUrl, args.media.questionBasis, args.media.transcriptPolicy || "not_stored"),
  ]);
  const skills = (args.skillIds.length ? args.skillIds : ["L-MAIN", "L-DETAIL", "L-INFER"]).slice(0, 6);
  for (const skillId of skills) await db.prepare("INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES (?,?,1)").bind(id, skillId).run();
  for (const [index, q] of args.material.questions.entries()) {
    const qid = `q-${crypto.randomUUID()}`;
    const stem = { prompt: q.prompt, ...(q.options ? { options: q.options } : {}) };
    const answer = q.questionType === "multiple_choice" ? { correctOption: q.correctOption ?? 0 } : { acceptedKeywords: q.acceptedKeywords || [], modelAnswer: q.modelAnswer || "" };
    await db.prepare("INSERT INTO questions (id,question_type,school_level,difficulty,stem_json,answer_json,explanation_json,status,source_content_id,curriculum_version_id,generation_model,marks) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(qid, q.questionType, args.schoolLevel, index > 1 ? 3 : 2, JSON.stringify(stem), JSON.stringify(answer), JSON.stringify({ text: q.explanation || "Listen again and identify the evidence for your answer." }), status === "published" ? "published" : "draft", id, "SG-PRIMARY-ENGLISH-2020-PSLE-2026", args.generationModel, q.marks || 1).run();
    const qSkills = index === 0 ? [skills[0]] : index === 1 ? [skills[1] || skills[0]] : index === 2 ? [skills.find((s) => s === "L-INFER") || skills[0]] : [skills.find((s) => s === "L-EVAL") || skills[0]];
    for (const skillId of qSkills.filter((value): value is string => Boolean(value))) await db.prepare("INSERT OR IGNORE INTO question_skills (question_id,skill_id,weight) VALUES (?,?,1)").bind(qid, skillId).run();
  }
  return id;
}

export type StoredListeningContent = {
  id: string; title: string; school_level: string; topic: string | null; status: string; description: string | null; source_attribution: string | null; published_at: string | null;
  body: ListeningBody; media: StoredMedia; questions: StoredQuestion[]; segments?: Array<{id:string;segment_order:number;start_ms:number;end_ms:number;transcript:string}>;
};

export async function getListeningContent(db: D1Database, id: string, publishedOnly = false): Promise<StoredListeningContent | null> {
  const row = await db.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.status,c.description,c.source_attribution,c.published_at,v.body_json,m.media_kind,m.provider,m.external_id,m.media_url,m.embed_url,m.thumbnail_url,m.duration_seconds,m.made_for_kids,m.source_title,m.source_item_url,m.question_basis,m.transcript_policy FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version JOIN content_media m ON m.content_id=c.id WHERE c.id=? AND c.content_type IN ('audio','video_ref') ${publishedOnly ? "AND c.status='published'" : ""}`)
    .bind(id).first<Record<string, unknown>>();
  if (!row) return null;
  const qRows = await db.prepare(`SELECT id,question_type,stem_json,answer_json,explanation_json,marks,status FROM questions WHERE source_content_id=? ${publishedOnly ? "AND status='published'" : ""} ORDER BY created_at,id`).bind(id).all<{ id:string; question_type:string; stem_json:string; answer_json:string; explanation_json:string|null; marks:number; status:string }>();
  const questions: StoredQuestion[] = qRows.results.map((q) => ({ ...q, stem: safeJson(q.stem_json, {}), answer: safeJson(q.answer_json, {}), explanation: safeJson(q.explanation_json, {}) }));
  const media: StoredMedia = {
    media_kind: row.media_kind as StoredMedia["media_kind"], provider: String(row.provider), external_id: row.external_id ? String(row.external_id) : null,
    media_url: row.media_url ? String(row.media_url) : null, embed_url: row.embed_url ? String(row.embed_url) : null, thumbnail_url: row.thumbnail_url ? String(row.thumbnail_url) : null,
    duration_seconds: typeof row.duration_seconds === "number" ? row.duration_seconds : null, made_for_kids: typeof row.made_for_kids === "number" ? row.made_for_kids : null,
    source_title: row.source_title ? String(row.source_title) : null, source_item_url: row.source_item_url ? String(row.source_item_url) : null,
    question_basis: row.question_basis as StoredMedia["question_basis"], transcript_policy: row.transcript_policy as StoredMedia["transcript_policy"],
  };
  const segRows = media.media_kind === "owned_audio" ? await db.prepare("SELECT id,segment_order,start_ms,end_ms,transcript FROM listening_segments WHERE content_id=? ORDER BY segment_order").bind(id).all<{id:string;segment_order:number;start_ms:number;end_ms:number;transcript:string}>() : { results: [] as Array<{id:string;segment_order:number;start_ms:number;end_ms:number;transcript:string}> };
  return { id:String(row.id), title:String(row.title), school_level:String(row.school_level), topic:row.topic?String(row.topic):null, status:String(row.status), description:row.description?String(row.description):null, source_attribution:row.source_attribution?String(row.source_attribution):null, published_at:row.published_at?String(row.published_at):null, body:safeJson<ListeningBody>(String(row.body_json), { mode:"authentic", learningGoal:"Listen for meaning.", instructions:[], passes:[] }), media, questions, segments: segRows.results };
}

export async function populateListeningMaterial(db:D1Database, contentId:string, args:{material:ListeningMaterial;schoolLevel:"P5"|"P6";skillIds:string[];generationModel:string;sourceAttribution:string;sourceItemUrl:string;licence?:string;media:{mediaKind:"youtube"|"podcast"|"owned_audio"|"external_video";provider:string;externalId?:string;mediaUrl?:string;embedUrl?:string;thumbnailUrl?:string;durationSeconds?:number;madeForKids?:boolean|null;sourceTitle?:string;questionBasis:QuestionBasis;transcriptPolicy?:"not_stored"|"owned"|"licensed"}}){
  const owner=await db.prepare("SELECT tenant_id,scope FROM content_items WHERE id=?").bind(contentId).first<{tenant_id:string|null;scope:"global"|"tenant"}>();
  const tenantId=owner?.tenant_id||null,scope=owner?.scope||"global";
  const skills=(args.skillIds.length?args.skillIds:["L-MAIN","L-DETAIL","L-INFER"]).slice(0,6);
  const statements:D1PreparedStatement[]=[
    db.prepare("DELETE FROM questions WHERE source_content_id=?").bind(contentId),
    db.prepare("DELETE FROM content_skills WHERE content_id=?").bind(contentId),
    db.prepare("DELETE FROM content_versions WHERE content_id=?").bind(contentId),
    db.prepare("UPDATE content_items SET title=?,school_level=?,topic=?,source_url=?,licence=?,status='draft',active_version=1,description=?,source_attribution=?,generation_stage='complete',generation_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(args.material.title,args.schoolLevel,args.material.topic,args.sourceItemUrl||null,args.licence||"reference_only",args.material.description,args.sourceAttribution,contentId),
    db.prepare("INSERT INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES (?,?,?,?,?,?,?)").bind(`${contentId}-v1`,contentId,1,JSON.stringify(args.material.body),args.generationModel,"SG-PRIMARY-ENGLISH-2020-PSLE-2026","draft"),
    db.prepare("INSERT OR REPLACE INTO content_media (content_id,media_kind,provider,external_id,media_url,embed_url,thumbnail_url,duration_seconds,made_for_kids,source_title,source_item_url,question_basis,transcript_policy,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)").bind(contentId,args.media.mediaKind,args.media.provider,args.media.externalId??null,args.media.mediaUrl??null,args.media.embedUrl??null,args.media.thumbnailUrl??null,args.media.durationSeconds??null,typeof args.media.madeForKids==="boolean"?(args.media.madeForKids?1:0):null,args.media.sourceTitle??null,args.sourceItemUrl,args.media.questionBasis,args.media.transcriptPolicy||"not_stored"),
  ];
  for(const skillId of skills)statements.push(db.prepare("INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES (?,?,1)").bind(contentId,skillId));
  for(const [index,q] of args.material.questions.entries()){
    const qid=`q-${crypto.randomUUID()}`,stem={prompt:q.prompt,...(q.options?{options:q.options}:{})},answer=q.questionType==="multiple_choice"?{correctOption:q.correctOption??0}:{acceptedKeywords:q.acceptedKeywords||[],modelAnswer:q.modelAnswer||""};
    statements.push(db.prepare("INSERT INTO questions (id,question_type,school_level,difficulty,stem_json,answer_json,explanation_json,status,source_content_id,curriculum_version_id,generation_model,marks,tenant_id,scope) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(qid,q.questionType,args.schoolLevel,index>1?3:2,JSON.stringify(stem),JSON.stringify(answer),JSON.stringify({text:q.explanation||"Listen again and identify the evidence for your answer."}),"draft",contentId,"SG-PRIMARY-ENGLISH-2020-PSLE-2026",args.generationModel,q.marks||1,tenantId,scope));
    const qSkills=index===0?[skills[0]]:index===1?[skills[1]||skills[0]]:index===2?[skills.find(s=>s==="L-INFER")||skills[0]]:[skills.find(s=>s==="L-EVAL")||skills[0]];
    for(const skillId of qSkills.filter((x):x is string=>Boolean(x)))statements.push(db.prepare("INSERT OR IGNORE INTO question_skills (question_id,skill_id,weight) VALUES (?,?,1)").bind(qid,skillId));
  }
  // One D1 batch keeps the persistence checkpoint well below the Free-plan
  // subrequest ceiling even when the lesson contains several questions/skills.
  await db.batch(statements);
}
