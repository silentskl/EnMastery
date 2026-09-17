from pathlib import Path
import glob, sqlite3
ROOT=Path(__file__).resolve().parents[1]
db=sqlite3.connect(':memory:')
for f in sorted(glob.glob(str(ROOT/'migrations/*.sql'))): db.executescript(Path(f).read_text())
# Minimal learner.
db.execute("INSERT INTO users(id,email,role,display_name) VALUES ('u-r10','r10@example.test','admin','R10')")
db.execute("INSERT INTO child_profiles(id,parent_user_id,nickname,school_level,tenant_id) VALUES ('child-r10','u-r10','R10 learner','P6','tenant-default')")
content_id='starter-mangroves'
qids=[r[0] for r in db.execute("SELECT id FROM questions WHERE source_content_id=? AND status='published' ORDER BY created_at,id",(content_id,)).fetchall()]
assert len(qids)==2, qids
db.execute("INSERT INTO learner_content_progress(child_id,content_id,status,progress_percent) VALUES ('child-r10',?,'started',10)",(content_id,))

def status():
    p=db.execute("SELECT status,progress_percent FROM learner_content_progress WHERE child_id='child-r10' AND content_id=?",(content_id,)).fetchone()
    wrong,correct=db.execute("SELECT COALESCE(SUM(CASE WHEN is_correct=0 THEN 1 ELSE 0 END),0),COUNT(DISTINCT CASE WHEN is_correct=1 THEN question_id END) FROM question_attempts WHERE child_id='child-r10' AND content_id=?",(content_id,)).fetchone()
    total=len(qids)
    state='pass' if p[0]=='completed' and p[1]>=100 else ('fail' if wrong>0 else 'in_progress')
    score=round(correct/max(1,total)*100)
    return state,score,wrong,correct
assert status()==('in_progress',0,0,0)
# One wrong answer must show FAIL and cannot be treated as a passed reading.
db.execute("INSERT INTO question_attempts(id,child_id,content_id,question_id,response_json,is_correct,score,max_score) VALUES ('a1','child-r10',?,?, '{}',0,0,1)",(content_id,qids[0]))
assert status()==('fail',0,1,0)
# Correcting only one question is still not PASS.
db.execute("INSERT INTO question_attempts(id,child_id,content_id,question_id,response_json,is_correct,score,max_score) VALUES ('a2','child-r10',?,?, '{}',1,1,1)",(content_id,qids[0]))
db.execute("UPDATE learner_content_progress SET progress_percent=50 WHERE child_id='child-r10' AND content_id=?",(content_id,))
assert status()==('fail',50,1,1)
# Only 100% correct coverage marks PASS; prior wrong attempts remain in history.
db.execute("INSERT INTO question_attempts(id,child_id,content_id,question_id,response_json,is_correct,score,max_score) VALUES ('a3','child-r10',?,?, '{}',1,1,1)",(content_id,qids[1]))
db.execute("UPDATE learner_content_progress SET status='completed',progress_percent=100,completed_at=CURRENT_TIMESTAMP WHERE child_id='child-r10' AND content_id=?",(content_id,))
assert status()==('pass',100,1,2)
# Writing history must support immutable revision lineage.
cols={r[1] for r in db.execute('PRAGMA table_info(writing_submissions)')}
assert 'revision_of_submission_id' in cols
# Runtime guards: Daily tasks are completed only inside explicit PASS branches.
attempt=(ROOT/'app/api/student/attempt/route.ts').read_text()
writing=(ROOT/'lib/jobs/dispatch.ts').read_text()
assert 'if (progress >= 100) await completeMatchingTasks' in attempt
assert 'if(passed){' in writing and 'completeMatchingTasks(env.DB,childId,"writing"' in writing
print('R10 STATUS GATE TEST PASS: Reading FAIL -> 50% -> PASS 100%; Writing/Reading daily completion remains pass-gated; revision lineage present.')
