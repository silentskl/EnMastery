from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    text=(ROOT/path).read_text()
    for marker in markers:
        if marker not in text: errors.append(f"{path}: missing {marker}")
    return text

types=need('lib/vocabulary/types.ts','export type VocabularyTrainingProgress','export type PronunciationResult','assessment: PronunciationAssessment','progress: VocabularyTrainingProgress | null')
trainer=need('components/vocabulary/vocabulary-daily-trainer.tsx','PronunciationResult, VocabularyDetail','useState<PronunciationResult|null>','as PronunciationResult&{error?:string}')
if re.search(r'(?<![A-Za-z0-9_])PronunciationResult(?![A-Za-z0-9_])',trainer) and 'import type { PronunciationResult, VocabularyDetail } from "@/lib/vocabulary/types";' not in trainer:
    errors.append('VocabularyDailyTrainer uses PronunciationResult without the shared type import')
route=need('app/api/student/vocabulary/training/pronunciation/route.ts','passed,matchScore:score,transcript,assessment,progress,threshold')
if errors:
    print('FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print('PASS Hotfix 11.8.1 vocabulary pronunciation TypeScript contract regression')
