#!/usr/bin/env python3
from pathlib import Path
import re, sqlite3, sys
ROOT=Path(__file__).resolve().parents[1]
planner=(ROOT/'lib/student/planner.ts').read_text()
errors=[]
def require(x,msg):
    if not x: errors.append(msg)

require('daily-cache-v12-eligible-before-limit' in planner,'planner v12 marker missing')
require('dailyLimitRelaxed:Boolean(r.daily_limit_relaxed)' in planner,'Reading availability fallback metadata missing')
require('dailyLimitRelaxed:Boolean(l.daily_limit_relaxed)' in planner,'Listening availability fallback metadata missing')
require("recent_write.passed=1" in planner,'Writing PASS history remains supported in addition to assignment cooldown')
require("passed_mode.passed=1 AND passed_mode.mode IN ('conversation','reading_aloud','stimulus')" in planner,'Speaking PASS history remains supported in addition to assignment cooldown')

def sql_for(name):
    m=re.search(rf"async function {name}\([^)]*\)[^{{]*\{{.*?db\.prepare\(`(.*?)`\)",planner,re.S)
    if not m:
        errors.append(f'{name} SQL not found'); return ''
    return m.group(1)

read_sql=sql_for('readingCandidates')
listen_sql=sql_for('listeningCandidates')
speak_sql=sql_for('speakingCandidates')
write_sql=sql_for('writingCandidates')
for name,sql in [('reading',read_sql),('listening',listen_sql),('speaking',speak_sql),('writing',write_sql)]:
    require('WITH allowed AS' not in sql,f'{name}: old pre-limited allowed CTE still present')
    # The only LIMIT must be after the cooldown predicates.
    if sql:
        limit_pos=sql.rfind('LIMIT ?')
        cooldown_pos=max(sql.rfind('recent.task_date>=?'),sql.rfind('recent_write.passed=1'),sql.rfind('passed_mode.passed=1'))
        require(limit_pos>cooldown_pos>=0,f'{name}: tenant limit still runs before completion/cooldown eligibility')

if not errors:
    con=sqlite3.connect(':memory:')
    con.executescript('''
      CREATE TABLE content_items(id TEXT PRIMARY KEY,title TEXT,content_type TEXT,topic TEXT,status TEXT,school_level TEXT,scope TEXT,tenant_id TEXT,active_version INTEGER,published_at TEXT,created_at TEXT);
      CREATE TABLE content_versions(content_id TEXT,version INTEGER,body_json TEXT);
      CREATE TABLE learner_content_progress(child_id TEXT,content_id TEXT,status TEXT,progress_percent INTEGER,completed_at TEXT,updated_at TEXT);
      CREATE TABLE learning_tasks(child_id TEXT,activity_type TEXT,activity_id TEXT,status TEXT,task_date TEXT);
      CREATE TABLE content_media(content_id TEXT,media_kind TEXT,duration_seconds INTEGER);
      CREATE TABLE speaking_daily_mode_progress(child_id TEXT,task_date TEXT,mode TEXT,prompt_id TEXT,passed INTEGER);
      CREATE TABLE writing_submissions(child_id TEXT,prompt_id TEXT,passed INTEGER,passed_at TEXT,updated_at TEXT);
    ''')
    for typ,prefix in [('article','r'),('audio','l'),('oral_prompt','s'),('writing_prompt','w')]:
        for i in range(1,6):
            con.execute('INSERT INTO content_items VALUES(?,?,?,?,?,?,?,?,?,?,?)',(f'{prefix}{i}',f'{prefix.upper()} {i}',typ,None,'published','P5','global',None,1,'2026-08-01',f'2026-08-{i:02d}'))
            if typ=='article': con.execute('INSERT INTO content_versions VALUES(?,?,?)',(f'{prefix}{i}',1,'{"text":"short readable passage"}'))
            if typ=='audio': con.execute('INSERT INTO content_media VALUES(?,?,?)',(f'{prefix}{i}','audio',120))
    # First two of every domain assigned within cooldown (status is irrelevant). With lessonLimit=2,
    # the old pre-limit query returned nothing; v12 must return #3 and #4.
    for typ,prefix in [('reading','r'),('listening','l'),('speaking','s'),('writing','w')]:
        for i in (1,2): con.execute('INSERT INTO learning_tasks VALUES(?,?,?,?,?)',('child',typ,f'{prefix}{i}','done','2026-08-30'))
    con.commit()
    args_common=('2026-08-25','child','2026-08-25','2026-09-01','2026-08-25','child','2026-08-25','2026-09-01')
    rr=con.execute(read_sql,('child','P5','tenant-x',*args_common,2)).fetchall()
    lr=con.execute(listen_sql,('child','P5','tenant-x',*args_common,2)).fetchall()
    sr=con.execute(speak_sql,('P5','tenant-x',*args_common,2)).fetchall()
    wr=con.execute(write_sql,('P5','tenant-x',*args_common,2)).fetchall()
    require([x[0] for x in rr]==['r3','r4'],f'Reading eligible-before-limit failed: {rr}')
    require([x[0] for x in lr]==['l3','l4'],f'Listening eligible-before-limit failed: {lr}')
    require([x[0] for x in sr]==['s3','s4'],f'Speaking eligible-before-limit failed: {sr}')
    require([x[0] for x in wr]==['w3','w4'],f'Writing eligible-before-limit failed: {wr}')

if errors:
    print('HOTFIX11.8.3 TEST FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX11.8.3 TEST PASS: eligible-before-limit selection validated for Reading, Listening, Speaking and Writing')
