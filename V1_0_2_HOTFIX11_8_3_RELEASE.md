# English Mastery v1.0.2 Hotfix 11.8.3

## Daily lesson availability selection

- Fixes a planner ordering bug where the Tenant lesson limit was applied before the repeat-cooldown/completion filter. If the first N lessons had been completed recently, Reading, Speaking or Writing could incorrectly become `UNAVAILABLE` even though later published lessons were still eligible.
- Reading, Listening, Speaking and Writing now apply stage, publication, Tenant scope and completion-only cooldown eligibility first, then take the configured number of daily candidates.
- Planner cache version is `daily-cache-v12-eligible-before-limit`, forcing incorrect 11.8.2 UNAVAILABLE cards to rematerialise.

## Reading and Listening daily-limit fallback

- The configured Reading maximum words and Listening video-duration limits remain preferred filters.
- If a non-repeating published resource exists but all returned candidates fail only that soft daily-size/duration preference, the planner assigns one concrete resource and marks `dailyLimitRelaxed=true` rather than producing an UNAVAILABLE card.
- The lesson-repeat cooldown remains hard; completed lessons inside the configured cooldown are not reused.

## Speaking and Writing

- Speaking candidate selection considers all published oral prompts before applying the Tenant candidate limit and only excludes a prior prompt when all three scored Speaking modes passed within the cooldown.
- Writing applies the same eligible-before-limit rule and only excludes prompts with a passed submission/done-task completion inside the cooldown.
- This prevents scheduled Writing from becoming UNAVAILABLE simply because the first configured slice contains recently completed prompts.

## Database

- No new schema migration is required.
- Migration count remains 55; application table count remains 102.
