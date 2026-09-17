from pathlib import Path
import sqlite3, sys
root=Path(__file__).resolve().parents[1];errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f"missing {path}");return ""
 return p.read_text(errors="ignore")
def need(path,*markers):
 s=text(path)
 for m in markers:
  if m not in s: errors.append(f"{path}: missing {m}")
need('migrations/0050_v102_hotfix10_tenant_vocabulary_import.sql','ADD COLUMN tenant_id','idx_vocab_collections_tenant')
need('app/admin/(protected)/vocabulary/page.tsx','TenantVocabularyManager','persistent TXT / CSV / editor imports')
need('components/tenant-vocabulary-manager.tsx','Create empty word book','Create & queue import','Queue import','/admin/jobs','persistent Work Queue')
need('app/api/admin/vocabulary/import/route.ts','jobType:"vocabulary_import"','createJob','dispatchJob','parseVocabularyImportText','scope:"tenant"')
need('lib/jobs/dispatch.ts','case"vocabulary_import"','vocabularyImport','slice(cursor,cursor+20)','status:"queued"','await dispatchJob(id,env)','vocabulary_chunk_complete')
need('workers/task-runner/index.ts','max_batch_size=1','nextQueuedJobId','ORDER BY COALESCE(enqueued_at,created_at) ASC')
need('workers/task-runner/wrangler.jsonc','"max_batch_size": 1','"max_concurrency": 1')
need('components/work-queue-manager.tsx','Vocabulary import','processed','FIFO by queue-entry time. One job runs at a time')
need('app/api/student/vocabulary/import/route.ts','managed by Tenant Admin')
need('app/api/student/vocabulary/collections/[id]/import/route.ts','available only in Tenant Admin')
student=text('components/student-vocabulary-manager.tsx')+text('components/vocabulary/vocabulary-wordbooks.tsx')
for forbidden in ['Import TXT','Create & import','Load TXT / CSV']:
 if forbidden in student: errors.append(f'Student UI still exposes bulk import control: {forbidden}')
need('lib/vocabulary/collections.ts','createTenantCustomCollection','listTenantVocabularyCollections','addVocabularyToTenantCollection',"c.tenant_id=l.tenant_id")
need('lib/vocabulary/policy-books.ts','scope:"system"|"tenant"',"c.collection_type='custom' AND c.tenant_id=?")
try:
 db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON')
 for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
 cols={r[1] for r in db.execute('PRAGMA table_info(vocabulary_collections)')}
 if 'tenant_id' not in cols: errors.append('tenant_id column missing after migrations')
 db.execute("INSERT INTO vocabulary_collections(id,tenant_id,collection_type,name,status) VALUES('tenant-book-h10','tenant-default','custom','Tenant H10','published')")
 row=db.execute("SELECT tenant_id,collection_type FROM vocabulary_collections WHERE id='tenant-book-h10'").fetchone()
 if row!=('tenant-default','custom'): errors.append(f'tenant book persistence failed: {row}')
 # FIFO order uses enqueued_at then rowid, and vocabulary imports share generation_jobs.
 db.execute("INSERT INTO generation_jobs(id,job_type,entity_type,entity_id,status,stage,progress,request_json,tenant_id,scope,enqueued_at) VALUES('vjob-1','vocabulary_import','vocabulary_collection','tenant-book-h10','queued','queued',0,'{}','tenant-default','tenant','2026-09-01 01:00:00')")
 db.execute("INSERT INTO generation_jobs(id,job_type,entity_type,entity_id,status,stage,progress,request_json,tenant_id,scope,enqueued_at) VALUES('vjob-2','vocabulary_import','vocabulary_collection','tenant-book-h10','queued','queued',0,'{}','tenant-default','tenant','2026-09-01 01:00:01')")
 first=db.execute("SELECT id FROM generation_jobs WHERE status='queued' AND deleted_at IS NULL ORDER BY COALESCE(enqueued_at,created_at) ASC,rowid ASC LIMIT 1").fetchone()
 if first!=('vjob-1',): errors.append(f'FIFO ordering failed: {first}')
 db.close()
except Exception as e: errors.append(f'Hotfix10 schema/runtime test failed: {e}')
if errors:
 print('HOTFIX10 TEST FAIL');[print('-',e) for e in errors];sys.exit(1)
print('HOTFIX10 TEST PASS: Tenant Admin owns bulk import; imports persist in the shared FIFO Work Queue and single-concurrency runner; Student bulk-import controls are absent')
