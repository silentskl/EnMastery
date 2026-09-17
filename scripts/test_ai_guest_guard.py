from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[1]
routes=[
 'app/api/ai/chat/route.ts','app/api/student/speaking/respond/route.ts','app/api/student/speaking/transcribe/route.ts','app/api/student/speaking/tts/route.ts','app/api/student/speaking/assess/route.ts','app/api/student/vocabulary/enrich/route.ts','app/api/student/vocabulary/training/pronunciation/route.ts','app/api/student/cloze/session/[id]/summary/route.ts','app/api/student/summary/[id]/route.ts','app/api/student/writing/submit/route.ts','app/api/student/writing/submissions/[id]/review/route.ts','app/api/student/question-bank/sessions/[id]/answer/route.ts']
errors=[]
for rel in routes:
 s=(root/rel).read_text()
 body=s[s.find('export async function POST'):]
 if 'requireAuthenticatedLearner' not in body: errors.append(f'{rel}: missing runtime auth guard in POST handler'); continue
 guard=body.find('requireAuthenticatedLearner')
 ops=[x for x in [body.find('modelBridge'),body.find('enqueueJob'),body.find('azurePronunciationAssessment')] if x>=0]
 if ops and guard>min(ops): errors.append(f'{rel}: authentication guard appears after AI operation')
if errors: print('\n'.join(errors));sys.exit(1)
print(f'AI guest guard audit: PASS ({len(routes)} protected routes)')
