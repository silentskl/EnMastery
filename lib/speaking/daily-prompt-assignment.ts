import type { LearningStage } from "@/lib/language/stages";
import type { SpeakingMode, SpeakingPrompt } from "@/lib/speaking/types";
import { getTenantLessonRepeatCooldownDays } from "@/lib/settings/learning-policy";
import { effectiveLessonLimit } from "@/lib/tenant/lesson-availability";
import { addDays, sgDate } from "@/lib/student/tasks";

const MODES: SpeakingMode[] = ["conversation", "reading_aloud", "stimulus"];

type AssignmentRow = { mode: SpeakingMode; prompt_id: string };
type PromptRow = {
  id: string;
  title: string;
  school_level: string;
  topic: string | null;
  description: string | null;
  body_json: string;
};

function modeFromBody(body: Record<string, unknown>): SpeakingMode {
  return body.mode === "reading_aloud" || body.mode === "stimulus" ? body.mode : "conversation";
}

function firstString(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function toPrompt(row: PromptRow): SpeakingPrompt {
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(row.body_json) as Record<string, unknown>; } catch {}
  const mode = modeFromBody(body);
  return {
    id: row.id,
    title: row.title,
    schoolLevel: row.school_level,
    topic: row.topic,
    description: row.description,
    mode,
    prompt: typeof body.prompt === "string" ? body.prompt : "Speak about this topic.",
    referenceText: typeof body.referenceText === "string" ? body.referenceText : undefined,
    stimulusAlt: firstString(body, ["stimulusAlt", "stimulus_alt", "imageAlt", "image_alt"]),
    stimulusImageUrl: firstString(body, ["stimulusImageUrl", "stimulus_image_url", "imageUrl", "image_url", "image"]),
    stimulusImageAlt: firstString(body, ["stimulusImageAlt", "stimulus_image_alt", "imageDescription", "image_description", "imageAlt", "image_alt"]),
  };
}

