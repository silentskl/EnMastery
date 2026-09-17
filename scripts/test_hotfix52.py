from pathlib import Path
import sqlite3
root=Path(__file__).resolve().parents[1]
errors=[]
def text(path): return (root/path).read_text()
learn=text('components/tenant-learn-settings.tsx')
practice=text('components/tenant-practice-settings.tsx')
plan=text('components/student-plan.tsx')
plan_api=text('app/api/student/plan/route.ts')
if 'settingsTable' not in learn or 'settingsTable' not in practice: errors.append('Learning/Practice Settings are not table layouts')
for marker in ['Review window','Required reviews','vocabularyReviewWindowDays','vocabularyReviewRepetitions']:
    if marker not in practice: errors.append(f'Practice Settings missing {marker}')
for marker in ['Review window','Required reviews','vocabularyReviewWindowDays','vocabularyReviewRepetitions']:
    if marker in learn: errors.append(f'Learning Settings incorrectly contains {marker}')
if '?scope=today' not in plan: errors.append('compact StudentPlan does not use fast today-only API')
if 'todayNeedsMaterialization' not in plan_api or 'today-bounded' not in plan_api or 'isCurrentOrPreserved' not in plan_api: errors.append('plan API does not use persisted complete Today mission fast path')
if 'Building your daily learning mission' in plan: errors.append('stale Building message remains in StudentPlan')

# Upgrade preservation: 0044 old values -> 0045 vocabulary practice values.
db=sqlite3.connect(':memory:')
for m in sorted((root/'migrations').glob('*.sql')):
    if m.name.startswith('0045_'): break
    db.executescript(m.read_text())
db.execute("update tenant_daily_task_policy set vocabulary_review_window_days=11,vocabulary_review_repetitions=4 where tenant_id='tenant-default' and school_level='P6'")
db.executescript((root/'migrations/0045_v102_practice_vocab_review_and_settings_tables.sql').read_text())
got=db.execute("select vocabulary_review_window_days,vocabulary_review_repetitions from tenant_practice_policy where tenant_id='tenant-default' and learner_stage='P6' and activity='vocabulary'").fetchone()
if got!=(11,4): errors.append(f'0045 did not preserve legacy vocabulary review settings: {got}')
if errors:
    print('HOTFIX5.2 TEST FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print('HOTFIX5.2 TEST PASS: compact settings tables, vocabulary review moved to Practice, and today-plan refresh fast path verified')
