# English Mastery v1.0.2 Hotfix 11.8.2

## Daily mission completion preservation

- Preserve same-day completed Listening, Reading and Speaking cards across planner upgrades.
- Recover same-day completed Reading/Listening from `learner_content_progress` if Hotfix 11.8 migration already removed a legacy placeholder card.
- Recover Speaking only when Conversation, Reading Aloud and Stimulus all have passing scores for the Singapore day.
- Restored cards regain the normal task XP idempotently. Vocabulary is unchanged.

## Completion-only cooldown

- The configurable lesson repeat cooldown now means **completed/learned lessons only**.
- Merely assigning, opening or starting a lesson no longer blocks it for the cooldown window.
- Reading/Listening use 100% completed content progress plus done-task evidence.
- Speaking requires a fully passed three-mode day.
- Writing requires a passed submission/done task.
- Planner cache version is `daily-cache-v11-completion-evidence-cooldown`, forcing broken UNAVAILABLE cards from 11.8.1 to rematerialise.

## Migration safety

- `0055_v102_hotfix118_speaking_cooldown.sql` no longer destructively rewrites the deployment day's completed tasks on fresh installs.
- Existing deployments that already ran the older 0055 are repaired at runtime from retained completion evidence.
- No new database schema migration is required; migration count remains 55.
