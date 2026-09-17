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

if errors:
    print('D1 MIGRATION COMPAT TEST FAIL')
    for error in errors:
        print('-', error)
    sys.exit(1)

print('D1 MIGRATION COMPAT TEST PASS: 0043-0056 execute under SQLITE_LIMIT_COMPOUND_SELECT=3; settings preserved; Hotfix 11.9 rollups, sampling indexes and maintenance triggers validated')
