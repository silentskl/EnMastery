from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
errors=[]
route=(root/'app/api/student/vocabulary-specialist/route.ts').read_text(errors='ignore')
expected='const kind: StoredClozeItem["kind"] = item.kind==="synonym_choice"?"synonym_choice":"fill";'
map_expected='return raw.map<StoredClozeItem>((item,position)=>{'
if expected not in route:
    errors.append('clozeItems must explicitly narrow kind to StoredClozeItem["kind"]')
if map_expected not in route:
    errors.append('clozeItems map must be typed as StoredClozeItem to prevent return-type widening')
if 'const kind=item.kind==="synonym_choice"?"synonym_choice":"fill";' in route:
    errors.append('untyped kind expression can widen to string and break tsc')
pkg=(root/'package.json').read_text(errors='ignore')
if 'test:hotfix1242' not in pkg or 'npm run test:hotfix1242' not in pkg:
    errors.append('Hotfix 12.4.2 release gate is missing')
if errors:
    print('HOTFIX 12.4.2 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.4.2 PASS: StoredClozeItem.kind literal-union narrowing regression is guarded')
