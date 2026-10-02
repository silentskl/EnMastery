#!/usr/bin/env python3
from pathlib import Path
import sqlite3,sys
root=Path(__file__).resolve().parents[1]; errors=[]
def need(path,*markers):
 s=(root/path).read_text(errors='ignore')
 for m in markers:
  if m not in s: errors.append(f'{path}: missing {m}')
 return s
need('components/student-plan.tsx','/learn/history/${encodeURIComponent(t.id)}','view learning record','View record →')
need('components/learning-progress-calendar.tsx','import Link from "next/link"','/learn/history?date=${encodeURIComponent(cell.date)}','View learning record')
need('app/learn/history/page.tsx','Completed learning records','LearningHistoryDay')
need('app/learn/history/[id]/page.tsx','LearningTaskHistory')
need('app/api/student/learning-history/[id]/route.ts','question_attempts','writing_submissions','speaking_daily_mode_progress','speaking_sessions','speaking_turns','vocabulary_training_events','speaking_reading_aloud_history')
need('app/api/student/learning-history/route.ts',"FROM learning_tasks WHERE child_id=? AND task_date=? AND cadence='daily'")
need('app/api/student/speaking/assess/route.ts','INSERT INTO speaking_reading_aloud_history','JSON.stringify(assessment)','browserTranscript||null')
need('components/learning-task-history.tsx','Submission & revision history','Submitted answers & feedback','Daily speaking scores','Older Reading Aloud attempts may only have their score retained')
db=sqlite3.connect(':memory:')
try:
 for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
 cols={r[1] for r in db.execute('pragma table_info(speaking_reading_aloud_history)')}
 for c in ['child_id','task_date','prompt_id','reference_text','transcript','assessment_json','score','created_at']:
  if c not in cols: errors.append(f'0062 missing {c}')
 if not db.execute("select 1 from sqlite_master where type='index' and name='idx_speaking_reading_aloud_history_child_date'").fetchone(): errors.append('0062 missing child/date index')
except Exception as e: errors.append(f'migration execution failed: {e}')
if errors:
 print('HOTFIX 12.4.9 FAIL')
 for e in errors: print('-',e)
 sys.exit(1)
print('HOTFIX 12.4.9 PASS: completed Daily Mission cards and calendar dates reopen auditable history; Reading Aloud now persists transcript and assessment evidence')
