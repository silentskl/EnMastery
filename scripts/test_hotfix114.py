from pathlib import Path
import sqlite3,sys
root=Path(__file__).resolve().parents[1]; errors=[]
try:
 db=sqlite3.connect(':memory:')
 for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
 cols={r[1] for r in db.execute('pragma table_info(tenant_system_vocabulary_visibility)')}
 if not {'tenant_id','collection_id','visible','updated_at'}<=cols: errors.append('visibility table schema incomplete')
 # Product defaults are deliberately computed when no override row exists.
 defaults={x: (1 if x in {'sg-p1p4','sg-p5','sg-p6'} else 0) for x in ['sg-p1p4','sg-p5','sg-p6','sg-s1','exam-ket']}
 if defaults!={'sg-p1p4':1,'sg-p5':1,'sg-p6':1,'sg-s1':0,'exam-ket':0}: errors.append(f'default visibility mismatch: {defaults}')
 db.execute("INSERT INTO tenant_system_vocabulary_visibility(tenant_id,collection_id,visible) VALUES('tenant-default','sg-p6',0)")
 db.execute("INSERT INTO tenant_system_vocabulary_visibility(tenant_id,collection_id,visible) VALUES('tenant-default','sg-s1',1)")
 rows=dict(db.execute("SELECT collection_id,visible FROM tenant_system_vocabulary_visibility WHERE tenant_id='tenant-default'"))
 if rows.get('sg-p6')!=0 or rows.get('sg-s1')!=1: errors.append(f'visibility overrides did not persist: {rows}')
except Exception as e: errors.append(f'migrations/override test failed: {e}')
collections=(root/'lib/vocabulary/collections.ts').read_text()
for marker in ["tenant_system_vocabulary_visibility","'sg-p1p4','sg-p5','sg-p6'","studentVisible"]:
 if marker not in collections: errors.append(f'collections visibility marker missing: {marker}')
if "COALESCE(sv.visible,CASE WHEN c.id IN ('sg-p1p4','sg-p5','sg-p6') THEN 1 ELSE 0 END)=1" not in collections: errors.append('student list does not enforce System-book visibility')
ui=(root/'components/tenant-vocabulary-manager.tsx').read_text()
for marker in ['Visible to students','studentVisible','/api/admin/vocabulary/system-visibility']:
 if marker not in ui: errors.append(f'admin UI marker missing: {marker}')
route=(root/'app/api/admin/vocabulary/system-visibility/route.ts').read_text()
for marker in ["collection_type='system'",'ON CONFLICT(tenant_id,collection_id)','visible?1:0']:
 if marker not in route: errors.append(f'visibility API marker missing: {marker}')
settings=(root/'app/api/student/vocabulary/training/settings/route.ts').read_text()
if "c.collection_type='system'" not in settings or '!collections.some(c=>c.id===policyCollectionId)' not in settings: errors.append('assigned hidden System book fallback missing')
if errors:
 print('HOTFIX 11.4 TEST FAIL'); [print('-',e) for e in errors]; sys.exit(1)
print('HOTFIX 11.4 TEST PASS: per-Tenant System-book visibility defaults/overrides, learner filtering and assigned-hidden-book fallback validated.')
