from pathlib import Path
import sqlite3
import sys

root=Path(__file__).resolve().parents[1]
errors=[]

def text(path):
    p=root/path
    if not p.exists():
        errors.append(f'missing {path}')
        return ''
    return p.read_text(errors='ignore')

def need(path,*markers):
    s=text(path)
    for marker in markers:
        if marker not in s:
            errors.append(f'{path}: missing {marker}')
    return s

# 1) One shared Web Speech type surface. No component-level global Window merging.
shared=need('lib/browser/speech-recognition.ts','export type SpeechRecognitionLike','export function getSpeechRecognitionCtor','type SpeechWindow=Window&')
for path in ['components/speaking-workspace.tsx','components/intensive-listening-player.tsx','components/vocabulary/vocabulary-daily-trainer.tsx']:
    s=need(path,'@/lib/browser/speech-recognition')
    if 'declare global' in s or 'interface Window' in s:
        errors.append(f'{path}: must not redeclare global SpeechRecognition Window types')
if 'declare global' in shared:
    errors.append('shared speech-recognition module should use a local Window intersection, not a global declaration')

# 2) Daily cards bind concrete resources. No "choose a ... lesson" placeholders.
planner=need('lib/student/planner.ts',
    'daily-cache-v12-eligible-before-limit',
    'insertStatement(db, childId, date, "reading", r.id',
    'genericMeta(`/learn/read/${r.id}`',
    'insertStatement(db, childId, date, "listening", l.id',
    'genericMeta(`/learn/listen/${l.id}`',
    'unavailable:true',
    'Reading · No eligible lesson available',
    'Listening · No eligible lesson available',
    'getTenantLessonRepeatCooldownDays',
    "learned.status='completed' AND learned.progress_percent>=100",
    "Math.max(7,cooldownDays)",
)
for forbidden in ['choose a reading lesson','choose a listening lesson']:
    if forbidden in planner.lower():
        errors.append(f'planner still creates legacy placeholder: {forbidden}')
if "COALESCE(p.status,'')!='completed'" in planner:
    errors.append('completed Reading/Listening is permanently excluded instead of becoming reusable after cooldown')
if 'WHERE NOT EXISTS (SELECT 1 FROM writing_submissions w WHERE w.prompt_id=c.id AND w.child_id=? AND w.passed=1)' in planner:
    errors.append('passed Writing prompts are permanently excluded instead of becoming reusable after cooldown')

# 3) Cooldown is Tenant configurable, default 7, and applies to all stage rotations.
policy=need('lib/settings/learning-policy.ts','DEFAULT_LESSON_REPEAT_COOLDOWN_DAYS=7','clampLessonRepeatCooldownDays','Math.max(7,Math.min(90,n))','getTenantLessonRepeatCooldownDays')
api=need('app/api/admin/learn-settings/route.ts','lessonRepeatCooldownDays','Persisted daily missions are immutable','never delete today')
ui=need('components/tenant-learn-settings.tsx','Lesson repeat cooldown','lessonRepeatCooldownDays','minimum and default is 7 days','min={7} max={90}')

# 4) Speaking completion is a three-mode score gate, never a tab-click gate.
speaking=need('lib/student/speaking-daily.ts',
    '["conversation","reading_aloud","stimulus"]',
    'Number(scores[mode]??-1)>=passMark',
    'REQUIRED_MODES.every(mode=>passedModes.includes(mode))',
    'if(progress.completed)await completeMatchingTasks(db,args.childId,"speaking")',
)
for path in ['app/api/student/speaking/respond/route.ts','app/api/student/speaking/assess/route.ts']:
    need(path,'recordDailySpeakingModeScore')
# There must be no other direct Speaking completion shortcut.
for p in list((root/'app').rglob('*.ts'))+list((root/'lib').rglob('*.ts')):
    s=p.read_text(errors='ignore')
    if 'completeMatchingTasks' in s and '"speaking"' in s and p.as_posix().endswith('lib/student/speaking-daily.ts') is False:
        # tasks.ts contains generic reconciliation evidence but no direct shortcut call.
        if 'completeMatchingTasks(db' in s and ',"speaking"' in s:
            errors.append(f'{p.relative_to(root)}: direct Speaking task completion bypasses 3-part gate')

