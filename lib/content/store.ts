import type { AdaptedLearningMaterial, LearningBody, LearningQuestion } from "@/lib/content/types";

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function insertLearningMaterial(db: D1Database, args: {
  material: AdaptedLearningMaterial;
  schoolLevel: "P5" | "P6";
  sourceUrl?: string;
  sourceAttribution?: string;
  generationModel?: string;
  skillIds?: string[];
  status?: "draft" | "published";
  tenantId?: string | null;
}) {
  const id = `content-${crypto.randomUUID()}`;
  const versionId = `${id}-v1`;
  const status = args.status || "draft", tenantId=args.tenantId||null, scope=tenantId?"tenant":"global";
  await db.batch([
    db.prepare("INSERT INTO content_items (id,content_type,title,school_level,topic,source_url,licence,status,active_version,description,source_attribution,published_at,tenant_id,scope) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(id, "article", args.material.title, args.schoolLevel, args.material.topic, args.sourceUrl || null, "reference_only", status, 1, args.material.description, args.sourceAttribution || null, status === "published" ? new Date().toISOString() : null, tenantId, scope),
    db.prepare("INSERT INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES (?,?,?,?,?,?,?)")
      .bind(versionId, id, 1, JSON.stringify(args.material.body), args.generationModel || null, "SG-PRIMARY-ENGLISH-2020-PSLE-2026", status === "published" ? "approved" : "draft"),
  ]);

  for (const skillId of (args.skillIds || []).slice(0, 6)) {
    await db.prepare("INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES (?,?,1)").bind(id, skillId).run();
  }

  const defaultSkills = (args.skillIds?.length ? args.skillIds : ["R-LITERAL", "R-INFER", "R-VOCAB"]).slice(0, 4);
  for (const [index, q] of args.material.questions.entries()) {
    const questionId = `q-${crypto.randomUUID()}`;
    const stem = { prompt: q.prompt, ...(q.options ? { options: q.options } : {}) };
    const answer = q.questionType === "multiple_choice"
      ? { correctOption: q.correctOption ?? 0 }
      : { acceptedKeywords: q.acceptedKeywords || [], modelAnswer: q.modelAnswer || "" };
    await db.prepare("INSERT INTO questions (id,question_type,school_level,difficulty,stem_json,answer_json,explanation_json,status,source_content_id,curriculum_version_id,generation_model,marks,tenant_id,scope) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(questionId, q.questionType, args.schoolLevel, index > 1 ? 3 : 2, JSON.stringify(stem), JSON.stringify(answer), JSON.stringify({ text: q.explanation || "Review the passage and identify the evidence that supports your answer." }), status === "published" ? "published" : "draft", id, "SG-PRIMARY-ENGLISH-2020-PSLE-2026", args.generationModel || null, q.marks || 1, tenantId, scope).run();
    for (const skillId of defaultSkills.slice(0, index === 0 ? 1 : 2)) {
      await db.prepare("INSERT OR IGNORE INTO question_skills (question_id,skill_id,weight) VALUES (?,?,1)").bind(questionId, skillId).run();
    }
  }
  return id;
}

export type StoredQuestion = {
  id: string; question_type: string; stem_json: string; answer_json: string; explanation_json: string | null; marks: number; status: string;
  stem: Record<string, unknown>; answer: Record<string, unknown>; explanation: Record<string, unknown>;
};

export type StoredContent = {
  id: string; title: string; school_level: string; topic: string | null; status: string; description: string | null;
  source_url: string | null; source_attribution: string | null; published_at: string | null; body: LearningBody; questions: StoredQuestion[];
};

export async function getContent(db: D1Database, id: string, publishedOnly = false): Promise<StoredContent | null> {
  const row = await db.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.status,c.description,c.source_url,c.source_attribution,c.published_at,v.body_json,v.review_status FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version WHERE c.id=? ${publishedOnly ? "AND c.status='published'" : ""}`).bind(id).first<{ id:string; title:string; school_level:string; topic:string|null; status:string; description:string|null; source_url:string|null; source_attribution:string|null; published_at:string|null; body_json:string; review_status:string }>();
  if (!row) return null;
  const questionRows = await db.prepare(`SELECT id, question_type, stem_json, answer_json, explanation_json, marks, status FROM questions WHERE source_content_id=? ${publishedOnly ? "AND status='published'" : ""} ORDER BY created_at, id`).bind(id).all<{ id:string; question_type:string; stem_json:string; answer_json:string; explanation_json:string|null; marks:number; status:string }>();
  const questions: StoredQuestion[] = questionRows.results.map((q) => ({ ...q, stem: safeJson<Record<string,unknown>>(q.stem_json, {}), answer: safeJson<Record<string,unknown>>(q.answer_json, {}), explanation: safeJson<Record<string,unknown>>(q.explanation_json, {}) }));
  return { id:row.id,title:row.title,school_level:row.school_level,topic:row.topic,status:row.status,description:row.description,source_url:row.source_url,source_attribution:row.source_attribution,published_at:row.published_at,body:safeJson<LearningBody>(row.body_json,{paragraphs:[]}),questions };
}

export function questionForStudent(q: Record<string, unknown>) {
  return { id: q.id, questionType: q.question_type, stem: q.stem, marks: q.marks };
}

export function scoreQuestion(questionType: string, answerJson: string, response: unknown) {
  const answer = safeJson<Record<string, unknown>>(answerJson, {});
  if (questionType === "multiple_choice") {
    const optionIndex = typeof (response as { optionIndex?: unknown })?.optionIndex === "number" ? (response as { optionIndex: number }).optionIndex : -1;
    const correct = optionIndex === Number(answer.correctOption);
    return { correct, ratio: correct ? 1 : 0, feedback: correct ? "Correct." : "Not quite. Review the relevant sentence and try to explain why the correct option fits the passage." };
  }
  const text = typeof (response as { text?: unknown })?.text === "string" ? (response as { text: string }).text.toLowerCase() : "";
  const keywords = Array.isArray(answer.acceptedKeywords) ? answer.acceptedKeywords.filter((x): x is string => typeof x === "string") : [];
  const hits = keywords.filter((k) => text.includes(k.toLowerCase())).length;
  const needed = Math.max(1, Math.ceil(Math.min(keywords.length, 4) / 2));
  const correct = hits >= needed;
  return { correct, ratio: correct ? 1 : Math.min(0.5, hits / Math.max(needed, 1) / 2), feedback: correct ? "Good. Your answer includes the key idea from the passage." : `Include clearer evidence or key ideas from the passage.${answer.modelAnswer ? ` Model answer: ${String(answer.modelAnswer)}` : ""}` };
}

export async function populateLearningMaterial(db:D1Database, contentId:string, args:{material:AdaptedLearningMaterial;schoolLevel:"P5"|"P6";sourceUrl?:string;sourceAttribution?:string;generationModel?:string;skillIds?:string[];licence?:string}){
  const owner=await db.prepare("SELECT tenant_id,scope FROM content_items WHERE id=?").bind(contentId).first<{tenant_id:string|null;scope:"global"|"tenant"}>();const tenantId=owner?.tenant_id||null,scope=owner?.scope||"global";
  await db.prepare("DELETE FROM questions WHERE source_content_id=?").bind(contentId).run();
  await db.prepare("DELETE FROM content_skills WHERE content_id=?").bind(contentId).run();
  await db.prepare("DELETE FROM content_versions WHERE content_id=?").bind(contentId).run();
  await db.batch([
    db.prepare("UPDATE content_items SET title=?,school_level=?,topic=?,source_url=?,licence=?,status='draft',active_version=1,description=?,source_attribution=?,generation_stage='complete',generation_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(args.material.title,args.schoolLevel,args.material.topic,args.sourceUrl||null,args.licence||"reference_only",args.material.description,args.sourceAttribution||null,contentId),
    db.prepare("INSERT INTO content_versions (id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES (?,?,?,?,?,?,?)")
      .bind(`${contentId}-v1`,contentId,1,JSON.stringify(args.material.body),args.generationModel||null,"SG-PRIMARY-ENGLISH-2020-PSLE-2026","draft"),
  ]);
  const skills=(args.skillIds?.length?args.skillIds:["R-LITERAL","R-INFER","R-VOCAB"]).slice(0,6);
  for(const skillId of skills)await db.prepare("INSERT OR IGNORE INTO content_skills (content_id,skill_id,coverage) VALUES (?,?,1)").bind(contentId,skillId).run();
  for(const [index,q] of args.material.questions.entries()){
    const questionId=`q-${crypto.randomUUID()}`;const stem={prompt:q.prompt,...(q.options?{options:q.options}:{})};const answer=q.questionType==="multiple_choice"?{correctOption:q.correctOption??0}:{acceptedKeywords:q.acceptedKeywords||[],modelAnswer:q.modelAnswer||""};
    await db.prepare("INSERT INTO questions (id,question_type,school_level,difficulty,stem_json,answer_json,explanation_json,status,source_content_id,curriculum_version_id,generation_model,marks,tenant_id,scope) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(questionId,q.questionType,args.schoolLevel,index>1?3:2,JSON.stringify(stem),JSON.stringify(answer),JSON.stringify({text:q.explanation||"Review the passage and identify the evidence that supports your answer."}),"draft",contentId,"SG-PRIMARY-ENGLISH-2020-PSLE-2026",args.generationModel||null,q.marks||1,tenantId,scope).run();
    for(const skillId of skills.slice(0,index===0?1:2))await db.prepare("INSERT OR IGNORE INTO question_skills (question_id,skill_id,weight) VALUES (?,?,1)").bind(questionId,skillId).run();
  }
}
