from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
errors=[]
def text(path):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return ''
    return p.read_text(errors='ignore')
policy=text('lib/settings/daily-task-policy.ts')
for marker in ['let raw: unknown[] = []','Array.from(new Set<number>(normalized))','.filter((n: number): boolean =>']:
    if marker not in policy: errors.append(f'daily-task-policy missing strict typing marker: {marker}')
cache=text('lib/speaking/prompt-cache.ts')
if cache.count('description:') < 3: errors.append('speaking fallback prompts do not all provide required description')
enrich=text('lib/vocabulary/enrich.ts')
for marker in ['VocabularySynonym','function synonymNotes(value: unknown): VocabularySynonym[]','const synonym: VocabularySynonym = { term, nuance }']:
    if marker not in enrich: errors.append(f'vocabulary synonym typing missing: {marker}')
if 'filter((x):x is {term:string;nuance:string' in enrich: errors.append('old incompatible synonym type predicate remains')
if errors:
    print('HOTFIX6.1 TYPE REGRESSION FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX6.1 TYPE REGRESSION PASS: weekday parsing, SpeakingPrompt fallbacks, and VocabularySynonym normalization use strict compatible types')
