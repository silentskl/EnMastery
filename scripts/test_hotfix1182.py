from pathlib import Path
import sqlite3, sys
root=Path(__file__).resolve().parents[1]
errors=[]

def txt(path):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return ''
    return p.read_text(errors='ignore')

def need(path,*markers):
    s=txt(path)
    for m in markers:
        if m not in s: errors.append(f'{path}: missing {m}')
    return s

planner=need('lib/student/planner.ts',
    'daily-cache-v12-eligible-before-limit',
    'restoreTodayCompletedAssignments',
    'recoveredFromTodayCompletion:true',
    "learned.status='completed' AND learned.progress_percent>=100",
    "recent.task_date>=? AND recent.task_date<?",
    "p.status='completed' AND p.progress_percent>=100",
    "w.prompt_id=learning_tasks.activity_id AND w.passed=1",
    "COUNT(DISTINCT sp2.mode)",
)
# Hotfix 12.4.4 supersedes the old completion-only rule: any Daily Mission assignment blocks reuse for at least 7 days.
for activity in ['reading','listening','speaking','writing']:
    marker=f"recent.activity_type='{activity}' AND recent.activity_id=c.id"
    pos=planner.find(marker)
    if pos<0: errors.append(f'missing {activity} assignment cooldown')
    elif "recent.status='done'" in planner[pos:pos+220]: errors.append(f'{activity} cooldown must not depend on completion')
if 'Math.max(7,cooldownDays)' not in planner: errors.append('planner must enforce a hard minimum 7-day cooldown')
if "passed_modes||0)>=3" not in planner: errors.append('same-day Speaking recovery must require all three scored modes')

migration=need('migrations/0055_v102_hotfix118_speaking_cooldown.sql',
    "task_date>date('now','+8 hours')",
    "reward_date>date('now','+8 hours')",
)
if "task_date>=date('now','+8 hours')" in migration:
    errors.append('0055 must not destructively rewrite same-day completed tasks')

# Fresh migration path: today's completed cards survive 0055, future legacy cards are still repaired.
try:
    migrations=sorted((root/'migrations').glob('*.sql'))
    if len(migrations)<55: errors.append(f'expected migration 0055 or later, found {len(migrations)} migrations')
    migration55=next((m for m in migrations if m.name=='0055_v102_hotfix118_speaking_cooldown.sql'),None)
    if migration55 is None: raise RuntimeError('migration 0055 is missing')
    db=sqlite3.connect(':memory:')
    for m in migrations:
        if m==migration55: break
        db.executescript(m.read_text())
    today=db.execute("SELECT date('now','+8 hours')").fetchone()[0]
    future=db.execute("SELECT date('now','+8 hours','+1 day')").fetchone()[0]
    db.execute("INSERT INTO users(id,email,role,display_name) VALUES('u1182','u1182@example.com','admin','U')")
    db.execute("INSERT INTO child_profiles(id,parent_user_id,nickname,school_level,tenant_id) VALUES('c1182','u1182','Kid','P6','tenant-default')")
    for task_id,activity,date,status in [
        ('today-listen','listening',today,'done'),('today-speak','speaking',today,'done'),
        ('future-listen','listening',future,'done'),('future-speak','speaking',future,'done')]:
        db.execute("INSERT INTO learning_tasks(id,child_id,task_date,cadence,activity_type,activity_id,title,target_minutes,xp_reward,status,source) VALUES(?,?,?,'daily',?,NULL,?,10,12,?,'adaptive')",(task_id,'c1182',date,activity,task_id,status))
    db.commit(); db.executescript(migration55.read_text())
    if db.execute("SELECT status FROM learning_tasks WHERE id='today-listen'").fetchone()!=('done',): errors.append('0055 removed same-day completed Listening')
    if db.execute("SELECT status FROM learning_tasks WHERE id='today-speak'").fetchone()!=('done',): errors.append('0055 reset same-day completed Speaking')
    if db.execute("SELECT 1 FROM learning_tasks WHERE id='future-listen'").fetchone(): errors.append('0055 no longer removes future legacy placeholder Listening')
    if db.execute("SELECT status FROM learning_tasks WHERE id='future-speak'").fetchone() not in [None,('todo',)]: errors.append('0055 future Speaking repair is unexpected')
except Exception as exc:
    errors.append(f'0055 same-day preservation runtime test failed: {exc}')

if errors:
    print('HOTFIX11.8.2 TEST FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX11.8.2 TEST PASS: same-day PASS preservation/recovery and assignment-based hard 7-day lesson cooldown validated')
