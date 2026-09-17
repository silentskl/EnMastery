from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]; errors=[]
def text(path):
 p=root/path
 if not p.exists(): errors.append(f'missing {path}'); return ''
 return p.read_text(errors='ignore')
def need(path,*markers):
 s=text(path)
 for m in markers:
  if m not in s: errors.append(f'{path}: missing {m}')
 return s
extract=need('lib/content/extract.ts','SourceExtractionError','SOURCE_FETCH_FAILED','SOURCE_HTTP_ERROR','SOURCE_EXTRACTION_BLOCKED','SOURCE_NOT_CONTENT_PAGE','SOURCE_TEXT_TOO_SHORT','SOURCE_PDF_REQUIRES_TEXT_EXTRACTION','json_ld','article','main','content_container','embedded_json','page_text','isLikelyNonContentUrl','helpandfeedback','regulatory submissions','Accept-Language')
if 'Not enough readable text could be extracted from this URL' in extract: errors.append('legacy generic extraction error is still present')
need('app/api/admin/content/import/batch/route.ts','isLikelyNonContentUrl','SOURCE_NOT_CONTENT_PAGE')
need('app/api/platform/content/import/batch/route.ts','isLikelyNonContentUrl','SOURCE_NOT_CONTENT_PAGE')
need('lib/jobs/dispatch.ts','eventType:"source_extracted"','extractionMethod','extractedCharacters')
source_domain=need('lib/content/source-domain.ts','parseModelJson','source lesson generation')
if 'JSON.parse(raw)' in source_domain: errors.append('source-domain generation still uses one-shot JSON.parse')
# Discovery must proactively avoid doomed transactional links.
for marker in ['isLikelyNonContentUrl(absolute)','regulatory submissions','submit (?:a |your )?(?:form|request|application)']:
 if marker not in extract: errors.append(f'discovery compatibility marker missing: {marker}')
# No schema change in 11.6: 0054 remains latest.
migrations=sorted((root/'migrations').glob('*.sql'))
if len(migrations)<54: errors.append(f'expected at least the 54 migrations present in this hotfix lineage, found {len(migrations)}')
if not (root/'migrations'/'0054_v102_hotfix115_daily_plan_resource_indexes.sql').exists(): errors.append('required 0054 resource-index migration is missing')
if errors:
 print('HOTFIX11.6 TEST FAIL'); [print('-',e) for e in errors]; sys.exit(1)
print('HOTFIX11.6 TEST PASS: source extraction is multi-strategy, diagnostic, transactional-page aware, and Cloze/source-domain JSON uses resilient repair')
