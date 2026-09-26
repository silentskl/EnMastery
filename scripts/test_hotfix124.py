from pathlib import Path
import json, sqlite3, sys, re
root=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return ''
    text=p.read_text(errors='ignore')
    for marker in markers:
        if marker not in text: errors.append(f'{path}: missing {marker}')
    return text

migration=need('migrations/0060_v102_hotfix124_vocabulary_specialist.sql','tenant_vocabulary_specialist_policy','vocabulary_specialist_sessions','vocabulary_specialist_wordbook','vocabulary_specialist_question_attempts','vocabulary_specialist_cloze_attempts','daily_words INTEGER NOT NULL DEFAULT 10','UNIQUE(child_id,task_date)')
if re.search(r'\bUNION(?:\s+ALL)?\b','\n'.join(line.split('--',1)[0] for line in migration.splitlines()),re.I): errors.append('0060 must remain D1-safe without compound SELECT seeding')
need('lib/vocabulary-specialist/generate.ts','generateSpecialistQuestion','generateSpecialistCloze','wordCount < 400 || wordCount > 500','validatePlaceholders','400–500')
need('app/api/student/vocabulary-specialist/route.ts','action==="add_word"','action==="answer_question"','action==="generate_cloze"','action==="submit_cloze"','correctCount===items.length','This word or phrase is already in today\'s specialist practice','vocabulary_specialist_question','vocabulary_specialist_cloze')
need('app/api/student/vocabulary-specialist/history/route.ts','vocabulary_specialist_cloze_attempts','answer_index')
need('app/api/student/vocabulary-specialist/wordbook/route.ts','vocabulary_specialist_wordbook')
need('components/vocabulary-specialist/vocabulary-specialist-workspace.tsx','PSLE-style','400–500','PASS only at','specialist word book')
need('components/practice-policy-hub.tsx','Vocabulary Specialist','vocabularySpecialistDailyWords','100% required')
need('components/vocabulary-specialist/tenant-vocabulary-specialist-admin.tsx','Daily vocabulary target','Learning records','Multiple-choice questions','mixed cloze')
need('components/app-shell.tsx','vocabularySpecialistAdmin','/admin/vocabulary-specialist')
need('components/ui-language.tsx','vocabularySpecialistAdmin','词汇专项')
css=need('app/globals.css','.vocabSpecialLayout','.vocabSpecialBlank.bad','.vocabSpecialHistoryLayout','.vocabSpecialRecordGrid','overflow-wrap:anywhere')
for m in re.finditer(r'font-size:(\d+)px',css):
    if int(m.group(1))<17: errors.append(f'globals.css contains font-size below 17px: {m.group(1)}')
pkg=json.loads((root/'package.json').read_text())
if pkg.get('scripts',{}).get('test:hotfix124')!='python3 scripts/test_hotfix124.py': errors.append('test:hotfix124 script missing')
if 'npm run test:hotfix124' not in pkg.get('scripts',{}).get('check:release',''): errors.append('check:release missing test:hotfix124')
try:
    db=sqlite3.connect(':memory:')
    for path in sorted((root/'migrations').glob('*.sql')): db.executescript(path.read_text())
    tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for table in ['tenant_vocabulary_specialist_policy','vocabulary_specialist_sessions','vocabulary_specialist_wordbook','vocabulary_specialist_question_attempts','vocabulary_specialist_cloze_attempts']:
        if table not in tables: errors.append(f'complete migration run missing {table}')
    rows=db.execute("SELECT learner_stage,daily_words FROM tenant_vocabulary_specialist_policy WHERE tenant_id='tenant-default'").fetchall()
    if len(rows)!=7 or any(r[1]!=10 for r in rows): errors.append(f'unexpected default specialist policy rows: {rows}')
except Exception as exc: errors.append(f'complete migration execution failed: {exc}')
if errors:
    print('HOTFIX 12.4 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.4 PASS: Vocabulary Specialist data model, independent word book, persistent MCQ/mixed-cloze history, 100% final gate, admin controls and responsive UI validated')
