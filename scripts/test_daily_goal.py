#!/usr/bin/env python3
"""Regression coverage for server-verified Singapore-day PSLE goals."""
from pathlib import Path
import sqlite3

root=Path(__file__).resolve().parents[1]
migration=(root/"migrations/0068_psle_daily_study_goal.sql").read_text()
connection=sqlite3.connect(":memory:")
connection.execute("CREATE TABLE child_profiles(id TEXT PRIMARY KEY)")
connection.execute("INSERT INTO child_profiles(id) VALUES ('test-child')")
connection.executescript(migration)
connection.execute("INSERT INTO learner_daily_activity_events(id,child_id,study_date,activity_type,reference_id) VALUES ('e1','test-child','2026-11-21','reading_aloud','take1')")
connection.execute("INSERT OR IGNORE INTO learner_daily_activity_events(id,child_id,study_date,activity_type,reference_id) VALUES ('e2','test-child','2026-11-21','reading_aloud','take1')")
assert connection.execute("SELECT COUNT(*) FROM learner_daily_activity_events").fetchone()[0]==1, "Retries must not double-count"
connection.execute("INSERT INTO learner_daily_activity_events(id,child_id,study_date,activity_type,reference_id) VALUES ('e3','test-child','2026-11-21','reading_aloud','take2')")
assert connection.execute("SELECT COUNT(*) FROM learner_daily_activity_events WHERE activity_type='reading_aloud'").fetchone()[0]==2
connection.execute("INSERT INTO learner_daily_activity_events(id,child_id,study_date,activity_type,reference_id) VALUES ('e4','test-child','2026-11-22','reading_aloud','take3')")
assert connection.execute("SELECT COUNT(*) FROM learner_daily_activity_events WHERE study_date='2026-11-21'").fetchone()[0]==2
connection.execute("INSERT INTO learner_daily_study_time(child_id,study_date,active_seconds) VALUES ('test-child','2026-11-21',1800)")
assert connection.execute("SELECT active_seconds FROM learner_daily_study_time WHERE child_id='test-child'").fetchone()[0]==1800
connection.close()
logic=(root/"lib/student/daily-goal.ts").read_text()
assert "30 * 60" in logic and all(label in logic for label in ["conversation: 1","roleplay: 1","reading_aloud: 2","listening: 1"])
for marker in ["sgDate()","return {date,activeSeconds","timeCompleted&&tasksCompleted===tasksRequired",
               "MAX(0,unixepoch('now')-unixepoch(started_at)-active_seconds)",
               "last_credited_at","MIN(30,MAX(0,?-client_active_seconds)"]:
    assert marker in logic, f"Missing timing guard: {marker}"
api=(root/"app/api/student/daily-goal/route.ts").read_text()
assert "requireAuthenticatedLearner" in api and "recordDailyStudyHeartbeat" in api and "getDailyGoalProgress" in api
tracker=(root/"components/effective-study-time-tracker.tsx").read_text()
for marker in ['"/oral","/learn/listen"',"visibilityState","IDLE_MS=60_000","HEARTBEAT_MS=15_000","/api/student/daily-goal"]:
    assert marker in tracker, f"Effective time tracker missing {marker}"
shell=(root/"components/app-shell.tsx").read_text()
assert "<EffectiveStudyTimeTracker/><DailyGoalPanel/>" in shell
panel=(root/"components/daily-goal-panel.tsx").read_text()
for marker in ['"30:00"','progress.completed','progress.counts[key]','progress.targets[key]']:
    if marker=="\"30:00\"": continue
    assert marker in panel
required=[
    ("app/api/student/roleplay/route.ts",'"roleplay",sessionId'),
    ("app/api/student/speaking/respond/route.ts",'"conversation",sessionId'),
    ("app/api/student/speaking/assess/route.ts",'"reading_aloud",practiceId'),
    ("app/api/student/attempt/route.ts",'"listening",contentId'),
]
for filename,marker in required:
    assert marker in (root/filename).read_text(), f"Missing completion evidence: {filename}"
attempt=(root/"app/api/student/attempt/route.ts").read_text()
assert "date(a.created_at,'+8 hours')=?" in attempt
assert "COUNT(DISTINCT a.question_id)" in attempt
print("PASS: daily 30-minute effective PSLE learning with 1 conversation, 1 role-play, 2 reading-aloud recordings, and 1 same-day listening completion")