# 5) Reading click path is resource-bounded: client shell, in-flight dedupe, daily-assignment fast path.
need('app/learn/read/[id]/page.tsx','"use client"','useParams','<StudentReader id={id}/>')
reader=need('components/student-reader.tsx','const readingLoads=new Map<string,Promise<Content>>()','readingLoads.get(id)','/api/student/content/${encodeURIComponent(id)}','cloudflare_worker_1102')
content_api=need('app/api/student/content/[id]/route.ts','isLessonVisible(env.DB,tenantId,level,"read",id,session.childId)')
availability=need('lib/tenant/lesson-availability.ts','Lightweight visibility check for a single lesson','task_date=date(\'now\',\'+8 hours\')','if(assigned)return true')
plan_ui=need('components/student-plan.tsx','prefetch={false}','No eligible lesson is available under the current Tenant policy/cooldown.','task unavailable')

# 6) Migration works on top of the released 0054 schema and repairs legacy false PASS/placeholders.
migrations=sorted((root/'migrations').glob('*.sql'))
if len(migrations)<55:
    errors.append(f'Hotfix11.8 expects migration 0055 or later, found {len(migrations)} migrations')
migration55=next((m for m in migrations if m.name=='0055_v102_hotfix118_speaking_cooldown.sql'),None)
if migration55 is None:
    errors.append('migration 0055_v102_hotfix118_speaking_cooldown.sql is missing')
else:
    db=sqlite3.connect(':memory:')
    try:
        for m in migrations:
            if m==migration55: break
            db.executescript(m.read_text())
        db.execute("INSERT INTO users(id,email,role,display_name) VALUES('u-test','test@example.com','admin','Test')")
        db.execute("INSERT INTO child_profiles(id,parent_user_id,nickname,school_level,tenant_id) VALUES('c-test','u-test','Kid','P6','tenant-default')")
        db.execute("INSERT INTO learning_tasks(id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source) VALUES('placeholder-read','c-test','2999-01-01','daily','reading',NULL,'Read · choose a reading lesson',12,14,'done','adaptive')")
        db.execute("INSERT INTO xp_ledger(id,child_id,event_type,points,reference_id) VALUES('xp-placeholder','c-test','task_complete',14,'placeholder-read')")
        db.execute("INSERT INTO learning_tasks(id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source) VALUES('speak-done','c-test','2999-01-01','daily','speaking','oral-1','Speak · Test',8,12,'done','adaptive')")
        db.execute("INSERT INTO xp_ledger(id,child_id,event_type,points,reference_id) VALUES('xp-speak','c-test','task_complete',12,'speak-done')")
        db.commit()
        db.executescript(migration55.read_text())
        cols={r[1] for r in db.execute('PRAGMA table_info(tenant_learning_policy)')}
        if 'lesson_repeat_cooldown_days' not in cols: errors.append('0055 missing tenant_learning_policy.lesson_repeat_cooldown_days')
        val=db.execute("SELECT lesson_repeat_cooldown_days FROM tenant_learning_policy WHERE tenant_id='tenant-default'").fetchone()
        if val!=(7,): errors.append(f'0055 default cooldown should be 7, got {val}')
        if db.execute("SELECT 1 FROM learning_tasks WHERE id='placeholder-read'").fetchone(): errors.append('0055 did not remove future legacy Reading placeholder')
        if db.execute("SELECT 1 FROM xp_ledger WHERE reference_id='placeholder-read'").fetchone(): errors.append('0055 did not remove placeholder XP')
        speak_row=db.execute("SELECT status,completed_at FROM learning_tasks WHERE id='speak-done'").fetchone()
        if speak_row!=('todo',None): errors.append(f'0055 did not reset false Speaking PASS: {speak_row}')
        if db.execute("SELECT 1 FROM xp_ledger WHERE reference_id='speak-done'").fetchone(): errors.append('0055 did not remove false Speaking task XP')
        if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='speaking_daily_mode_progress'").fetchone(): errors.append('0055 missing speaking_daily_mode_progress')
    except Exception as exc:
        errors.append(f'0055 runtime migration test failed: {exc}')

if errors:
    print('HOTFIX11.8 TEST FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX11.8 TEST PASS: concrete Daily resources, hard-minimum 7-day lesson cooldown, scored three-part Speaking gate, bounded Reading navigation and shared Web Speech types validated')
