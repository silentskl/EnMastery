from pathlib import Path
import sqlite3, sys

root=Path(__file__).resolve().parents[1]
errors=[]

def need(path,*markers):
    p=root/path
    if not p.exists():
        errors.append(f'missing {path}')
        return
    text=p.read_text(errors='ignore')
    for marker in markers:
        if marker not in text:
            errors.append(f'{path}: missing {marker}')

# Custom word-book save destination remains in lessons. Bulk create/import moved to Tenant Admin in Hotfix 10.
need('components/vocabulary/custom-wordbook-picker.tsx','My vocabulary only','collectionType==="custom"')
need('components/vocabulary/selection-vocabulary.tsx','CustomWordbookPicker','collectionId:collectionId||null','Add to word book')
need('components/vocabulary/vocabulary-add-button.tsx','CustomWordbookPicker','collectionId:collectionId||null','Add to word book')
need('app/api/student/vocabulary/route.ts','ensureCollectionAccess','addVocabularyToCollection','collection.collection_type!=="custom"')
need('app/api/student/vocabulary/collections/[id]/import/route.ts','available only in Tenant Admin')

# Day-scoped Daily Tasks repair.
need('lib/student/tasks.ts',"date(COALESCE(completed_at,updated_at),'+8 hours')=?","date(COALESCE(passed_at,updated_at),'+8 hours')=?",'removeStaleAdaptiveTask','passedBeforeToday')
need('lib/student/planner.ts','daily-cache-v12-eligible-before-limit',"p.status='completed' AND p.progress_percent>=100","w.prompt_id=learning_tasks.activity_id AND w.passed=1",'cooldownStart')
need('app/api/student/plan/route.ts','ensureTodayPlan','ensureWeeklyPlan','today-bounded')
need('components/student-plan.tsx','nextSingaporeRollover','visibilitychange','window.addEventListener("focus"')

try:
    db=sqlite3.connect(':memory:')
    db.execute('PRAGMA foreign_keys=ON')
    for migration in sorted((root/'migrations').glob('*.sql')):
        db.executescript(migration.read_text())

    # Empty custom books must be valid persisted collections with zero members.
    db.execute("INSERT INTO users (id,email,role,display_name) VALUES ('parent-h8','parent-h8@example.com','parent','Parent H8')")
    db.execute("INSERT INTO users (id,email,role,display_name) VALUES ('student-h8','student-h8@example.com','student','Student H8')")
    db.execute("INSERT INTO child_profiles (id,parent_user_id,learner_user_id,nickname,school_level,tenant_id) VALUES ('child-h8','parent-h8','student-h8','Learner H8','P6','tenant-default')")
    db.execute("INSERT INTO vocabulary_collections (id,tenant_id,collection_type,name,description,status) VALUES ('custom-empty-h8','tenant-default','custom','Empty H8','','published')")
    n=db.execute("SELECT COUNT(*) FROM vocabulary_collection_items WHERE collection_id='custom-empty-h8'").fetchone()[0]
    if n != 0:
        errors.append('Empty custom word book unexpectedly contains terms')

    # A vocabulary item can be attached to that custom book after it is saved.
    detail='{"term":"careful","normalizedTerm":"careful","entryType":"word","meanings":[{"definition":"taking care"}],"examples":[],"synonyms":[],"antonyms":[],"collocations":[],"wordFamily":[],"grammarPatterns":[],"usageNotes":[],"commonMistakes":[],"topicTags":[]}'
    db.execute("INSERT INTO vocabulary_items (id,lemma,definition_json,entry_type,normalized_text,details_json,created_at,updated_at) VALUES ('v-h8','careful','[]','word','careful',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",(detail,))
    db.execute("INSERT INTO vocabulary_collection_items (collection_id,vocabulary_id,item_order) VALUES ('custom-empty-h8','v-h8',1)")
    n=db.execute("SELECT COUNT(*) FROM vocabulary_collection_items WHERE collection_id='custom-empty-h8'").fetchone()[0]
    if n != 1:
        errors.append('Could not append a term to an existing custom word book')

    # Day-scoping: yesterday's completed lesson must NOT count as today's PASS.
    db.execute("INSERT INTO content_items (id,content_type,title,school_level,status) VALUES ('read-h8','article','Reading H8','P6','published')")
    db.execute("INSERT INTO learner_content_progress (child_id,content_id,status,progress_percent,completed_at,updated_at) VALUES ('child-h8','read-h8','completed',100,'2026-08-31 09:00:00','2026-08-31 09:00:00')")
    row=db.execute("""SELECT
      CASE WHEN status='completed' AND progress_percent>=100 AND date(COALESCE(completed_at,updated_at),'+8 hours')='2026-09-01' THEN 1 ELSE 0 END passed_today,
      CASE WHEN status='completed' AND progress_percent>=100 AND date(COALESCE(completed_at,updated_at),'+8 hours')<'2026-09-01' THEN 1 ELSE 0 END passed_before
      FROM learner_content_progress WHERE child_id='child-h8' AND content_id='read-h8'""").fetchone()
    if row != (0,1):
        errors.append(f'Day-scoped completion classification is wrong: {row}')

    # A completion on the Singapore day must count.
    db.execute("UPDATE learner_content_progress SET completed_at='2026-09-01 02:00:00',updated_at='2026-09-01 02:00:00' WHERE child_id='child-h8' AND content_id='read-h8'")
    row=db.execute("""SELECT CASE WHEN date(COALESCE(completed_at,updated_at),'+8 hours')='2026-09-01' THEN 1 ELSE 0 END FROM learner_content_progress WHERE child_id='child-h8' AND content_id='read-h8'""").fetchone()
    if row != (1,):
        errors.append('Same-day completion is not recognised')

    # Pre-selected future tasks must be invalidated if their content was completed early.
    db.execute("UPDATE learner_content_progress SET completed_at='2026-09-01 02:00:00',updated_at='2026-09-01 02:00:00' WHERE child_id='child-h8' AND content_id='read-h8'")
    db.execute("INSERT INTO learning_tasks (id,child_id,task_date,activity_type,activity_id,title,status,source,metadata_json) VALUES ('task-future-h8','child-h8','2026-09-02','reading','read-h8','Read H8','todo','adaptive','{}')")
    stale=db.execute("""SELECT COUNT(*) FROM learning_tasks t WHERE t.id='task-future-h8' AND EXISTS (
      SELECT 1 FROM learner_content_progress p WHERE p.child_id=t.child_id AND p.content_id=t.activity_id AND p.status='completed' AND p.progress_percent>=100 AND date(COALESCE(p.completed_at,p.updated_at),'+8 hours')<t.task_date
    )""").fetchone()[0]
    if stale != 1:
        errors.append('Future stale Daily Task was not detectable for replacement')
    db.close()
except Exception as exc:
    errors.append(f'Hotfix 8 runtime/schema test failed: {exc}')

if errors:
    print('HOTFIX8 TEST FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX8 TEST PASS: empty/create+import/append custom word books, lesson save destination, and Singapore-day Daily Task rollover are covered')
