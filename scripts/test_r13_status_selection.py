from pathlib import Path
import sqlite3

root=Path(__file__).resolve().parents[1]
errors=[]

def require(path,*markers):
    text=(root/path).read_text(errors='ignore')
    for marker in markers:
        if marker not in text:
            errors.append(f'{path}: missing {marker}')
    return text

# Curated status selection must operate on the filtered result, not only the current page.
curated=require('components/curated-story-bank.tsx','Curated only','Resolved only','Select up to 20 filtered','filtered.slice(0, MAX_BATCH)')
if 'pageRows.slice(0, MAX_BATCH)' not in curated:
    errors.append('curated bank lost explicit page-select path')

# Status-first selection is shared across the principal admin resource surfaces.
for path, markers in {
    'components/admin-content-manager.tsx': ('statusFilter','filteredContents','Select filtered'),
    'components/tenant-content-manager.tsx': ('statusFilter','filteredContents','Select filtered'),
    'components/admin-listening-manager.tsx': ('libraryStatus','filteredContents','sourceStatus','Select filtered'),
    'components/tenant-listening-manager.tsx': ('libraryStatus','filteredRows','Select filtered'),
    'components/admin-question-manager.tsx': ('statusFilter','filteredQuestions','Select filtered'),
    'components/tenant-question-manager.tsx': ('statusFilter','filteredQuestions','Select filtered'),
    'components/question-bank/admin-bank.tsx': ('reviewFilter','filteredDrafts','Select filtered'),
    'components/question-bank/tenant-bank.tsx': ('reviewFilter','filteredDrafts','Select filtered'),
    'components/tenant-course-manager.tsx': ('courseStatus','filteredCourses','Select filtered'),
}.items():
    require(path,*markers)

# Changing status must clear selections on major multi-select surfaces.
for path, marker in [
    ('components/curated-story-bank.tsx','setSelected([]);'),
    ('components/admin-content-manager.tsx','setSelectedRows([])'),
    ('components/tenant-content-manager.tsx','setSelectedRows([])'),
    ('components/admin-listening-manager.tsx','setSelectedLessons([])'),
    ('components/tenant-listening-manager.tsx','setSelectedLessons([])'),
    ('components/admin-question-manager.tsx','setSelected([])'),
    ('components/tenant-question-manager.tsx','setSelected([])'),
    ('components/question-bank/admin-bank.tsx','setSelected(new Set())'),
    ('components/question-bank/tenant-bank.tsx','setSelected(new Set())'),
    ('components/tenant-course-manager.tsx','setSelectedCourses([])'),
]:
    require(path,marker)

# Fresh schema still supports the course statuses used by the R13 bulk PATCH.
db=sqlite3.connect(':memory:')
db.execute('PRAGMA foreign_keys=ON')
for migration in sorted((root/'migrations').glob('*.sql')):
    db.executescript(migration.read_text())
cols={row[1]: row for row in db.execute('PRAGMA table_info(courses)')}
if 'status' not in cols:
    errors.append('courses.status missing after migrations')
route=require('app/api/admin/courses/route.ts','export async function PATCH','status === "archived"','status === "draft"','tenant_id=?')

# Seed catalogue remains complete and status is derivable without a schema change.
count=db.execute('SELECT COUNT(*) FROM listening_story_catalog WHERE enabled=1').fetchone()[0]
if count!=120:
    errors.append(f'expected 120 enabled curated stories, found {count}')
resolved=db.execute('SELECT COUNT(*) FROM listening_story_catalog WHERE resolved_video_id IS NOT NULL').fetchone()[0]
if not (0 <= resolved <= count):
    errors.append('invalid resolved count')

if errors:
    print('FAIL')
    for error in errors: print('-',error)
    raise SystemExit(1)
print(f'PASS R13 status-selection; curated stories={count}; schema migrations={len(list((root/"migrations").glob("*.sql")))}')
