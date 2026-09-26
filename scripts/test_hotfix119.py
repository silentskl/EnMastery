#!/usr/bin/env python3
from pathlib import Path
import sqlite3,sys

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def require(value,message):
    if not value: errors.append(message)

def source(path):
    p=ROOT/path
    if not p.exists():
        errors.append(f'missing {path}')
        return ''
    return p.read_text(errors='ignore')

migration=source('migrations/0056_v102_hotfix119_d1_rows_read_optimization.sql')
for marker in [
    'learning_task_day_rollups','vocabulary_training_rollups','tenant_ai_daily_rollups','generation_job_status_rollups',
    'idx_qbank_category_sample','idx_qbank_category_subcategory_sample','idx_question_attempts_child_content_result',
    'idx_generation_jobs_tenant_display','sample_key'
]: require(marker in migration,f'0056 missing {marker}')

random_sensitive=[
    'app/api/student/question-bank/sessions/route.ts',
    'app/api/student/cloze/session/route.ts',
    'lib/vocabulary/catalog.ts',
    'lib/vocabulary/collections.ts',
]
for path in random_sensitive:
    text=source(path)
    require('ORDER BY RANDOM()' not in text.upper(),f'{path} still performs a full candidate-set random sort')
    require('sample_key' in text or path.endswith('collections.ts'),f'{path} does not use indexed cursor sampling')

require('learning_task_day_rollups' in source('app/api/student/progress/calendar/route.ts'),'calendar still scans raw learning_tasks')
require('learning_task_day_rollups' in source('lib/student/planner.ts'),'streak still scans raw XP/task history')
require('vocabulary_training_rollups' in source('lib/student/tasks.ts'),'daily vocabulary completion still scans raw event history')
require('tenant_ai_daily_rollups' in source('lib/tenant/usage.ts'),'Tenant quota still scans raw AI usage history')
jobs=source('app/api/admin/jobs/route.ts')
require('generation_job_status_rollups' in jobs,'Work Queue stats do not use rollups')
require("SELECT COUNT(*) FROM generation_jobs q" not in jobs,'Work Queue still has correlated O(n^2) queue-position counting')

