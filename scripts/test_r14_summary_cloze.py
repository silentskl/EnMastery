from pathlib import Path
import sqlite3, tempfile, json
root=Path(__file__).resolve().parents[1]
con=sqlite3.connect(':memory:')
for p in sorted((root/'migrations').glob('*.sql')): con.executescript(p.read_text())
assert con.execute("select count(*) from learning_summary_attempts").fetchone()[0]==0
rows=con.execute("select school_level,count(*) from questions q join question_bank_items b on b.question_id=q.id where b.category='cloze' and q.generation_model='seed-v0.9-r14' group by school_level order by school_level").fetchall()
assert dict(rows)=={'P1-P4':35,'P5':35,'P6':35,'S1':35,'S2':35,'S3':35,'S4':35}, rows
assert con.execute("select count(*) from questions q join question_bank_items b on b.question_id=q.id where b.category='cloze' and q.generation_model='seed-v0.9-r14'").fetchone()[0]==245
# ensure science, PSLE-frequency and fun coverage tags exist
text=(root/'migrations/0031_v09_r14_summary_mastery_cloze.sql').read_text()
for marker in ['living_things','human_body','electricity','ecosystems','space','digital','sports','gaming','movies','mystery','themepark']:
 assert marker in text, marker
# source-level mastery gates
attempt=(root/'app/api/student/attempt/route.ts').read_text(); assert 'summaryPassed' in attempt and 'questionProgress' in attempt
reader=(root/'components/student-reader.tsx').read_text(); assert 'SummaryGate' in reader and 'disabled={!result?.correct}' in reader
listen=(root/'components/student-listening-player.tsx').read_text(); assert 'SummaryGate' in listen and 'Next question' in listen and 'disabled={!result?.correct}' in listen
write=(root/'components/writing/writing-workspace.tsx').read_text(); assert 'disabled={!passed||!hasNext}' in write
print('R14 summary/cloze regression PASS:', dict(rows), 'total=245')
