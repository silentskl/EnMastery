from pathlib import Path
import sqlite3

root=Path(__file__).resolve().parents[1]
errors=[]

def need(path,*markers):
    text=(root/path).read_text()
    for marker in markers:
        if marker not in text: errors.append(f'{path} missing {marker}')
    return text

# UI + wiring regression checks.
learn=need('components/tenant-learn-settings.tsx','settingsTable','Vocabulary','vocabularyDailyWords','P1-P4','S4')
if 'vocabularyReviewWindowDays' in learn or 'Required reviews inside window' in learn: errors.append('Learning Settings still exposes vocabulary spaced-review controls')
practice=need('components/tenant-practice-settings.tsx','settingsTable','listening','speaking','reading','writing','vocabulary','grammar','cloze','Content stage','Questions / items','Difficulty','Review window','Required reviews')
practice_page=need('app/practice/page.tsx','PracticePolicyHub','Daily learning missions remain on Learn/Plan')
if "Today's four-skill mission" in practice_page or 'StudentPlan' in practice_page:
    errors.append("Practice page still contains Today's four-skill mission / StudentPlan")
need('app/api/admin/practice-settings/route.ts','tenant_practice_policy','content_stage','question_count','difficulty','vocabulary_review_window_days','vocabulary_review_repetitions')
need('app/api/student/question-bank/sessions/route.ts','getTenantPracticePolicy','difficultyRange','policy.questionCount','policy.contentStage')
need('app/api/student/vocabulary/training/route.ts','practicePolicy?.questionCount','practicePolicy.vocabularyReviewWindowDays','practicePolicy.vocabularyReviewRepetitions','practicePolicy.difficulty')
need('lib/student/planner.ts','PLANNER_VERSION','vocabularyDailyWords','readingMeetsDailyLimit','listeningMeetsDailyLimit')
need('app/api/student/listening/route.ts','getTenantPracticePolicy','difficultyRange','practicePolicy','contentStage')
need('app/api/student/listening/[id]/route.ts','policy.questionCount','difficultyRange','selectedQuestions')
need('components/grammar/grammar-learning-hub.tsx','selectPracticeExercises','practiceDifficulty','practiceTarget')
vocab=need('lib/vocabulary/collections.ts','vocabulary_training_rollups','appearance_days','last_training_day','requiredAppearances=reviews+1')

# Fresh schema and seed checks.
db=sqlite3.connect(':memory:')
for migration in sorted((root/'migrations').glob('*.sql')):
    try: db.executescript(migration.read_text())
    except Exception as exc:
        errors.append(f'migration failed: {migration.name}: {exc}')
        break