db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
try:
    for item in sorted((ROOT/'migrations').glob('*.sql')): db.executescript(item.read_text())
    table_count=db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchone()[0]
    trigger_count=db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'").fetchone()[0]
    require(table_count>=106,f'expected at least 106 application tables, got {table_count}')
    require(trigger_count==17,f'expected 17 triggers, got {trigger_count}')

    db.execute("INSERT INTO users(id,email,role,display_name) VALUES('u-h119','h119@example.invalid','student','H119')")
    db.execute("INSERT INTO child_profiles(id,parent_user_id,learner_user_id,nickname,school_level,tenant_id) VALUES('c-h119','u-h119','u-h119','H119','P6','tenant-default')")

    db.execute("INSERT INTO learning_tasks(id,child_id,task_date,cadence,activity_type,title,status) VALUES('t-h119','c-h119','2026-09-02','daily','reading','Read','todo')")
    require(db.execute("SELECT total_count,done_count FROM learning_task_day_rollups WHERE child_id='c-h119' AND task_date='2026-09-02'").fetchone()==(1,0),'learning-task insert rollup incorrect')
    db.execute("UPDATE learning_tasks SET status='done' WHERE id='t-h119'")
    require(db.execute("SELECT total_count,done_count FROM learning_task_day_rollups WHERE child_id='c-h119' AND task_date='2026-09-02'").fetchone()==(1,1),'learning-task status rollup incorrect')
    db.execute("UPDATE learning_tasks SET task_date='2026-09-03' WHERE id='t-h119'")
    require(db.execute("SELECT total_count,done_count FROM learning_task_day_rollups WHERE child_id='c-h119' AND task_date='2026-09-03'").fetchone()==(1,1),'learning-task key move rollup incorrect')

    vocab=db.execute("SELECT id FROM vocabulary_items ORDER BY id LIMIT 1").fetchone()[0]
    db.execute("INSERT INTO vocabulary_training_events(id,child_id,vocabulary_id,mode,correct,created_at) VALUES('vte-h119-a','c-h119',?,'meaning',1,'2026-09-01 10:00:00')",(vocab,))
    db.execute("INSERT INTO vocabulary_training_events(id,child_id,vocabulary_id,mode,correct,created_at) VALUES('vte-h119-b','c-h119',?,'cloze',0,'2026-09-02 10:00:00')",(vocab,))
    require(db.execute("SELECT first_training_day,last_training_day,appearance_days,event_count,correct_count FROM vocabulary_training_rollups WHERE child_id='c-h119' AND vocabulary_id=?",(vocab,)).fetchone()==('2026-09-01','2026-09-02',2,2,1),'vocabulary training rollup incorrect')

    db.execute("INSERT INTO tenant_ai_usage(id,tenant_id,purpose,request_count,input_tokens,output_tokens,status,created_at) VALUES('ai-h119','tenant-default','test',2,10,20,'succeeded','2026-09-02 01:00:00')")
    require(db.execute("SELECT request_count,input_tokens,output_tokens,event_count,failed_count FROM tenant_ai_daily_rollups WHERE tenant_id='tenant-default' AND usage_date='2026-09-02'").fetchone()==(2,10,20,1,0),'AI usage insert rollup incorrect')
    db.execute("UPDATE tenant_ai_usage SET request_count=3,status='failed' WHERE id='ai-h119'")
    require(db.execute("SELECT request_count,failed_count FROM tenant_ai_daily_rollups WHERE tenant_id='tenant-default' AND usage_date='2026-09-02'").fetchone()==(3,1),'AI usage update rollup incorrect')

    db.execute("INSERT INTO generation_jobs(id,job_type,request_json,tenant_id,scope,status,stage) VALUES('job-h119','test','{}','tenant-default','tenant','queued','queued')")
    require(db.execute("SELECT queued_count,running_count,failed_count FROM generation_job_status_rollups WHERE tenant_id='tenant-default' AND scope='tenant'").fetchone()==(1,0,0),'job insert rollup incorrect')
    db.execute("UPDATE generation_jobs SET status='running',stage='running' WHERE id='job-h119'")
    require(db.execute("SELECT queued_count,running_count FROM generation_job_status_rollups WHERE tenant_id='tenant-default' AND scope='tenant'").fetchone()==(0,1),'job status rollup incorrect')
    db.execute("UPDATE generation_jobs SET status='failed',stage='timed_out' WHERE id='job-h119'")
    require(db.execute("SELECT running_count,failed_count,timed_out_count FROM generation_job_status_rollups WHERE tenant_id='tenant-default' AND scope='tenant'").fetchone()==(0,1,1),'job timeout rollup incorrect')

    plans={}
    plans['question_bank']=db.execute("EXPLAIN QUERY PLAN SELECT q.id FROM question_bank_items b JOIN questions q ON q.id=b.question_id WHERE b.category='cloze' AND b.sample_key>=100 AND q.status='published' AND q.school_level='P6' ORDER BY b.sample_key,b.question_id LIMIT 10").fetchall()
    plans['reading_history']=db.execute("EXPLAIN QUERY PLAN SELECT COUNT(a.id) FROM learner_content_progress p LEFT JOIN question_attempts a ON a.child_id=p.child_id AND a.content_id=p.content_id WHERE p.child_id='c-h119' GROUP BY p.content_id").fetchall()
    for name,rows in plans.items():
        detail=' | '.join(str(row[3]) for row in rows)
        require('SEARCH' in detail and 'SCAN question_attempts' not in detail,f'{name} query plan is not index-bounded: {detail}')
except Exception as exc:
    errors.append(f'Hotfix 11.9 schema/trigger/EXPLAIN test failed: {exc}')
finally:
    db.close()

if errors:
    print('HOTFIX11.9 TEST FAIL')
    for error in errors: print('-',error)
    sys.exit(1)
print(f'HOTFIX11.9 TEST PASS: {table_count} tables/17 triggers; indexed sampling, rollup maintenance and D1 SEARCH query plans validated')
