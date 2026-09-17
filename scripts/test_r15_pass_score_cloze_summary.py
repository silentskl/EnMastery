from pathlib import Path
import sqlite3
root=Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
assert db.execute("select pass_score from tenant_learning_policy where tenant_id='tenant-default'").fetchone()==(60,)
assert db.execute("select count(*) from sqlite_master where type='table' and name='cloze_summary_attempts'").fetchone()==(1,)
text=(root/'lib/jobs/dispatch.ts').read_text()
assert 'cloze_summary_feedback' in text and 'passMark=clampPassScore(req.passMark)' in text
runner=(root/'components/question-bank/session-runner.tsx').read_text()
assert 'Summary mastery:' in runner and 'disabled={!canAdvance}' in runner
settings=(root/'components/tenant-learn-settings.tsx').read_text()
assert 'Passing score (%)' in settings and 'Mastery passing score' in settings
for bad in ['passMark:30','reviewScore>=60']:
    assert bad not in text
print('R15 unified pass score / cloze summary regression PASS')
