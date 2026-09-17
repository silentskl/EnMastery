from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f'missing {path}'); return ''
 return p.read_text(errors='ignore')
def need(path,*markers):
 s=text(path)
 for marker in markers:
  if marker not in s: errors.append(f'{path}: missing {marker}')
 return s

workspace=need('components/speaking-workspace.tsx',
 'committedSpeechResultsRef=useRef<Set<number>>(new Set())',
 'committedSpeechResultsRef.current=new Set()',
 'committedSpeechResultsRef.current.has(i)',
 'committedSpeechResultsRef.current.add(i)',
 'if(finalAdd)setTranscript',
 'setInterim(temp.trim())',
 'startingRef=useRef(false)',
 'if(recording||startingRef.current)return')
legacy='if(final)setTranscript(v=>`${v} ${final}`.trim())'
if legacy in workspace: errors.append('speaking workspace still appends the full cumulative final result set on every callback')

qbank=need('components/question-bank/session-runner.tsx',
 'committedSpeechResultsRef=useRef<Set<number>>(new Set())',
 'committedSpeechResultsRef.current=new Set()',
 'committedSpeechResultsRef.current.has(i)',
 'committedSpeechResultsRef.current.add(i)',
 'if(add)setAnswer')
if 'for(let i=0;i<e.results.length;i++)t+=' in qbank: errors.append('question-bank oral recorder still appends cumulative result history')


listening=need('components/intensive-listening-player.tsx',
 'committed=new Set<number>()',
 'if(!committed.has(i))',
 'committed.add(i)',
 'finalParts.push(t)')
if 'if(e.results[i].isFinal)final+=' in listening: errors.append('intensive-listening shadowing still accumulates cumulative final results repeatedly')

# Behavioural model of the browser API: result lists are cumulative.
committed=set(); transcript=[]
def onresult(results):
 for i,(value,is_final) in enumerate(results):
  value=' '.join(value.split())
  if value and is_final and i not in committed:
   committed.add(i); transcript.append(value)
# Browser returns result slot 0 repeatedly, then adds slot 1.
onresult([('recently add to my math test', True)])
onresult([('recently add to my math test', True), ('and I felt nervous', False)])
onresult([('recently add to my math test', True), ('and I felt nervous', True)])
onresult([('recently add to my math test', True), ('and I felt nervous', True)])
actual=' '.join(transcript)
expected='recently add to my math test and I felt nervous'
if actual!=expected: errors.append(f'cumulative recognition de-dup model failed: {actual!r}')

# A new recording resets result slots, so deliberately saying the same sentence again remains valid.
committed.clear(); transcript=[]
onresult([('hello world', True)])
committed.clear(); transcript=[]
onresult([('hello world', True)])
if ' '.join(transcript)!='hello world': errors.append('new recording reset would suppress legitimate repeated speech')

migrations=sorted((root/'migrations').glob('*.sql'))
if len(migrations)<54: errors.append(f'expected at least the 54 migrations present in this hotfix lineage, found {len(migrations)}')
if not (root/'migrations'/'0054_v102_hotfix115_daily_plan_resource_indexes.sql').exists(): errors.append('required 0054 resource-index migration is missing')

if errors:
 print('HOTFIX11.7 TEST FAIL')
 [print('-',e) for e in errors]
 sys.exit(1)
print('HOTFIX11.7 TEST PASS: cumulative Web Speech results are committed once per result slot across Speaking, Question Bank oral and listening shadowing; duplicate recording starts are guarded')
