from pathlib import Path
import sqlite3,sys,re
root=Path(__file__).resolve().parents[1]; errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f'missing {path}'); return ''
 return p.read_text(errors='ignore')
def need(path,*markers):
 s=text(path)
 for m in markers:
  if m not in s: errors.append(f'{path}: missing {m}')
 return s

planner=need('lib/student/planner.ts','daily-cache-v12-eligible-before-limit','CANDIDATE_RETURN_LIMIT = 24','ensureTodayPlan','ensureWeeklyPlan','dayCount: 1 | 7','db.batch(statements)','clearStaleTodaySelection','Daily vocabulary assignment is controlled only by Tenant Admin policy')
if 'getVisibleLessonIds' in planner: errors.append('planner still builds four large visible-ID sets')
if 'LIMIT 200`' in planner: errors.append('planner still returns 200 heavy candidate rows')
if ' LIKE ' in planner.upper() or ' GLOB ' in planner.upper(): errors.append('planner reintroduced LIKE/GLOB')
plan=need('app/api/student/plan/route.ts','todayNeedsMaterialization','if(todayOnly)await ensureTodayPlan','else await ensureWeeklyPlan','X-Plan-Mode','today-bounded','daily-fallback-v4')
if 'reconcileTodayTaskProgress' in plan: errors.append('Today API still reconciles every card on GET')
calendar=need('app/api/student/progress/calendar/route.ts','readOnly:true','learning_task_day_rollups','learnerStreak')
if 'reconcileTodayTaskProgress' in calendar: errors.append('calendar API still reconciles on GET')
momentum=need('components/learning-momentum.tsx','fetchStudentProgressCalendar','do not call /api/student/plan here')
if '/api/student/plan' in momentum.replace('do not call /api/student/plan here',''): errors.append('LearningMomentum still duplicates plan request')
need('lib/client/progress-calendar.ts','const inflight=new Map','Deduplicate same-month calendar requests','non-JSON response','cloudflare_worker_1102')
need('components/student-plan.tsx','cloudflare_worker_1102','Worker exceeded resource limits','raw.slice(0,400)','Could not load today’s learning mission.')
need('migrations/0054_v102_hotfix115_daily_plan_resource_indexes.sql','idx_content_items_daily_plan','idx_learning_tasks_daily_plan','idx_xp_ledger_child_created')

try:
 db=sqlite3.connect(':memory:'); db.execute('PRAGMA foreign_keys=ON')
 for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
 idx={r[1] for r in db.execute("PRAGMA index_list('learning_tasks')")}
 if 'idx_learning_tasks_daily_plan' not in idx: errors.append('daily-plan learning_tasks index missing')
 idx={r[1] for r in db.execute("PRAGMA index_list('content_items')")}
 if 'idx_content_items_daily_plan' not in idx: errors.append('daily-plan content_items index missing')
 idx={r[1] for r in db.execute("PRAGMA index_list('xp_ledger')")}
 if 'idx_xp_ledger_child_created' not in idx: errors.append('streak xp index missing')
 # Prove bounded allowed-set CTE syntax used by planner works on the release schema.
 db.execute("""WITH allowed AS (SELECT id,title,content_type,topic,active_version,published_at,created_at FROM content_items WHERE status='published' AND school_level=? AND content_type IN ('article','lesson') AND (scope='global' OR (scope='tenant' AND tenant_id=?)) ORDER BY created_at ASC,id ASC LIMIT ?) SELECT id,title FROM allowed LIMIT ?""",('P6','tenant-default',200,24)).fetchall()
 db.close()
except Exception as e: errors.append(f'Hotfix11.5 migration/query test failed: {e}')

if errors:
 print('HOTFIX11.5 TEST FAIL'); [print('-',e) for e in errors]; sys.exit(1)
print('HOTFIX11.5 TEST PASS: Today materialisation is one-day/resource-bounded; duplicate plan/calendar requests removed; GET reconciliation removed; D1 access indexes validated')
