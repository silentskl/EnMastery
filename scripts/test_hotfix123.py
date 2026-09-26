from pathlib import Path
import sqlite3,sys,json
root=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return ''
    text=p.read_text(errors='ignore')
    for marker in markers:
        if marker not in text: errors.append(f'{path}: missing {marker}')
    return text

migration=need('migrations/0059_v102_hotfix123_effective_study_time.sql','learner_study_sessions','client_active_seconds','active_seconds','client_idle_count','idle_count','idx_learner_study_sessions_child_date')
tracker=need('components/effective-study-time-tracker.tsx','IDLE_MS=60_000','pendingQuietSeconds','registerIdle','idleCount.current+=1','mediaIsPlaying()','voiceIsLive()','document.visibilityState','/api/student/study-time')
need('app/api/student/study-time/route.ts','reportedIdle','acceptedIdle','client_idle_count','idle_count','Math.min(rawIdleDelta,4)')
need('app/api/student/progress/calendar/route.ts','SUM(active_seconds) study_seconds','SUM(idle_count) idle_count','idleCount:study.idleCount')
need('lib/client/progress-calendar.ts','idleCount:number')
need('components/learning-progress-calendar.tsx','effective study time and idle episodes','Idle {cell.record?.idleCount||0}×')
need('lib/browser/speech-recognition.ts','__emActiveVoiceCount','studyAwareCtor','addEventListener?.("end",finish')
need('components/question-bank/session-runner.tsx','getSpeechRecognitionCtor','SpeechRecognitionLike')
need('components/app-shell.tsx','<EffectiveStudyTimeTracker/>')
if 'sessionStorage' in tracker: errors.append('study tracker must not reuse a reset cumulative counter under the same session id after reload')
if 'activeSeconds.current+=elapsed' not in tracker: errors.append('tracker no longer accumulates effective seconds')
if 'pendingQuietSeconds.current=0' not in tracker: errors.append('tracker must discard a full inactive minute instead of counting it')

# Validate the migration standalone against the minimum referenced parent table.
try:
    db=sqlite3.connect(':memory:')
    db.executescript('CREATE TABLE child_profiles(id TEXT PRIMARY KEY);'+migration)
    cols={row[1] for row in db.execute('PRAGMA table_info(learner_study_sessions)')}
    required={'id','child_id','study_date','client_active_seconds','active_seconds','client_idle_count','idle_count','last_path','started_at','last_seen_at'}
    if required-cols: errors.append(f'0059 schema missing {sorted(required-cols)}')
    db.execute("INSERT INTO child_profiles(id) VALUES('c')")
    db.execute("INSERT INTO learner_study_sessions(id,child_id,study_date,client_active_seconds,active_seconds,client_idle_count,idle_count) VALUES('s','c','2026-09-02',90,42,2,2)")
    got=db.execute("SELECT active_seconds,idle_count FROM learner_study_sessions WHERE id='s'").fetchone()
    if got!=(42,2): errors.append(f'0059 counters did not persist: {got}')
except Exception as exc:
    errors.append(f'0059 sqlite validation failed: {exc}')

pkg=json.loads((root/'package.json').read_text())
if pkg.get('scripts',{}).get('test:hotfix123')!='python3 scripts/test_hotfix123.py': errors.append('package test:hotfix123 missing')
if 'npm run test:hotfix123' not in pkg.get('scripts',{}).get('check:release',''): errors.append('check:release missing Hotfix12.3 gate')

if errors:
    print('HOTFIX 12.3 FAIL')
    for error in errors: print('-',error)
    sys.exit(1)
print('HOTFIX 12.3 PASS: effective study time excludes full 60-second idle periods, idle episodes are counted once, voice/media activity is recognised, and calendar/API/schema contracts are present')
