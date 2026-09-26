from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1]
errors=[]
route=(root/'app/api/student/progress/calendar/route.ts').read_text(errors='ignore')
if 'as D1Result<StudyRow>' in route:
    errors.append('calendar route still fabricates D1Result<StudyRow>')
if '.all<StudyRow>().then(result=>result.results).catch(()=>[] as StudyRow[])' not in route:
    errors.append('calendar study query is not normalised to StudyRow[]')
if 'studyRows.map(r=>' not in route:
    errors.append('calendar aggregation does not consume StudyRow[] directly')
pkg=json.loads((root/'package.json').read_text())
if pkg.get('scripts',{}).get('test:hotfix1231')!='python3 scripts/test_hotfix1231.py':
    errors.append('package test:hotfix1231 missing')
if 'npm run test:hotfix1231' not in pkg.get('scripts',{}).get('check:release',''):
    errors.append('check:release missing Hotfix12.3.1 gate')
if errors:
    print('HOTFIX 12.3.1 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.3.1 PASS: progress calendar uses a plain StudyRow[] fallback and no incomplete D1Result cast')
