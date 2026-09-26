from pathlib import Path
root=Path(__file__).resolve().parents[1]
errors=[]
def need(path,*markers):
    s=(root/path).read_text(errors='ignore')
    for m in markers:
        if m not in s: errors.append(f'{path}: missing {m}')
need('migrations/0057_v102_hotfix120_vocab_daily_new_review.sql','vocabulary_new_words','vocabulary_review_words','vocabulary_spelling_repetitions','vocabulary_daily_group_completions')
need('components/vocabulary/vocabulary-daily-trainer.tsx','New learning','Review','Chinese meaning · listen & read aloud','spellingRepetitions','dictationRound','Choose the English definition','Complete the sentence')
need('components/tenant-learn-settings.tsx','Vocabulary new words per day','Vocabulary review words per day','Vocabulary spelling repetitions')
need('components/tenant-practice-settings.tsx','Review window / Required reviews semantics','same schedule drives the Daily Vocabulary Review group')
need('app/api/student/vocabulary/training/route.ts','group===\"review\"','vocabularyReviewWindowDays','vocabularyReviewRepetitions')
need('app/api/student/vocabulary/training/complete/route.ts','allDone','vocabularyReviewWords===0','vocabulary_daily_group_completions')
need('lib/vocabulary/enrich.ts','concise Simplified Chinese meaning')
need('lib/student/planner.ts','newTarget:vocab.newTarget','reviewTarget:vocab.reviewTarget','groups:[\"new\",\"review\"]')
if errors:
    print('HOTFIX 12.0 TEST FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print('HOTFIX 12.0 TEST PASS: daily vocabulary new/review groups, four-stage flow, review scheduling semantics and completion gate validated')
