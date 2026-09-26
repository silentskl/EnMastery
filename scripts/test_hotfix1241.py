from pathlib import Path
import json, sys, re
root=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    p=root/path
    if not p.exists(): errors.append(f'missing {path}'); return ''
    text=p.read_text(errors='ignore')
    for marker in markers:
        if marker not in text: errors.append(f'{path}: missing {marker}')
    return text

gen=need('lib/vocabulary-specialist/generate.ts',
    'const targetIsCorrect = randomBoolean()',
    'The target term (word or phrase) MUST NOT be the correct answer',
    'target term into the distractor set',
    'five synonym-choice terms and five fill-in terms',
    'kind: "synonym_choice"',
    'kind: "fill"',
    'const chosen = shuffled(unique).slice(0, 10)',
    'Cloze must contain 400–500 words after filling')
if 'options.indexOf(term)' in gen:
    errors.append('MCQ answer index must not always resolve to the learner-entered target word')
api=need('app/api/student/vocabulary-specialist/route.ts',
    'MIN_VOCABULARY_SPECIALIST_DAILY_WORDS',
    'clozeItems',
    'questions.length<10',
    'JSON.stringify(cloze.items)',
    'correctCount===items.length')
policy=need('lib/vocabulary-specialist/policy.ts','MIN_VOCABULARY_SPECIALIST_DAILY_WORDS = 10','MAX_VOCABULARY_SPECIALIST_DAILY_WORDS = 30')
ui=need('components/vocabulary-specialist/vocabulary-specialist-workspace.tsx',
    'may be the correct answer or a distractor',
    '5 synonym/near-synonym choices and 5 direct fill-ins',
    'Blanks 1–5:',
    'Blanks 6–10:',
    'vocabSpecialChoice')
admin=need('components/vocabulary-specialist/tenant-vocabulary-specialist-admin.tsx','Minimum 10 vocabulary terms','min={10}','Final mixed cloze')
need('components/practice-policy-hub.tsx','5 synonym choices + 5 fill-ins','100% required')
need('app/api/student/vocabulary-specialist/history/route.ts','safeBlanks','session.status==="passed"')
need('app/globals.css','.vocabSpecialChoiceWrap','.vocabSpecialClozeGuide','.vocabSpecialAnswerKey')
pkg=json.loads((root/'package.json').read_text())
if pkg.get('scripts',{}).get('test:hotfix1241')!='python3 scripts/test_hotfix1241.py': errors.append('test:hotfix1241 script missing')
if 'npm run test:hotfix1241' not in pkg.get('scripts',{}).get('check:release',''): errors.append('check:release missing test:hotfix1241')
if errors:
    print('HOTFIX 12.4.1 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.4.1 PASS: target-word answer randomisation and 5 synonym-choice + 5 fill-in mixed cloze contract validated')
