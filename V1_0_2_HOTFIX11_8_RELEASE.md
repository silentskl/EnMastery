# English Mastery V1.0.2 Hotfix 11.8

Hotfix 11.8 tightens Daily Learning resource selection, prevents short-term lesson repetition, makes Speaking mastery evidence authoritative, and removes duplicate Web Speech global declarations.

## Daily Reading / Listening / Speaking resources
- Daily Reading and Listening now bind to a concrete published lesson when an eligible lesson exists; the planner no longer creates `choose a reading lesson` or `choose a listening lesson` placeholder tasks.
- Daily Speaking binds to a concrete oral prompt.
- If Tenant visibility, stage filters and cooldown rules leave no eligible resource, the task is stored as an explicit non-clickable `unavailable` item instead of a fake selectable lesson.
- Legacy current/future placeholder tasks are removed by migration 0055 so old `choose ... lesson` cards cannot survive the upgrade.
- Reading lesson navigation uses a lightweight client shell, a daily-assignment fast path and browser in-flight request de-duplication to reduce Cloudflare Worker load and 1102 risk.

## Configurable lesson repeat cooldown
- Tenant Admin can configure `Lesson repeat cooldown` in Daily Learning settings.
- Default: 7 days. Range: 0-90 days. `0` disables the cooldown.
- Reading, Listening, Speaking and Writing rotations avoid resources used inside the configured cooldown window.
- Lessons are not permanently excluded: after the cooldown expires they become eligible again.
- Changing the cooldown invalidates unstarted current/future adaptive lesson rotations so the new rule takes effect immediately.

## Speaking PASS gate
- Daily Speaking requires all three parts: Conversation, Reading Aloud and Stimulus.
- Each part must have a real score at or above the Tenant pass threshold.
- Merely opening/clicking the three tabs cannot complete the Daily Speaking task.
- PASS is derived from the Tenant's current pass score; stored submission pass flags are audit snapshots only.
- Migration 0055 resets legacy current/future Speaking tasks that were incorrectly marked complete without the new three-part evidence.

## Web Speech TypeScript compatibility
- Web Speech API types are centralized in `lib/browser/speech-recognition.ts`.
- Speaking Workspace, Intensive Listening and Vocabulary pronunciation reuse the same local constructor type.
- Components no longer declare competing global `Window.SpeechRecognition` / `webkitSpeechRecognition` properties, fixing TS2717 duplicate-property declaration errors.

## Database
- Adds `0055_v102_hotfix118_speaking_cooldown.sql`.
- 55 migrations total.
- 102 application tables after all migrations.
