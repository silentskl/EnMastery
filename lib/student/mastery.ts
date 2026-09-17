export async function updateSkillEvidence(db: D1Database, childId: string, skillId: string, evidence: number) {
  const bounded = Math.max(0, Math.min(100, evidence));
  const current = await db.prepare("SELECT mastery,evidence_count,confidence FROM skill_mastery WHERE child_id=? AND skill_id=?").bind(childId, skillId).first<{ mastery: number; evidence_count: number; confidence: number }>();
  const next = current ? Math.round((current.mastery * 0.78 + bounded * 0.22) * 10) / 10 : Math.round((bounded * 0.7 + 15) * 10) / 10;
  const count = (current?.evidence_count || 0) + 1;
  const confidence = Math.min(1, count / 8);
  await db.prepare("INSERT INTO skill_mastery (child_id,skill_id,mastery,evidence_count,confidence,last_evidence_at,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(child_id,skill_id) DO UPDATE SET mastery=excluded.mastery,evidence_count=excluded.evidence_count,confidence=excluded.confidence,last_evidence_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP")
    .bind(childId, skillId, next, count, confidence).run();
}

export async function updateMastery(db: D1Database, childId: string, questionId: string, correct: boolean) {
  const skills = await db.prepare("SELECT skill_id, weight FROM question_skills WHERE question_id=?").bind(questionId).all<{ skill_id: string; weight: number }>();
  for (const skill of skills.results) await updateSkillEvidence(db, childId, skill.skill_id, correct ? 100 : 20);
}
