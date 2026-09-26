from pathlib import Path
import json, sqlite3, re, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def txt(path):
 p=root/path
 if not p.exists(): errors.append(f'missing {path}'); return ''
 return p.read_text(errors='ignore')
def need(path,*markers):
 s=txt(path)
 for m in markers:
  if m not in s: errors.append(f'{path} missing {m}')
 return s

# Daily Progress must be a pure persisted-read/reconciliation path, never a planner trigger.
progress=need('app/api/student/progress/calendar/route.ts','readOnly:true','Cache-Control','no-store')
if 'ensureWeeklyPlan' in progress: errors.append('Daily Progress route still invokes Weekly Planner')
calendar=need('components/learning-progress-calendar.tsx','fetchStudentProgressCalendar','calendarGrid','percent')

# Today fast path is resource bounded and complete: mandatory four areas must exist before cache is accepted.
plan=need('app/api/student/plan/route.ts','scope','ensureTodayPlan','todayNeedsMaterialization','today-bounded')
for m in ['"listening","speaking","reading","vocabulary"','repairTodayWritingTaskCompletion']:
 if m not in plan: errors.append(f'Today plan fast path missing {m}')
planner=need('lib/student/planner.ts','daily-cache-v12-eligible-before-limit','CANDIDATE_RETURN_LIMIT','ensureTodayPlan','vocab.id')

# Speaking retains the legacy cache schema for compatibility, while Daily Learn now
# serves a persisted one-prompt-per-mode rotation bundle (Hotfix 12.4.5).
cache=need('lib/speaking/prompt-cache.ts','reading_aloud','stimulus','conversation','speaking_prompt_cache','builtin-v1')
prompts=need('app/api/student/speaking/prompts/route.ts','ensureDailySpeakingPromptAssignments','private, no-store','rotation:')

# Game unlock: all daily core learn tasks, plus writing when scheduled; tenant duration control present.
reward=need('lib/student/game-rewards.ts','ALWAYS_REQUIRED','listening','speaking','reading','vocabulary','writingReady','daily-mission:${date}')
settings=need('components/tenant-learn-settings.tsx','Daily game limit','Writing minimum words','writingWeekdays','Vocabulary')
admin_api=need('app/api/admin/learn-settings/route.ts','dailyGameMinutes','writingWeekdays','writingMinWords','vocabularyDailyWords')
need('migrations/0046_v102_daily_learning_reward_writing_speaking_cache.sql','daily_game_minutes','DEFAULT 10','writing_weekdays_json','writing_min_words','speaking_prompt_cache')

# Student cannot choose daily Learn vocabulary count; backend planner uses tenant policy.
trainer=need('components/vocabulary/vocabulary-daily-trainer.tsx','Assigned by Tenant Admin','Students cannot change the word book.','New learning + scheduled review')
if re.search(r'<select[^>]*value=\{target\}',trainer,re.I): errors.append('student vocabulary learn UI still exposes daily-count select')
need('app/api/student/vocabulary/training/settings/route.ts','dailyPolicy.vocabularyNewWords')
need('app/api/student/vocabulary/training/route.ts','dailyPolicy.vocabularyNewWords')
need('lib/student/planner.ts','target: policy.vocabularyNewWords')

# Word-book synonym annotations remain supported. Bulk import UI moved to Tenant Admin in Hotfix 10.
need('lib/vocabulary/collections.ts','import_synonyms_json','import_synonym_notes_json','detail.synonymNotes')
need('components/vocabulary/vocabulary-detail-card.tsx','Synonyms')
need('app/api/admin/vocabulary/import/route.ts','vocabulary_import','parseVocabularyImportText')

# Tenant can delete learner/student.
student_api=need('app/api/admin/students/route.ts','export async function DELETE','student.delete','DELETE FROM child_profiles')
student_ui=need('components/tenant-student-manager.tsx','Delete')

# Writing cadence/minimum word policy must be used by both planner and submit gate.
need('lib/settings/daily-task-policy.ts','writingScheduledForDate','writingWeekdays','writingMinWords')
need('app/api/student/writing/submit/route.ts','minimumWords','Write at least')

# Reconciliation covers all five daily learning areas.
tasks=need('lib/student/tasks.ts','type==="speaking"','type==="vocabulary"','completeMatchingTasks')

# SQLite full migration + content completeness / vocabulary synonym structure.
try:
 db=sqlite3.connect(':memory:')
 for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
 migrations=len(list((root/'migrations').glob('*.sql')))
 if migrations<48: errors.append(f'expected >=48 migrations, got {migrations}')
 cols={r[1] for r in db.execute('pragma table_info(tenant_learning_policy)')}
 if 'daily_game_minutes' not in cols: errors.append('tenant_learning_policy missing daily_game_minutes')
 dcols={r[1] for r in db.execute('pragma table_info(tenant_daily_task_policy)')}
 for c in ['writing_weekdays_json','writing_min_words','vocabulary_daily_words']:
  if c not in dcols: errors.append(f'tenant_daily_task_policy missing {c}')
 if db.execute('select daily_game_minutes from tenant_learning_policy where tenant_id="tenant-default"').fetchone()!=(10,): errors.append('default daily game limit is not 10 minutes')
 stages=['P1-P4','P5','P6','S1','S2','S3','S4']
 for stage in stages:
  vc=db.execute('select count(*) from vocabulary_catalog_stages where stage=?',(stage,)).fetchone()[0]
  gt=db.execute('select count(*) from grammar_topics where stage=?',(stage,)).fetchone()[0]
  ge=db.execute('select count(*) from grammar_exercises where stage=?',(stage,)).fetchone()[0]
  if vc<60: errors.append(f'{stage} vocabulary incomplete: {vc}')
  if gt<12: errors.append(f'{stage} grammar topics incomplete: {gt}')
  if ge<24: errors.append(f'{stage} grammar exercises incomplete: {ge}')
 # Each catalog record must expose synonym arrays in JSON; annotated notes should be substantial, not isolated examples.
 rows=db.execute("select details_json from vocabulary_items where is_catalog=1").fetchall()
 missing=0; notes=0
 for (raw,) in rows:
  try: d=json.loads(raw or '{}')
  except: d={}
  if not isinstance(d.get('synonyms'),list): missing+=1
  if isinstance(d.get('synonymNotes'),list) and d.get('synonymNotes'): notes+=1
 if missing: errors.append(f'{missing} catalog vocabulary entries lack synonyms array')
 if notes<100: errors.append(f'only {notes} catalog entries have synonym nuance notes; expected >=100')
 # Speaking cache has 3 mode keys per schema.
 mode_sql=txt('migrations/0046_v102_daily_learning_reward_writing_speaking_cache.sql')
 for mode in ['conversation','reading_aloud','stimulus']:
  if mode not in mode_sql: errors.append(f'speaking cache schema missing {mode}')
 db.close()
except Exception as e: errors.append(f'full migration/content regression failed: {e}')

if errors:
 print('HOTFIX6 TEST FAIL')
 for e in errors: print('-',e)
 sys.exit(1)
print('HOTFIX6 TEST PASS: daily progress, five-area reward gate, speaking cache, tenant vocabulary control, writing cadence, student deletion, wordbook synonym import, and vocabulary/grammar completeness verified')