async function loadPrompt(db: D1Database, promptId: string): Promise<SpeakingPrompt | null> {
  const row = await db.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,v.body_json
    FROM content_items c
    JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
    WHERE c.id=? AND c.content_type='oral_prompt'
    LIMIT 1`).bind(promptId).first<PromptRow>();
  return row ? toPrompt(row) : null;
}


async function wasRecentlyUsed(
  db: D1Database,
  childId: string,
  mode: SpeakingMode,
  promptId: string,
  cooldownStart: string,
  taskDate: string,
): Promise<boolean> {
  const row = await db.prepare(`SELECT
      EXISTS(SELECT 1 FROM speaking_daily_prompt_assignments a
        WHERE a.child_id=? AND a.mode=? AND a.prompt_id=? AND a.task_date>=? AND a.task_date<?)
      OR EXISTS(SELECT 1 FROM speaking_daily_mode_progress p
        WHERE p.child_id=? AND p.mode=? AND p.prompt_id=? AND p.task_date>=? AND p.task_date<?)
      OR EXISTS(SELECT 1 FROM learning_tasks t
        WHERE t.child_id=? AND t.activity_type='speaking' AND t.activity_id=? AND t.task_date>=? AND t.task_date<?) AS blocked`)
    .bind(
      childId,mode,promptId,cooldownStart,taskDate,
      childId,mode,promptId,cooldownStart,taskDate,
      childId,promptId,cooldownStart,taskDate,
    ).first<{blocked:number}>();
  return Boolean(row?.blocked);
}

async function candidateForMode(
  db: D1Database,
  args: {
    childId: string;
    tenantId: string;
    stage: LearningStage;
    mode: SpeakingMode;
    taskDate: string;
    cooldownStart: string;
    visibleLimit: number;
  },
): Promise<SpeakingPrompt | null> {
  if (args.visibleLimit <= 0) return null;
  const row = await db.prepare(`SELECT c.id,c.title,c.school_level,c.topic,c.description,v.body_json
    FROM content_items c
    JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version
    WHERE c.status='published' AND c.school_level=? AND c.content_type='oral_prompt'
      AND (c.scope='global' OR (c.scope='tenant' AND c.tenant_id=?))
      AND COALESCE(json_extract(v.body_json,'$.examTrack'),'') <> 'PET'
      AND (CASE
        WHEN json_extract(v.body_json,'$.mode')='reading_aloud' THEN 'reading_aloud'
        WHEN json_extract(v.body_json,'$.mode')='stimulus' THEN 'stimulus'
        ELSE 'conversation'
      END)=?
      AND NOT EXISTS (
        SELECT 1 FROM speaking_daily_prompt_assignments assigned
        WHERE assigned.child_id=? AND assigned.mode=? AND assigned.prompt_id=c.id
          AND assigned.task_date>=? AND assigned.task_date<?
      )
      AND NOT EXISTS (
        SELECT 1 FROM speaking_daily_mode_progress attempted
        WHERE attempted.child_id=? AND attempted.mode=? AND attempted.prompt_id=c.id
          AND attempted.task_date>=? AND attempted.task_date<?
      )
      AND NOT EXISTS (
        SELECT 1 FROM learning_tasks recent_task
        WHERE recent_task.child_id=? AND recent_task.activity_type='speaking' AND recent_task.activity_id=c.id
          AND recent_task.task_date>=? AND recent_task.task_date<?
      )
    ORDER BY COALESCE(c.published_at,c.created_at) ASC,c.created_at ASC,c.id ASC
    LIMIT ?`)
    .bind(
      args.stage,args.tenantId,args.mode,
      args.childId,args.mode,args.cooldownStart,args.taskDate,
      args.childId,args.mode,args.cooldownStart,args.taskDate,
      args.childId,args.cooldownStart,args.taskDate,
      Math.max(1,Math.min(200,args.visibleLimit)),
    ).first<PromptRow>();
  return row ? toPrompt(row) : null;
}

/**
 * Materialise exactly one prompt for each Daily Speaking mode.
 *
 * The three mode assignments are persisted independently from the outer
 * learning_tasks Speaking card.  This fixes the old behaviour where the page
 * returned the entire cached prompt catalogue and the client simply chose the
 * first conversation/reading/stimulus item every day.
 *
 * Any prompt used in the previous configured cooldown window (hard minimum 7
 * days) is ineligible, regardless of whether the learner passed, failed, or
 * merely received that persisted daily assignment.
 */
export async function ensureDailySpeakingPromptAssignments(
  db: D1Database,
  childId: string,
  tenantId: string,
  stage: LearningStage,
  taskDate = sgDate(),
): Promise<{ taskDate: string; cooldownDays: number; prompts: SpeakingPrompt[] }> {
  const cooldownDays = Math.max(7, await getTenantLessonRepeatCooldownDays(db, tenantId));
  const cooldownStart = addDays(taskDate, -cooldownDays);

  let existing = await db.prepare(`SELECT mode,prompt_id
    FROM speaking_daily_prompt_assignments
    WHERE child_id=? AND task_date=? AND mode IN ('conversation','reading_aloud','stimulus')`)
    .bind(childId,taskDate).all<AssignmentRow>();

  // A legacy cache-only id (for example cached-P5-conversation) has no
  // content_items row. Do not let such an orphan freeze the new rotation.
  for (const assignment of existing.results) {
    if (!await loadPrompt(db, assignment.prompt_id)) {
      await db.prepare("DELETE FROM speaking_daily_prompt_assignments WHERE child_id=? AND task_date=? AND mode=?")
        .bind(childId,taskDate,assignment.mode).run();
    }
  }

  existing = await db.prepare(`SELECT mode,prompt_id
    FROM speaking_daily_prompt_assignments
    WHERE child_id=? AND task_date=? AND mode IN ('conversation','reading_aloud','stimulus')`)
    .bind(childId,taskDate).all<AssignmentRow>();
  const have = new Set(existing.results.map((row) => row.mode));
  const visibleLimit = await effectiveLessonLimit(db, tenantId, stage, "speak", 200);

  // Keep the outer Daily Mission card and the three-part Speaking bundle aligned
  // whenever the card's concrete prompt is itself eligible.  This preserves the
  // Start-link `?prompt=` target without weakening the hard repeat window.
  if (visibleLimit > 0) {
    const outer = await db.prepare(`SELECT activity_id FROM learning_tasks
      WHERE child_id=? AND task_date=? AND cadence='daily' AND activity_type='speaking'
        AND activity_id IS NOT NULL
      ORDER BY created_at ASC LIMIT 1`).bind(childId,taskDate).first<{activity_id:string}>();
    if (outer?.activity_id) {
      const prompt = await loadPrompt(db,outer.activity_id);
      if (prompt && prompt.schoolLevel === stage && !have.has(prompt.mode)
          && !await wasRecentlyUsed(db,childId,prompt.mode,prompt.id,cooldownStart,taskDate)) {
        await db.prepare(`INSERT OR IGNORE INTO speaking_daily_prompt_assignments(child_id,task_date,mode,prompt_id)
          VALUES(?,?,?,?)`).bind(childId,taskDate,prompt.mode,prompt.id).run();
        have.add(prompt.mode);
      }
    }
  }

  for (const mode of MODES) {
    if (have.has(mode)) continue;
    const prompt = await candidateForMode(db, { childId, tenantId, stage, mode, taskDate, cooldownStart, visibleLimit });
    if (!prompt) continue; // hard no-repeat wins over silently reusing yesterday's content.
    await db.prepare(`INSERT OR IGNORE INTO speaking_daily_prompt_assignments(child_id,task_date,mode,prompt_id)
      VALUES(?,?,?,?)`).bind(childId,taskDate,mode,prompt.id).run();
  }

  // Re-read after INSERT OR IGNORE so concurrent requests return the same
  // persisted assignments rather than whichever candidate each request saw.
  const finalRows = await db.prepare(`SELECT mode,prompt_id
    FROM speaking_daily_prompt_assignments
    WHERE child_id=? AND task_date=? AND mode IN ('conversation','reading_aloud','stimulus')`)
    .bind(childId,taskDate).all<AssignmentRow>();
  const byMode = new Map(finalRows.results.map((row) => [row.mode,row.prompt_id] as const));
  const prompts: SpeakingPrompt[] = [];
  for (const mode of MODES) {
    const promptId = byMode.get(mode);
    if (!promptId) continue;
    const prompt = await loadPrompt(db,promptId);
    if (prompt && prompt.mode === mode) prompts.push(prompt);
  }
  return { taskDate, cooldownDays, prompts };
}
