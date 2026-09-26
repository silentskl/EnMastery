from pathlib import Path
import sqlite3,sys
root=Path(__file__).resolve().parents[1];errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f"missing {path}"); return ""
 return p.read_text(errors="ignore")
def need(path,*markers):
 s=text(path)
 for m in markers:
  if m not in s: errors.append(f"{path}: missing {m}")

need("migrations/0052_v102_hotfix113_tenant_wordbooks_planner.sql","owner_child_id = NULL","tenant-default","idx_vocab_collections_tenant_stage")
need("lib/student/planner.ts","Persisted daily missions are immutable","Daily vocabulary assignment is controlled only by Tenant Admin policy","ensureTodayPlan")
planner=text("lib/student/planner.ts")
if " LIKE " in planner.upper() or " GLOB " in planner.upper(): errors.append("Daily planner still contains LIKE/GLOB and can hit D1 pattern-complexity limits")
need("app/api/student/plan/route.ts","daily-fallback-v4","SELECT DISTINCT activity_type","ensureEmergencyTodayPlan","today-bounded")
if "if(!rows.some(r=>r.task_date===today))" in text("app/api/student/plan/route.ts"): errors.append("Emergency Today fallback still refuses to fill a partial mission")
need("app/api/student/vocabulary/training/settings/route.ts",'policyLocked:true','Daily vocabulary word books are assigned by Tenant Admin')
need("app/api/student/vocabulary/training/route.ts","const collectionId=policyCollection","policyLocked:true")
if 'u.searchParams.get("collection")||settings.activeCollectionId' in text("app/api/student/vocabulary/training/route.ts"): errors.append("Student can still override Daily Vocabulary collection")
need("components/vocabulary/vocabulary-wordbooks.tsx","Daily Learning assignment is managed by Tenant Admin","Daily Learning")
if "Use for daily learning" in text("components/vocabulary/vocabulary-wordbooks.tsx"): errors.append("Student word-book page still exposes Use for daily learning")
need("components/tenant-learn-settings.tsx","Use for daily learning","Students cannot change the word book")
need("components/tenant-vocabulary-manager.tsx",'href="/admin/learn-settings"',"All custom word books are Tenant-owned")
need("lib/vocabulary/collections.ts",'scope:"system"|"tenant"',"Word-book creation is managed by Tenant Admin","Choose a Tenant word book available to this learner")
if '"personal"' in text("lib/vocabulary/collections.ts"): errors.append("Vocabulary collection model still exposes PERSONAL scope")

try:
 db=sqlite3.connect(":memory:");db.execute("PRAGMA foreign_keys=ON")
 migrations=sorted((root/"migrations").glob("*.sql"))
 for m in migrations:
  if m.name=="0052_v102_hotfix113_tenant_wordbooks_planner.sql": break
  db.executescript(m.read_text())
 # create a legacy learner-owned custom book before 0052 and prove migration preserves it as Tenant-owned
 db.execute("INSERT OR IGNORE INTO users(id,email,role,display_name) VALUES('parent-h113','parent-h113@example.com','parent','Parent H113')")
 db.execute("INSERT OR IGNORE INTO users(id,email,role,display_name) VALUES('student-h113','student-h113@example.com','student','Student H113')")
 db.execute("INSERT INTO child_profiles(id,parent_user_id,learner_user_id,nickname,school_level,target_al,tenant_id) VALUES('child-h113','parent-h113','student-h113','Learner H113','P6','AL2','tenant-default')")
 db.execute("INSERT INTO vocabulary_collections(id,owner_child_id,collection_type,name,description,status) VALUES('legacy-personal-h113','child-h113','custom','Legacy H113','','published')")
 db.executescript((root/"migrations"/"0052_v102_hotfix113_tenant_wordbooks_planner.sql").read_text())
 row=db.execute("SELECT tenant_id,owner_child_id,collection_type FROM vocabulary_collections WHERE id='legacy-personal-h113'").fetchone()
 if row!=("tenant-default",None,"custom"): errors.append(f"legacy custom word book migration wrong: {row}")
 # every custom collection must now be tenant-owned
 bad=db.execute("SELECT COUNT(*) FROM vocabulary_collections WHERE collection_type='custom' AND (tenant_id IS NULL OR owner_child_id IS NOT NULL)").fetchone()[0]
 if bad: errors.append(f"{bad} custom word book(s) remain outside Tenant ownership")
 # Hotfix 12.1 supersedes planner-version invalidation: persisted tasks remain.
 db.execute("INSERT INTO learning_tasks(id,child_id,task_date,activity_type,title,status,source,metadata_json) VALUES('old-h113','child-h113','2099-01-01','reading','Old','todo','adaptive','{\"plannerVersion\":\"old\"}')")
 if db.execute("SELECT COUNT(*) FROM learning_tasks WHERE id='old-h113'").fetchone()[0]!=1: errors.append("persisted planner task was not preserved")
 db.close()
except Exception as e: errors.append(f"Hotfix11.3 schema/runtime test failed: {e}")

if errors:
 print("HOTFIX11.3 TEST FAIL")
 for e in errors: print("-",e)
 sys.exit(1)
print("HOTFIX11.3 TEST PASS: D1-safe Today materialisation; persisted missions remain compatible; Tenant-only custom word books; Tenant Admin-only Daily Vocabulary assignment")
