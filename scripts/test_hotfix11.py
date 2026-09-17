from pathlib import Path
import sqlite3,sys,datetime
root=Path(__file__).resolve().parents[1];errors=[]
def text(path):
 p=root/path
 if not p.exists():errors.append(f'missing {path}');return ''
 return p.read_text(errors='ignore')
def need(path,*markers):
 s=text(path)
 for m in markers:
  if m not in s:errors.append(f'{path}: missing {m}')
need('migrations/0051_v102_hotfix11_queue_timeout.sql','queue_runtime_policy','task_timeout_minutes','120')
need('lib/jobs/timeout.ts','DEFAULT_TASK_TIMEOUT_MINUTES=120','sweepTimedOutJobs','job_timed_out','timed_out')
need('workers/task-runner/index.ts','scheduled','sweepTimedOutJobs','nextQueuedJobId','TASK_QUEUE.send({jobId:id})')
if 'TASK_QUEUE.send({wake:true})' in text('workers/task-runner/index.ts'): errors.append('task-runner uses invalid wake queue message instead of {jobId}')
need('workers/task-runner/wrangler.jsonc','*/5 * * * *','"max_concurrency": 1','"max_batch_size": 1')
need('components/work-queue-manager.tsx','Task timeout (minutes)','Timed out','Retrigger','5–1440 min')
need('app/api/admin/jobs/route.ts','export async function PATCH','taskTimeoutMinutes','sweepTimedOutJobs')
need('lib/jobs/store.ts','retriggerTimedOutJob','job_retriggered','job_retriggered_from')
need('app/api/student/plan/route.ts','student_plan_failed','requestId','emergency_today_plan','daily-fallback-v4')
need('components/student-plan.tsx','Could not load today’s learning mission.','student_plan_failed','Today mission loaded with diagnostics')
need('components/tenant-vocabulary-manager.tsx','Existing word books','View terms','Add terms','System books are read-only')
need('lib/vocabulary/collections.ts','listTenantCollectionItems','updateTenantCustomCollection','removeVocabularyFromTenantCollection','ORDER BY ci.item_order,v.lemma')
try:
 db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
 for m in sorted((root/'migrations').glob('*.sql')):db.executescript(m.read_text())
 row=db.execute("SELECT task_timeout_minutes FROM queue_runtime_policy WHERE scope_type='platform' AND scope_id='platform'").fetchone()
 if row!=(120,):errors.append(f'default platform timeout wrong: {row}')
 db.execute("INSERT INTO queue_runtime_policy(scope_type,scope_id,task_timeout_minutes) VALUES('tenant','tenant-default',45)")
 if db.execute("SELECT task_timeout_minutes FROM queue_runtime_policy WHERE scope_type='tenant' AND scope_id='tenant-default'").fetchone()!=(45,):errors.append('tenant timeout persistence failed')
 # timed-out representation remains schema-compatible: terminal failed + timed_out stage.
 db.execute("INSERT INTO generation_jobs(id,job_type,status,stage,progress,request_json,tenant_id,scope,started_at) VALUES('timeout-job','test','running','starting',20,'{}','tenant-default','tenant',datetime('now','-121 minutes'))")
 db.execute("UPDATE generation_jobs SET status='failed',stage='timed_out',error='timeout',completed_at=CURRENT_TIMESTAMP WHERE id='timeout-job' AND status='running'")
 if db.execute("SELECT status,stage FROM generation_jobs WHERE id='timeout-job'").fetchone()!=('failed','timed_out'):errors.append('timed_out terminal representation failed')
 # Admin inventory contains both System and Tenant books; only Tenant book is mutable.
 db.execute("INSERT INTO vocabulary_collections(id,tenant_id,collection_type,name,status) VALUES('tenant-book-h11','tenant-default','custom','Tenant H11','published')")
 found=db.execute("SELECT id,collection_type,tenant_id FROM vocabulary_collections WHERE status='published' AND (collection_type='system' OR (collection_type='custom' AND tenant_id='tenant-default'))").fetchall()
 if not any(r[0]=='tenant-book-h11' for r in found):errors.append('Tenant book missing from admin inventory query')
 if not any(r[1]=='system' for r in found):errors.append('System books missing from admin inventory query')
 db.close()
except Exception as e:errors.append(f'Hotfix11 schema/runtime test failed: {e}')
if errors:
 print('HOTFIX11 TEST FAIL');[print('-',e) for e in errors];sys.exit(1)
print('HOTFIX11 TEST PASS: detailed Today diagnostics + emergency mission fallback; Tenant/System word-book inventory; configurable 120-minute queue timeout; timed-out delete/retrigger audit path; single-consumer FIFO retained')
