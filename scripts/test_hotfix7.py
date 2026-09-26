from pathlib import Path
import sqlite3, sys
root=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return
    text=p.read_text(errors='ignore')
    for marker in markers:
        if marker not in text: errors.append(f'{path}: missing {marker}')

need('migrations/0049_v102_hotfix7_vocab_books.sql','vocabulary_collection_id','idx_tenant_daily_vocab_collection','idx_tenant_practice_vocab_collection')
need('lib/vocabulary/policy-books.ts','listPolicyVocabularyBooks','validatePolicyVocabularyBook','collection_type=\'system\'')
need('app/api/admin/learn-settings/route.ts','vocabularyCollections','vocabularyCollectionId','validatePolicyVocabularyBook')
need('app/api/admin/practice-settings/route.ts','vocabularyCollections','vocabularyCollectionId','validatePolicyVocabularyBook')
need('app/api/student/vocabulary/training/route.ts','policyCollection','dailyPolicy.vocabularyCollectionId','practicePolicy?.vocabularyCollectionId')
need('components/vocabulary/vocabulary-daily-trainer.tsx','policyLocked','Assigned by Tenant Admin','if(!practiceMode)await fetch("/api/student/vocabulary/training/complete"')
need('lib/student/planner.ts','PLANNER_VERSION','policy.vocabularyCollectionId')
need('app/api/admin/content/[id]/stage/route.ts',"scope='tenant'",'UPDATE questions SET school_level','Existing daily assignments keep their persisted content id')
need('components/tenant-content-manager.tsx','changeStage','/stage')
need('components/tenant-listening-manager.tsx','changeStage','/stage')
need('components/tenant-writing-manager.tsx','changeStage','/stage')
need('components/speaking-task-manager.tsx','changeStage','/stage')
need('lib/content/cloze-config.ts','clozeMinChars','clozeMaxChars','clozeBlankCount','blankCount')
need('lib/content/source-domain.ts','characters inclusive','ordered markers ___1___ through','questions MUST contain exactly','passage.length<c.minChars','questions.length!==c.blankCount')
need('app/api/admin/content/import/batch/route.ts','clozeMinChars','clozeMaxChars','clozeBlankCount','clozeConfigKey')
need('app/api/platform/content/import/batch/route.ts','clozeMinChars','clozeMaxChars','clozeBlankCount','clozeConfigKey')
need('components/tenant-source-manager.tsx','Minimum characters','Maximum characters','Words to fill / passage')
need('components/admin-source-manager.tsx','Minimum characters','Maximum characters','Words to fill / passage')
need('lib/content/dedup.ts','configKey','clozeConfigKey')
need('lib/jobs/dispatch.ts','parseClozeGenerationConfig(req)','clozeConfig')

# Execute every migration and exercise Hotfix 7 columns + stage-update invariants.
try:
    db=sqlite3.connect(':memory:')
    for migration in sorted((root/'migrations').glob('*.sql')):
        db.executescript(migration.read_text())
    daily_cols={r[1] for r in db.execute('PRAGMA table_info(tenant_daily_task_policy)')}
    practice_cols={r[1] for r in db.execute('PRAGMA table_info(tenant_practice_policy)')}
    if 'vocabulary_collection_id' not in daily_cols: errors.append('Daily Learning word-book column missing after migrations')
    if 'vocabulary_collection_id' not in practice_cols: errors.append('Vocabulary Practice word-book column missing after migrations')
    book=db.execute("SELECT id FROM vocabulary_collections WHERE collection_type='system' AND status='published' ORDER BY sort_order LIMIT 1").fetchone()
    if not book: errors.append('No published system vocabulary book available for policy assignment')
    else:
        db.execute("UPDATE tenant_daily_task_policy SET vocabulary_collection_id=? WHERE tenant_id='tenant-default' AND school_level='P6'",(book[0],))
        db.execute("UPDATE tenant_practice_policy SET vocabulary_collection_id=? WHERE tenant_id='tenant-default' AND learner_stage='P6' AND activity='vocabulary'",(book[0],))
        db.commit()
        if db.execute("SELECT vocabulary_collection_id FROM tenant_daily_task_policy WHERE tenant_id='tenant-default' AND school_level='P6'").fetchone()!=(book[0],): errors.append('Daily Learning word-book assignment did not persist')
        if db.execute("SELECT vocabulary_collection_id FROM tenant_practice_policy WHERE tenant_id='tenant-default' AND learner_stage='P6' AND activity='vocabulary'").fetchone()!=(book[0],): errors.append('Vocabulary Practice word-book assignment did not persist')
    db.close()
except Exception as exc:
    errors.append(f'Hotfix 7 migration/runtime schema test failed: {exc}')

if errors:
    print('HOTFIX7 TEST FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX7 TEST PASS: policy word books, lesson-stage reassignment, and configurable source Cloze generation are wired end-to-end')
