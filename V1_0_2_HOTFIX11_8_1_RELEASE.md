# English Mastery V1.0.2 Hotfix 11.8.1

Hotfix 11.8.1 is a TypeScript release-blocker fix on top of Hotfix 11.8.

## Vocabulary pronunciation type contract
- `VocabularyDailyTrainer` uses a typed pronunciation response for microphone scoring.
- Hotfix 11.8 referenced `PronunciationResult` without defining/importing it, causing `tsc --noEmit` to fail with TS2304.
- The shared contract now lives in `lib/vocabulary/types.ts` as `VocabularyTrainingProgress` and `PronunciationResult`.
- `components/vocabulary/vocabulary-daily-trainer.tsx` imports the shared type explicitly.
- The response shape matches `/api/student/vocabulary/training/pronunciation`: pass flag, match score, transcript, pronunciation assessment, training progress and thresholds.

## Database
- No schema change.
- 55 migrations total; latest remains `0055_v102_hotfix118_speaking_cooldown.sql`.
- 102 application tables.
