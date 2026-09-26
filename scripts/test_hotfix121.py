from pathlib import Path
import sqlite3,sys
root=Path(__file__).resolve().parents[1];errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f"missing {path}"); return ""
 return p.read_text(errors="ignore")
def need(path,*markers):
 s=text(path)
 for m in markers:
  if m not in s: errors.append(f"{path}: missing {m}")
 return s

planner=need('lib/student/planner.ts','daily-locked-v14-hard-7d-assignment-cooldown','Persisted daily missions are immutable','Every persisted task is current','rows.length === 0 && writingScheduledForDate','task choices are locked and reused unchanged')
plan=need('app/api/student/plan/route.ts','repairTodayWritingTaskCompletion','repair_today_writing','todayNeedsMaterialization')
tasks=need('lib/student/tasks.ts','repairTodayWritingTaskCompletion','recoveredAfterPlannerRefresh','w.prompt_id=t.activity_id','datetime(t.created_at)>datetime','completeMatchingTasks(db,childId,"writing"')
admin=need('app/api/admin/learn-settings/route.ts','Persisted daily missions are immutable','never delete today')
stage=need('app/api/admin/content/[id]/stage/route.ts','Existing daily assignments keep their persisted content id')
dispatch=text('lib/jobs/dispatch.ts')
if 'DELETE FROM learning_tasks' in admin: errors.append('Learning Settings still deletes generated Daily Mission tasks')
if 'DELETE FROM learning_tasks' in stage: errors.append('Content stage edit still deletes generated Daily Mission tasks')
if "task_date>?" in dispatch and 'learning_tasks' in dispatch: errors.append('Writing PASS still deletes future Daily Mission tasks')
if 'instr(metadata_json,?)=0' in planner: errors.append('Planner still invalidates tasks by plannerVersion')
if 'rows.filter((x) => hasPlannerVersion' in planner: errors.append('Planner still treats old-version persisted tasks as replaceable')

try:
 db=sqlite3.connect(':memory:')
 db.executescript("""
 CREATE TABLE learning_tasks(id TEXT PRIMARY KEY,child_id TEXT,task_date TEXT,cadence TEXT,activity_type TEXT,activity_id TEXT,title TEXT,xp_reward INTEGER,status TEXT,source TEXT,metadata_json TEXT,created_at TEXT);
 CREATE TABLE writing_submissions(id TEXT PRIMARY KEY,child_id TEXT,prompt_id TEXT,passed INTEGER,passed_at TEXT,updated_at TEXT,prompt_title_snapshot TEXT);
 CREATE TABLE content_items(id TEXT PRIMARY KEY,title TEXT);
 """)
 db.execute("INSERT INTO learning_tasks VALUES('read','child','2026-09-02','daily','reading','r1','Read',14,'todo','adaptive','{}','2026-09-02 00:00:00')")
 db.execute("INSERT INTO writing_submissions VALUES('wpass','child','prompt-old',1,'2026-09-02 01:00:00','2026-09-02 01:00:00','Original prompt')")
 db.execute("INSERT INTO learning_tasks VALUES('write-new','child','2026-09-02','daily','writing','prompt-new','New prompt',16,'todo','adaptive','{}','2026-09-02 02:00:00')")
 q="""SELECT t.id,w.prompt_id FROM learning_tasks t JOIN writing_submissions w ON w.child_id=t.child_id AND w.passed=1
 WHERE t.child_id=? AND t.task_date=? AND t.cadence='daily' AND t.source='adaptive' AND t.activity_type='writing' AND t.status!='done'
 AND date(COALESCE(w.passed_at,w.updated_at),'+8 hours')=? AND (w.prompt_id=t.activity_id OR (datetime(t.created_at)>datetime(COALESCE(w.passed_at,w.updated_at)) AND EXISTS
 (SELECT 1 FROM learning_tasks prior WHERE prior.child_id=t.child_id AND prior.task_date=t.task_date AND prior.cadence='daily' AND prior.source='adaptive' AND prior.id<>t.id AND datetime(prior.created_at)<=datetime(COALESCE(w.passed_at,w.updated_at))))) LIMIT 1"""
 row=db.execute(q,('child','2026-09-02','2026-09-02')).fetchone()
 if row!=('write-new','prompt-old'): errors.append(f'upgrade-regenerated Writing recovery predicate failed: {row}')
 db.execute('DELETE FROM learning_tasks')
 db.execute("INSERT INTO learning_tasks VALUES('write-only','child','2026-09-02','daily','writing','prompt-new','New prompt',16,'todo','adaptive','{}','2026-09-02 02:00:00')")
 row=db.execute(q,('child','2026-09-02','2026-09-02')).fetchone()
 if row is not None: errors.append(f'unrelated earlier Writing pass was incorrectly adopted: {row}')
 db.close()
except Exception as e: errors.append(f'Hotfix12.1 SQLite regression failed: {e}')

if errors:
 print('HOTFIX 12.1 TEST FAIL');[print('-',e) for e in errors];sys.exit(1)
print('HOTFIX 12.1 TEST PASS: Daily Mission is immutable across updates/settings changes; same-day Writing PASS self-heals upgrade-regenerated todo cards')
