from pathlib import Path
import sqlite3, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f"missing {path}"); return ""
 return p.read_text(errors="ignore")
def need(path,*markers):
 s=text(path)
 for marker in markers:
  if marker not in s: errors.append(f"{path}: missing {marker}")

# Hotfix 11.5 supersedes request-time reconciliation: page GETs are read-mostly.
plan=text('app/api/student/plan/route.ts')
need('app/api/student/plan/route.ts','ensureTodayPlan','ensureWeeklyPlan','today-bounded','Cache-Control","no-store, max-age=0')
if 'reconcileTodayTaskProgress' in plan: errors.append('plan GET still performs request-time completion reconciliation')
calendar=text('app/api/student/progress/calendar/route.ts')
need('app/api/student/progress/calendar/route.ts','readOnly:true','learning_task_day_rollups','learnerStreak')
if 'reconcileTodayTaskProgress' in calendar: errors.append('calendar GET still performs request-time completion reconciliation')

# Activity completion/reconciliation utilities remain isolated and available to write paths/maintenance.
tasks=text('lib/student/tasks.ts')
need('lib/student/tasks.ts','DailyTaskReconcileResult','read_completion_evidence','cleanup_stale_task_xp','cleanup_stale_daily_reward','daily reward reconciliation failed','remove_stale_task')
if 'db.batch([' in tasks: errors.append('stale Daily Task cleanup still uses one all-or-nothing db.batch')

# Planner stale selection hygiene is bounded to today only.
need('lib/student/planner.ts','clearStaleTodaySelection','stale today-task cleanup skipped',"task_date=?","daily-cache-v12-eligible-before-limit")

try:
 db=sqlite3.connect(':memory:'); db.execute('PRAGMA foreign_keys=ON')
 for migration in sorted((root/'migrations').glob('*.sql')): db.executescript(migration.read_text())
 db.execute("INSERT INTO users (id,email,role,display_name) VALUES ('parent-h9','parent-h9@example.com','parent','Parent H9')")
 db.execute("INSERT INTO users (id,email,role,display_name) VALUES ('student-h9','student-h9@example.com','student','Student H9')")
 db.execute("INSERT INTO child_profiles (id,parent_user_id,learner_user_id,nickname,school_level,tenant_id) VALUES ('child-h9','parent-h9','student-h9','Learner H9','P6','tenant-default')")
 db.execute("INSERT INTO content_items (id,content_type,title,school_level,status) VALUES ('read-h9','article','Reading H9','P6','published')")
 db.execute("INSERT INTO learner_content_progress (child_id,content_id,status,progress_percent,completed_at,updated_at) VALUES ('child-h9','read-h9','completed',100,'2026-08-31 02:00:00','2026-08-31 02:00:00')")
 row=db.execute("""SELECT CASE WHEN date(COALESCE(completed_at,updated_at),'+8 hours')='2026-09-01' THEN 1 ELSE 0 END today,
 CASE WHEN date(COALESCE(completed_at,updated_at),'+8 hours')<'2026-09-01' THEN 1 ELSE 0 END before FROM learner_content_progress WHERE child_id='child-h9' AND content_id='read-h9'""").fetchone()
 if row!=(0,1): errors.append(f'rollover evidence classification wrong: {row}')
 db.close()
except Exception as exc: errors.append(f'Hotfix 9 schema/runtime test failed: {exc}')

if errors:
 print('HOTFIX9 TEST FAIL'); [print('-',e) for e in errors]; sys.exit(1)
print('HOTFIX9 TEST PASS: Today/calendar GETs are read-mostly; completion utilities remain isolated; immutable-plan policy supersedes stale selection deletion')
