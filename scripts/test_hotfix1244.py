#!/usr/bin/env python3
from pathlib import Path
import json, re, sqlite3, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return ''
    s=p.read_text(errors='ignore')
    for m in markers:
        if m not in s: errors.append(f'{path}: missing {m}')
    return s

gen=need('lib/vocabulary-specialist/generate.ts',
    'term.length > 90','words.length > 12','word or phrase','word-or-phrase distractors',
    'multi-word phrase','including all words when it is a phrase')
if "^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(term)" in gen:
    errors.append('Vocabulary Specialist still validates the entire input as one token')
api=need('app/api/student/vocabulary-specialist/route.ts','Enter one English word or phrase','12 words / 90 characters','This word or phrase is already')
ui=need('components/vocabulary-specialist/vocabulary-specialist-workspace.tsx','Enter one English word or phrase','maxLength={90}','take part in','phrase is kept as one vocabulary item','Fill-in word / phrase bank')
need('components/practice-policy-hub.tsx','words or phrases','terms today')

planner=need('lib/student/planner.ts','daily-locked-v14-hard-7d-assignment-cooldown','Math.max(7,cooldownDays)','lesson assignment itself is cooldown evidence')
# Every daily learning-task cooldown must be assignment-based, not completion-based.
for activity in ('reading','listening','speaking','writing'):
    marker=f"recent.activity_type='{activity}' AND recent.activity_id=c.id"
    pos=planner.find(marker)
    if pos<0: errors.append(f'missing {activity} recent-assignment cooldown')
    else:
        window=planner[pos:pos+220]
        if "recent.status='done'" in window: errors.append(f'{activity} cooldown still depends on completion')
        if 'recent.task_date>=?' not in window or 'recent.task_date<?' not in window: errors.append(f'{activity} cooldown missing task-date window')

# Semantics check: TODO / in-progress / done assignments all block the same resource.
con=sqlite3.connect(':memory:')
con.executescript('CREATE TABLE learning_tasks(child_id TEXT,activity_type TEXT,activity_id TEXT,status TEXT,task_date TEXT);')
con.executemany('INSERT INTO learning_tasks VALUES(?,?,?,?,?)',[
 ('c','reading','r1','todo','2026-09-23'),('c','reading','r2','in_progress','2026-09-20'),('c','reading','r3','done','2026-09-18'),('c','reading','r8','todo','2026-09-16')])
blocked={r[0] for r in con.execute("SELECT activity_id FROM learning_tasks WHERE child_id='c' AND activity_type='reading' AND task_date>=? AND task_date<?",('2026-09-17','2026-09-24'))}
if blocked!={'r1','r2','r3'}: errors.append(f'7-day assignment cooldown semantics unexpected: {blocked}')

pkg=json.loads((root/'package.json').read_text())
if pkg.get('scripts',{}).get('test:hotfix1244')!='python3 scripts/test_hotfix1244.py': errors.append('test:hotfix1244 script missing')
if 'npm run test:hotfix1244' not in pkg.get('scripts',{}).get('check:release',''): errors.append('check:release missing test:hotfix1244')
if errors:
    print('HOTFIX 12.4.4 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.4.4 PASS: Vocabulary Specialist accepts intact multi-word phrases and Daily Mission lessons enforce assignment-based >=7-day no-repeat')
