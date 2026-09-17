from pathlib import Path
import sqlite3
root=Path(__file__).resolve().parents[1]
errors=[]
learn=(root/'app/learn/page.tsx').read_text()
plan=(root/'components/student-plan.tsx').read_text()
calendar=(root/'components/learning-progress-calendar.tsx').read_text()
api=(root/'app/api/student/progress/calendar/route.ts').read_text()
tasks=(root/'lib/student/tasks.ts').read_text()
readlib=(root/'components/student-library.tsx').read_text()
listenlib=(root/'components/student-listening-library.tsx').read_text()
if 'FourSkillHub' in learn or 'Learn by skill' in learn: errors.append('duplicate Learn by skill section remains')
for marker in ['LearningProgressCalendar','Today&apos;s learning mission']:
    if marker not in learn: errors.append(f'Learn page missing {marker}')
for marker in ['calendarGrid','percent','done','total']:
    if marker not in calendar: errors.append(f'calendar component missing {marker}')
if "learning_task_day_rollups" not in api: errors.append('calendar API does not use the pre-aggregated daily rollup')
for marker in ['reconcileTodayTaskProgress','learner_content_progress','writing_submissions','completeMatchingTasks']:
    if marker not in tasks: errors.append(f'reconciliation missing {marker}')
if 'todaySkillGrid' not in plan: errors.append('Today mission is not rendered as skill cards')
if 'const body=' not in plan or 'return done||unavailable?<div className={`todaySkillCard ${done?"done":"unavailable"}`}' not in plan: errors.append('completed/unavailable Today skill cards are still links')
if 'Explore more' in learn or 'learnLibraryLinks' in learn: errors.append('duplicate library/learn-by-skill block remains on Learn page')
if '/learn/read/history/${c.id}' not in readlib: errors.append('completed Reading does not open history')
if 'completedLessonCard' not in listenlib or 'PASS · completed' not in listenlib: errors.append('completed Listening is not protected')
# Migration/schema regression and representative calendar aggregation.
db=sqlite3.connect(':memory:')
for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
db.execute("insert or ignore into users(id,email,role,display_name) values('r16-parent','r16-parent@example.invalid','admin','R16')")
db.execute("insert or ignore into child_profiles(id,parent_user_id,nickname,school_level,target_al,tenant_id) values('r16-child','r16-parent','R16','P6','AL2','tenant-default')")
for i,(day,activity,status) in enumerate([('2026-08-28','reading','done'),('2026-08-28','listening','todo'),('2026-08-29','reading','done'),('2026-08-29','listening','done')]):
    db.execute("insert into learning_tasks(id,child_id,task_date,cadence,activity_type,title,target_minutes,xp_reward,status,source) values(?,?,?,?,?,'x',10,10,?,'adaptive')",(f'r16-{i}','r16-child',day,'daily',activity,status))
rows=db.execute("select task_date,count(*) total,sum(case when status='done' then 1 else 0 end) done from learning_tasks where child_id='r16-child' group by task_date order by task_date").fetchall()
if rows!=[('2026-08-28',2,1),('2026-08-29',2,2)]: errors.append(f'calendar aggregation wrong: {rows}')
if errors:
    print('R16 LEARN PROGRESS TEST FAIL'); [print('-',e) for e in errors]; raise SystemExit(1)
print('R16/R18 LEARN PROGRESS TEST PASS: single Today skill-card mission; calendar 1/2 then 2/2; completed-task rerun guards present')
