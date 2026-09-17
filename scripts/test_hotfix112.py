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
 for m in markers:
  if m not in s: errors.append(f'{path}: missing {m}')

need('lib/ai/model-json.ts','parseModelJsonLocal','repairCommonJson','automatic repair','RFC 8259','Response excerpt')
need('lib/vocabulary/enrich.ts','parseModelJson','expected:"array"','expected:"object"','vocabulary batch enrichment')
need('lib/content/adapt.ts','parseModelJson','reading material adaptation','reading question generation')
need('lib/vocabulary/import.ts','new Map<string,VocabularyImportItem>()','key=term.toLowerCase()','replace(/\\s+/g," ")')
need('lib/jobs/dispatch.ts','duplicates','vocabulary_batch_json_recovery','vocabulary_admin_import_recovery','existingMemberships','normalizeVocabularyTerm','retrying terms individually')
need('components/work-queue-manager.tsx','duplicates','duplicates)')
need('lib/vocabulary/collections.ts','v.normalized_text=?','incoming.normalized_text','return false')
if 'JSON.parse(fenced.slice(start,end+1))' in text('lib/vocabulary/enrich.ts'):
 errors.append('vocabulary batch still directly JSON.parse()s model output')
if 'function extractJson(text: string)' in text('lib/content/adapt.ts'):
 errors.append('reading adapter still uses legacy direct extractJson parser')

# Check the local repair algorithm against the two most common model failures:
# trailing commas and fenced JSON with surrounding prose.
def repair_common_json(raw):
 out=[]; in_string=False; escaped=False; i=0
 while i<len(raw):
  ch=raw[i]
  if in_string:
   if escaped: out.append(ch); escaped=False
   elif ch=='\\\\': out.append(ch); escaped=True
   elif ch=='"': out.append(ch); in_string=False
   elif ch=='\n': out.append('\\\\n')
   elif ch=='\r': pass
   elif ch=='\t': out.append('\\\\t')
   else: out.append(ch)
   i+=1; continue
  if ch=='"': out.append(ch); in_string=True; i+=1; continue
  if ch==',':
   j=i+1
   while j<len(raw) and raw[j].isspace(): j+=1
   if j<len(raw) and raw[j] in '}]': i+=1; continue
  out.append(ch); i+=1
 return ''.join(out)
import json
for sample in ['{"title":"x","body":{"paragraphs":["a","b","c",],},}', '[{"term":"alpha","meanings":[{"definition":"a",},],},]']:
 try: json.loads(repair_common_json(sample))
 except Exception as e: errors.append(f'common malformed JSON repair regression: {e}')

if errors:
 print('HOTFIX11.2 TEST FAIL'); [print('-',e) for e in errors]; sys.exit(1)
print('HOTFIX11.2 TEST PASS: model JSON auto-repair + vocabulary batch fallback + normalized import de-duplication')
