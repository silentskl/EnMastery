# English Mastery V1.0.2 Hotfix 12.4.4 — Phrase Support + Hard 7-Day Lesson Rotation

## Vocabulary Specialist
- Accepts one English word or one multi-word phrase per vocabulary item.
- Input limit: 12 words / 90 characters; spaces, apostrophes and hyphens are supported.
- Phrases stay intact through de-duplication, AI MCQ generation, specialist word book/history and the final 5-choice + 5-fill mixed cloze.
- Synonym / near-synonym answers and distractors may themselves be natural words or phrases.

## Daily Mission lesson rotation
- Listen, Speak, Read and Write use assignment evidence, not completion evidence, for repeat blocking.
- A lesson/prompt assigned on day D cannot be assigned again on D+1 through D+7. Earliest reuse is D+8.
- TODO, in-progress and completed assignments all count.
- Tenant cooldown values above 7 remain respected; values below 7 can no longer weaken the 7-day hard floor.
- Already-materialised Daily Missions remain immutable.

## Database
No migration. Migration 0060 remains latest.
