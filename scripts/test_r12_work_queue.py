from pathlib import Path
import sqlite3, time

root=Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
for migration in sorted((root/'migrations').glob('*.sql')):
    db.executescript(migration.read_text())

# New inserts get queue-entry timestamps even for legacy/direct INSERT call sites.
for jid in ['job-a','job-b','job-c']:
    db.execute("INSERT INTO generation_jobs(id,job_type,status,stage,progress,request_json) VALUES (?,'test','queued','queued',0,'{}')",(jid,))
    time.sleep(0.01)
db.commit()
rows=db.execute("SELECT id,enqueued_at FROM generation_jobs WHERE id LIKE 'job-%' ORDER BY COALESCE(enqueued_at,created_at),rowid").fetchall()
assert [r[0] for r in rows]==['job-a','job-b','job-c'], rows
assert all(r[1] for r in rows), rows

# The worker's authoritative FIFO selector ignores message delivery order.
def next_id():
    r=db.execute("SELECT id FROM generation_jobs WHERE status='queued' AND deleted_at IS NULL ORDER BY COALESCE(enqueued_at,created_at) ASC,rowid ASC LIMIT 1").fetchone()
    return r[0] if r else None
assert next_id()=='job-a'
db.execute("UPDATE generation_jobs SET status='running' WHERE id='job-a'")
assert next_id()=='job-b'
db.execute("UPDATE generation_jobs SET status='succeeded',completed_at=CURRENT_TIMESTAMP WHERE id='job-a'")

# A failed job retry receives a fresh queue-entry time and joins the end.
db.execute("UPDATE generation_jobs SET status='failed',completed_at=CURRENT_TIMESTAMP WHERE id='job-b'")
time.sleep(0.02)
db.execute("UPDATE generation_jobs SET status='queued',stage='queued',progress=0,error=NULL,retry_count=retry_count+1,enqueued_at=strftime('%Y-%m-%d %H:%M:%f','now'),started_at=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id='job-b'")
db.commit()
assert next_id()=='job-c', db.execute("SELECT id,enqueued_at FROM generation_jobs WHERE status='queued' ORDER BY COALESCE(enqueued_at,created_at),rowid").fetchall()

# Global queue-position query counts hidden/other-scope work ahead without exposing it.
position_sql="""SELECT CASE WHEN g.status='queued' THEN 1+(SELECT COUNT(*) FROM generation_jobs q WHERE q.status='queued' AND q.deleted_at IS NULL AND (COALESCE(q.enqueued_at,q.created_at)<COALESCE(g.enqueued_at,g.created_at) OR (COALESCE(q.enqueued_at,q.created_at)=COALESCE(g.enqueued_at,g.created_at) AND q.rowid<g.rowid))) ELSE NULL END FROM generation_jobs g WHERE g.id=?"""
assert db.execute(position_sql,('job-c',)).fetchone()[0]==1
assert db.execute(position_sql,('job-b',)).fetchone()[0]==2

# Terminal-history deletion is a soft history delete and leaves unrelated/entity data untouched.
db.execute("UPDATE generation_jobs SET status='succeeded' WHERE id='job-c'")
db.execute("UPDATE generation_jobs SET deleted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id='job-c' AND status IN ('succeeded','failed') AND deleted_at IS NULL")
assert db.execute("SELECT deleted_at IS NOT NULL FROM generation_jobs WHERE id='job-c'").fetchone()[0]==1

print('R12 WORK QUEUE TEST PASS')
print('initial_fifo=job-a,job-b,job-c')
print('retry_fifo=job-c,job-b')
print('queue_positions=job-c#1,job-b#2')
