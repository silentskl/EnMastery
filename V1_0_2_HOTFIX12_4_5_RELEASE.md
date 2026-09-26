# English Mastery V1.0.2 Hotfix 12.4.5 — Daily Speaking 3-Part Rotation Fix

## Root cause
Hotfix 12.4.4 correctly applied the hard 7-day assignment cooldown to the outer Daily Mission Speaking lesson, but `/api/student/speaking/prompts` still returned the full Speaking prompt cache/catalogue. The client then selected the first prompt in each mode, so AI Conversation, Reading Aloud and Stimulus Conversation could remain unchanged for several days. The fixed cache fallback (`AI Talking · Everyday Decisions`, `A Helpful Choice`, `Working Together`) made the symptom especially visible.

## Fix
- Daily Speaking now materialises **three independent daily assignments**: one `conversation`, one `reading_aloud`, and one `stimulus` prompt.
- Each mode has its own hard repeat window. A prompt assigned on day D cannot appear again on D+1 through D+7; earliest reuse is D+8.
- The configured Tenant lesson-repeat cooldown still applies when it is greater than 7 days. Values below 7 cannot weaken the hard floor.
- Assignment history counts even when the learner has not passed the prompt. Existing scored/attempted Speaking history is also considered.
- Once the three prompts are materialised for a date, refreshes and application deployments return the same persisted bundle for that date.
- The Daily Speaking API no longer serves the old first-item prompt-cache catalogue and now uses `Cache-Control: private, no-store` to prevent yesterday's bundle surviving a date rollover.
- If the pool is genuinely exhausted under the hard cooldown, the product does **not** silently repeat content; the learner receives a clear unavailable-content message.

## Content capacity
The released P5 pool had only 5 conversation / 7 reading-aloud / 7 stimulus prompts, and P6 had only 7 conversation prompts. A strict 7-day no-repeat sequence needs at least 8 prompts per mode. Migration 0061 adds original syllabus-aligned prompts so default P5 and P6 installations have at least 8 prompts in each Speaking mode.

## Database
Migration `0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql` adds:
- `speaking_daily_prompt_assignments`
- index `idx_speaking_daily_prompt_rotation`
- backfill from existing `speaking_daily_mode_progress`
- additional P5/P6 Speaking prompts required to sustain the hard rotation

## Compatibility
- Keeps Hotfix 12.4.4 Vocabulary Specialist phrase support unchanged.
- Keeps the outer Daily Mission hard 7-day lesson rule unchanged.
- Keeps already-generated Daily Mission cards immutable.
- Existing `speaking_prompt_cache` remains in the schema for backwards compatibility, but Daily Learn no longer relies on its first-item selection behavior.
