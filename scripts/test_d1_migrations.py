from pathlib import Path
import sqlite3
import sys

root = Path(__file__).resolve().parents[1]
migrations = sorted((root / 'migrations').glob('*.sql'))
errors = []

# Apply the already-released baseline exactly as normal SQLite first.
db = sqlite3.connect(':memory:')
for migration in migrations:
    if migration.name.startswith('0043_'):
        break
    try:
        db.executescript(migration.read_text())
    except Exception as exc:
        errors.append(f'baseline migration failed before 0043: {migration.name}: {exc}')
        break

# Preserve a known pre-hotfix value so the 0043 table rebuild is tested for data loss.
if not errors:
    try:
        db.execute("UPDATE tenant_learn_availability SET lesson_limit=37 WHERE tenant_id='tenant-default' AND school_level='P6' AND domain='read'")
        db.commit()
    except Exception as exc:
        errors.append(f'could not prepare pre-0043 preservation row: {exc}')

# The remote D1 backend has historically enforced a very low compound SELECT limit.
# Python exposes SQLite's runtime limit, so reproduce that stricter environment locally.
if not errors:
    old_limit = db.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT, 3)
    try:
        # Prove the harness actually reproduces the D1 failure class.
        try:
            db.execute('SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4').fetchall()
            errors.append('strict compound-SELECT harness did not reject a four-term UNION ALL probe')
        except sqlite3.OperationalError as exc:
            if 'too many terms in compound SELECT' not in str(exc):
                errors.append(f'unexpected strict-limit probe error: {exc}')

        for name in [
            '0043_v102_daily_task_filters_learning_stages.sql',
            '0044_v102_learning_vocabulary_practice_policy.sql',
            '0045_v102_practice_vocab_review_and_settings_tables.sql',
            '0046_v102_daily_learning_reward_writing_speaking_cache.sql',
            '0047_v102_vocabulary_synonym_annotations.sql',
            '0048_v102_vocabulary_grammar_completeness.sql',
            '0049_v102_hotfix7_vocab_books.sql',
            '0050_v102_hotfix10_tenant_vocabulary_import.sql',
            '0051_v102_hotfix11_queue_timeout.sql',
            '0052_v102_hotfix113_tenant_wordbooks_planner.sql',
            '0053_v102_hotfix114_system_wordbook_visibility.sql',
            '0054_v102_hotfix115_daily_plan_resource_indexes.sql',
            '0055_v102_hotfix118_speaking_cooldown.sql',
            '0056_v102_hotfix119_d1_rows_read_optimization.sql',
            '0057_v102_hotfix120_vocab_daily_new_review.sql',
            '0058_v102_hotfix122_embedded_reward_games.sql',
            '0059_v102_hotfix123_effective_study_time.sql',
            '0060_v102_hotfix124_vocabulary_specialist.sql',
            '0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql',
        ]:
            sql = (root / 'migrations' / name).read_text()
            executable = '\n'.join(line.split('--',1)[0] for line in sql.splitlines())
            if 'UNION ALL' in executable.upper() or ' UNION ' in executable.upper():
                errors.append(f'{name} reintroduced a compound SELECT; use VALUES/CTE seeding for D1')
                continue
            db.executescript(sql)
    except Exception as exc:
        errors.append(f'D1-limit migration execution failed: {exc}')
    finally:
        db.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT, old_limit)