if not errors:
    migrations=len(list((root/'migrations').glob('*.sql')))
    if migrations<48: errors.append(f'expected at least 48 migrations, got {migrations}')
    cols={r[1] for r in db.execute('pragma table_info(tenant_daily_task_policy)')}
    for col in ['vocabulary_daily_words','vocabulary_review_window_days','vocabulary_review_repetitions']:
        if col not in cols: errors.append(f'tenant_daily_task_policy missing {col}')
    practice_cols={r[1] for r in db.execute('pragma table_info(tenant_practice_policy)')}
    for col in ['learner_stage','activity','content_stage','question_count','difficulty','vocabulary_review_window_days','vocabulary_review_repetitions']:
        if col not in practice_cols: errors.append(f'tenant_practice_policy missing {col}')
    rows=db.execute("select learner_stage,activity,content_stage,question_count,difficulty from tenant_practice_policy where tenant_id='tenant-default'").fetchall()
    if len(rows)!=49: errors.append(f'expected 49 seeded default practice policy rows, got {len(rows)}')
    if len({r[0] for r in rows})!=7 or len({r[1] for r in rows})!=7: errors.append('practice policy does not cover 7 stages x 7 activities')

    # Constraints and updates really persist.
    db.execute("update tenant_daily_task_policy set listen_video_max_seconds=600,read_max_words=850,vocabulary_daily_words=12,vocabulary_review_window_days=7,vocabulary_review_repetitions=2 where tenant_id='tenant-default' and school_level='P6'")
    got=db.execute("select listen_video_max_seconds,read_max_words,vocabulary_daily_words,vocabulary_review_window_days,vocabulary_review_repetitions from tenant_daily_task_policy where tenant_id='tenant-default' and school_level='P6'").fetchone()
    if got!=(600,850,12,7,2): errors.append(f'learning policy persistence mismatch: {got}')
    db.execute("update tenant_practice_policy set content_stage='P5',question_count=8,difficulty='hard' where tenant_id='tenant-default' and learner_stage='P6' and activity='reading'")
    db.execute("update tenant_practice_policy set vocabulary_review_window_days=9,vocabulary_review_repetitions=3 where tenant_id='tenant-default' and learner_stage='P6' and activity='vocabulary'")
    vgot=db.execute("select vocabulary_review_window_days,vocabulary_review_repetitions from tenant_practice_policy where tenant_id='tenant-default' and learner_stage='P6' and activity='vocabulary'").fetchone()
    if vgot!=(9,3): errors.append(f'vocabulary practice review policy persistence mismatch: {vgot}')
    got=db.execute("select content_stage,question_count,difficulty from tenant_practice_policy where tenant_id='tenant-default' and learner_stage='P6' and activity='reading'").fetchone()
    if got!=('P5',8,'hard'): errors.append(f'practice policy persistence mismatch: {got}')
    for sql in [
        "update tenant_daily_task_policy set vocabulary_daily_words=0 where tenant_id='tenant-default' and school_level='P6'",
        "update tenant_practice_policy set difficulty='impossible' where tenant_id='tenant-default' and learner_stage='P6' and activity='reading'",
        "update tenant_practice_policy set question_count=0 where tenant_id='tenant-default' and learner_stage='P6' and activity='reading'",
    ]:
        try:
            db.execute(sql); errors.append(f'constraint failed to reject: {sql}')
        except sqlite3.IntegrityError:
            db.rollback()

    # Vocabulary spaced-review semantics: several modes on one calendar day count once.
    db.execute("insert into users(id,email,role,display_name) values('h5-parent','h5@example.invalid','admin','H5')")
    db.execute("insert into child_profiles(id,parent_user_id,nickname,school_level,target_al,tenant_id) values('h5-child','h5-parent','H5','P6','AL2','tenant-default')")
    vids=[r[0] for r in db.execute("select vocabulary_id from vocabulary_collection_items where collection_id='sg-p6' order by item_order limit 2")]
    if len(vids)<2:
        errors.append('seed vocabulary insufficient for spaced review test')
    else:
        v1,v2=vids
        # v1: three exercise events on the same day => one appearance day; it must still need 2 more review days.
        for i,mode in enumerate(['pronounce','meaning','dictation']):
            db.execute("insert into vocabulary_training_events(id,child_id,collection_id,vocabulary_id,mode,correct,response_text,created_at) values(?,?,?,?,?,1,'x',datetime('now','-2 days'))",(f'h5-v1-{i}','h5-child','sg-p6',v1,mode))
        # v2: initial day + two additional distinct days => review requirement already satisfied.
        for i,days in enumerate([4,2,1]):
            db.execute("insert into vocabulary_training_events(id,child_id,collection_id,vocabulary_id,mode,correct,response_text,created_at) values(?,?,?,?, 'meaning',1,'x',datetime('now',?))",(f'h5-v2-{i}','h5-child','sg-p6',v2,f'-{days} days'))
        stats={r[0]:(r[1],r[2]) for r in db.execute("select vocabulary_id,count(distinct date(created_at,'+8 hours')) appearance_days,max(case when date(created_at,'+8 hours')=date('now','+8 hours') then 1 else 0 end) seen_today from vocabulary_training_events where child_id='h5-child' group by vocabulary_id")}
        if stats.get(v1)!=(1,0): errors.append(f'same-day vocabulary modes counted as multiple reviews: {stats.get(v1)}')
        if stats.get(v2)!=(3,0): errors.append(f'distinct-day vocabulary review count wrong: {stats.get(v2)}')
        due=dict(db.execute("SELECT vocabulary_id,CASE WHEN first_training_day>=date('now','+8 hours','-6 days') AND appearance_days<3 AND last_training_day<>date('now','+8 hours') THEN 1 ELSE 0 END due FROM vocabulary_training_rollups WHERE child_id='h5-child'").fetchall())
        if due.get(v1)!=1: errors.append('word still owed reviews is not due inside 7-day window')
        if due.get(v2)!=0: errors.append('word with initial + 2 review days is incorrectly still due')

if errors:
    print('HOTFIX5 TEST FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print('HOTFIX5 TEST PASS: 7-stage learning policy, 7-area practice policy, lesson filters, vocabulary spaced review, and Practice-page declutter checks passed')
