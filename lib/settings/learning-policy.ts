export const DEFAULT_PASS_SCORE=60;
export const DEFAULT_DAILY_GAME_MINUTES=10;
export const DEFAULT_LESSON_REPEAT_COOLDOWN_DAYS=7;
export function clampPassScore(value:unknown){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(1,Math.min(100,n)):DEFAULT_PASS_SCORE}
export function clampDailyGameMinutes(value:unknown){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(0,Math.min(60,n)):DEFAULT_DAILY_GAME_MINUTES}
export function clampLessonRepeatCooldownDays(value:unknown){const n=Math.round(Number(value));return Number.isFinite(n)?Math.max(0,Math.min(90,n)):DEFAULT_LESSON_REPEAT_COOLDOWN_DAYS}
export async function getTenantPassScore(db:D1Database,tenantId:string){const row=await db.prepare("SELECT pass_score FROM tenant_learning_policy WHERE tenant_id=?").bind(tenantId).first<{pass_score:number}>().catch(()=>null);return clampPassScore(row?.pass_score??DEFAULT_PASS_SCORE)}
export async function getTenantDailyGameMinutes(db:D1Database,tenantId:string){const row=await db.prepare("SELECT daily_game_minutes FROM tenant_learning_policy WHERE tenant_id=?").bind(tenantId).first<{daily_game_minutes:number}>().catch(()=>null);return clampDailyGameMinutes(row?.daily_game_minutes??DEFAULT_DAILY_GAME_MINUTES)}
export async function getTenantLessonRepeatCooldownDays(db:D1Database,tenantId:string){const row=await db.prepare("SELECT lesson_repeat_cooldown_days FROM tenant_learning_policy WHERE tenant_id=?").bind(tenantId).first<{lesson_repeat_cooldown_days:number}>().catch(()=>null);return clampLessonRepeatCooldownDays(row?.lesson_repeat_cooldown_days??DEFAULT_LESSON_REPEAT_COOLDOWN_DAYS)}
export async function getLearnerPassScore(db:D1Database,childId:string){const row=await db.prepare("SELECT COALESCE(tenant_id,'tenant-default') tenant_id FROM child_profiles WHERE id=?").bind(childId).first<{tenant_id:string}>();return getTenantPassScore(db,row?.tenant_id||"tenant-default")}
