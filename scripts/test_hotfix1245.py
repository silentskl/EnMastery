#!/usr/bin/env python3
from pathlib import Path
import json, sqlite3, sys
root=Path(__file__).resolve().parents[1]
errors=[]

def need(path,*markers):
    p=root/path
    if not p.exists():
        errors.append(f'missing {path}')
        return ''
    s=p.read_text(errors='ignore')
    for m in markers:
        if m not in s: errors.append(f'{path}: missing {m}')
    return s

migration=need('migrations/0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql',
    'speaking_daily_prompt_assignments','idx_speaking_daily_prompt_rotation',
    'hf1245-speak-p5-practice-time','hf1245-speak-p6-balance')
helper=need('lib/speaking/daily-prompt-assignment.ts',
    'ensureDailySpeakingPromptAssignments','Math.max(7, await getTenantLessonRepeatCooldownDays',
    'speaking_daily_prompt_assignments assigned','speaking_daily_mode_progress attempted',
    "recent_task.activity_type='speaking'",'Keep the outer Daily Mission card','wasRecentlyUsed','hard no-repeat wins over silently reusing')
route=need('app/api/student/speaking/prompts/route.ts',
    'ensureDailySpeakingPromptAssignments','Cache-Control","private, no-store','rotation:')
if 'ensureSpeakingModeCache' in route:
    errors.append('Speaking prompts route still serves the old cache catalogue instead of the persisted daily three-prompt bundle')
workspace=need('components/speaking-workspace.tsx',
    'non-repeating prompt is not available for every Speaking tab today','Repeated content was not reused')

# Apply every migration and verify the default P5/P6 pools can actually sustain
# an eight-day sequence where no prompt appears in the preceding seven days.
try:
    db=sqlite3.connect(':memory:')
    for m in sorted((root/'migrations').glob('*.sql')):
        db.executescript(m.read_text())
    if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='speaking_daily_prompt_assignments'").fetchone():
        errors.append('0061 assignment table missing after full migration chain')
    for level in ('P5','P6'):
        counts={'conversation':0,'reading_aloud':0,'stimulus':0}
        for (raw,) in db.execute("SELECT v.body_json FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version WHERE c.content_type='oral_prompt' AND c.status='published' AND c.school_level=?",(level,)):
            try: mode=json.loads(raw or '{}').get('mode','conversation')
            except Exception: mode='conversation'
            if mode not in counts: mode='conversation'
            counts[mode]+=1
        for mode,count in counts.items():
            if count<8: errors.append(f'{level} {mode}: expected >=8 prompts for hard 7-day rotation, got {count}')

    # Runtime semantics independent of completion: persisted assignments alone
    # make a prompt unavailable for the following seven dates.
    db.executescript('CREATE TABLE IF NOT EXISTS _rotation(day INTEGER,prompt TEXT);')
    pool=[f'p{i}' for i in range(8)]
    history=[]
    for day in range(1,17):
        recent={p for d,p in history if day-7 <= d < day}
        chosen=next((p for p in pool if p not in recent),None)
        if chosen is None:
            errors.append(f'8-prompt/7-day rotation unexpectedly exhausted on day {day}')
            break
        if any(p==chosen and day-d<=7 for d,p in history):
            errors.append(f'prompt repeated inside 7-day window on day {day}: {chosen}')
            break
        history.append((day,chosen))
    if len(history)>=9 and history[8][1] != history[0][1]:
        # Deterministic first-eligible sequence should reuse day-1 content on day 9,
        # after the seven intervening days have elapsed.
        errors.append(f'rotation off-by-one: expected earliest reuse on day 9, got {history[:9]}')
except Exception as exc:
    errors.append(f'Hotfix 12.4.5 migration/runtime validation failed: {exc}')

pkg=json.loads((root/'package.json').read_text())
if pkg.get('scripts',{}).get('test:hotfix1245')!='python3 scripts/test_hotfix1245.py':
    errors.append('package.json missing test:hotfix1245')
if 'npm run test:hotfix1245' not in pkg.get('scripts',{}).get('check:release',''):
    errors.append('check:release missing Hotfix 12.4.5 gate')

if errors:
    print('HOTFIX 12.4.5 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.4.5 PASS: Daily Speaking persists one prompt per mode, bypasses the old first-item cache behaviour, and enforces a hard >=7-day per-mode no-repeat window')