if not errors:
    got = db.execute("SELECT lesson_limit FROM tenant_learn_availability WHERE tenant_id='tenant-default' AND school_level='P6' AND domain='read'").fetchone()
    if got != (37,):
        errors.append(f'0043 failed to preserve existing Tenant Learn setting: {got}')

    daily = db.execute("SELECT school_level FROM tenant_daily_task_policy WHERE tenant_id='tenant-default' ORDER BY school_level").fetchall()
    if len(daily) != 7:
        errors.append(f'expected 7 Daily Task policy rows after 0043, got {len(daily)}')

    practice = db.execute("SELECT learner_stage, activity FROM tenant_practice_policy WHERE tenant_id='tenant-default'").fetchall()
    if len(practice) != 49:
        errors.append(f'expected 49 Practice policy rows after 0044/0045, got {len(practice)}')

    practice_cols = {row[1] for row in db.execute('PRAGMA table_info(tenant_practice_policy)')}
    practice_required = {'vocabulary_review_window_days','vocabulary_review_repetitions','vocabulary_collection_id'}
    practice_missing = practice_required - practice_cols
    if practice_missing:
        errors.append(f'0045 missing Vocabulary Practice review columns: {sorted(practice_missing)}')

    cols = {row[1] for row in db.execute('PRAGMA table_info(tenant_daily_task_policy)')}
    required = {'vocabulary_daily_words','vocabulary_review_window_days','vocabulary_review_repetitions','vocabulary_collection_id'}
    missing = required - cols
    if missing:
        errors.append(f'0044 missing Daily Task vocabulary columns: {sorted(missing)}')

    collection_cols = {row[1] for row in db.execute('PRAGMA table_info(vocabulary_collections)')}
    if 'tenant_id' not in collection_cols:
        errors.append('0050 missing vocabulary_collections.tenant_id')

    learning_cols = {row[1] for row in db.execute('PRAGMA table_info(tenant_learning_policy)')}
    if 'lesson_repeat_cooldown_days' not in learning_cols:
        errors.append('0055 missing tenant_learning_policy.lesson_repeat_cooldown_days')
    speaking_gate = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='speaking_daily_mode_progress'").fetchone()
    if speaking_gate != ('speaking_daily_mode_progress',):
        errors.append('0055 missing speaking_daily_mode_progress')
    for table in ['learning_task_day_rollups','vocabulary_training_rollups','tenant_ai_daily_rollups','generation_job_status_rollups']:
        if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone():
            errors.append(f'0056 missing D1 rollup table: {table}')
    trigger_count=db.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'").fetchone()[0]
    if trigger_count!=17:
        errors.append(f'0056 expected 17 total rollup/maintenance triggers, got {trigger_count}')
    if 'sample_key' not in {row[1] for row in db.execute('PRAGMA table_info(question_bank_items)')}:
        errors.append('0056 missing question_bank_items.sample_key')
    reward_cols={row[1] for row in db.execute('PRAGMA table_info(daily_game_rewards)')}
    if 'game_minutes' not in reward_cols:
        errors.append('0058 missing daily_game_rewards.game_minutes')
    embedded=db.execute("SELECT COUNT(*) FROM reward_game_catalog WHERE enabled=1 AND url LIKE '/rewards/game?game=%'").fetchone()[0]
    if embedded!=8:
        errors.append(f'0058 expected 8 enabled embedded reward games, got {embedded}')
    poki_enabled=db.execute("SELECT COUNT(*) FROM reward_game_catalog WHERE enabled=1 AND id LIKE 'poki-%'").fetchone()[0]
    if poki_enabled:
        errors.append(f'0058 left {poki_enabled} external Poki reward games enabled')
    study_cols={row[1] for row in db.execute('PRAGMA table_info(learner_study_sessions)')}
    study_required={'client_active_seconds','active_seconds','client_idle_count','idle_count','study_date','last_path'}
    study_missing=study_required-study_cols
    if study_missing:
        errors.append(f'0059 missing effective-study columns: {sorted(study_missing)}')
    if not db.execute("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_learner_study_sessions_child_date'").fetchone():
        errors.append('0059 missing learner study-date index')
    specialist_tables=['tenant_vocabulary_specialist_policy','vocabulary_specialist_sessions','vocabulary_specialist_wordbook','vocabulary_specialist_question_attempts','vocabulary_specialist_cloze_attempts']
    for table in specialist_tables:
        if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",(table,)).fetchone():
            errors.append(f'0060 missing Vocabulary Specialist table: {table}')
    specialist_policy=db.execute("SELECT learner_stage,daily_words FROM tenant_vocabulary_specialist_policy WHERE tenant_id='tenant-default' ORDER BY learner_stage").fetchall()
    if len(specialist_policy)!=7 or any(int(row[1])!=10 for row in specialist_policy):
        errors.append(f'0060 expected 7 default Vocabulary Specialist policy rows at 10 words, got {specialist_policy}')
    if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='speaking_daily_prompt_assignments'").fetchone():
        errors.append('0061 missing speaking_daily_prompt_assignments')
    else:
        assignment_cols={row[1] for row in db.execute('PRAGMA table_info(speaking_daily_prompt_assignments)')}
        for col in ['child_id','task_date','mode','prompt_id']:
            if col not in assignment_cols: errors.append(f'0061 speaking_daily_prompt_assignments missing {col}')
    for level in ['P5','P6']:
        rows=db.execute("SELECT v.body_json FROM content_items c JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version WHERE c.content_type='oral_prompt' AND c.status='published' AND c.school_level=?",(level,)).fetchall()
        mode_counts={'conversation':0,'reading_aloud':0,'stimulus':0}
        import json as _json
        for (raw,) in rows:
            try: mode=_json.loads(raw or '{}').get('mode','conversation')
            except Exception: mode='conversation'
            if mode not in mode_counts: mode='conversation'
            mode_counts[mode]+=1
        for mode,count in mode_counts.items():
            if count<8: errors.append(f'0061 {level} {mode} pool too small for hard 7-day rotation: {count}')

if errors:
    print('D1 MIGRATION COMPAT TEST FAIL')
    for error in errors:
        print('-', error)
    sys.exit(1)

print('D1 MIGRATION COMPAT TEST PASS: 0043-0061 execute under SQLITE_LIMIT_COMPOUND_SELECT=3; settings preserved; Hotfix 11.9 rollups plus embedded reward-game plus effective-study/idle plus Vocabulary Specialist migration validated')
