# English Mastery v1.0.2 Hotfix 12.3

## Effective daily study time

- Adds a global student-side activity tracker for learning routes.
- Merely opening a learning page does **not** start accumulating study time.
- A full 60-second period without mouse/touch/keyboard/input activity, media playback, or voice/microphone activity is excluded from effective study time.
- Quiet time is held pending: if the learner becomes active again before 60 seconds it is counted; if the 60-second threshold is reached the whole pending quiet period is discarded.
- HTML audio/video, YouTube playback, microphone recording and browser speech recognition are recognised as valid learning activity.
- Reward games are excluded from study time.

## Idle / away count

- Each transition into a 60-second idle period increments the daily idle count exactly once.
- Remaining idle for several minutes does not create repeated idle counts.
- After activity resumes, a later independent 60-second idle period increments the count again.
- Leaving the tab hidden for at least 60 seconds after a real study interaction is treated as one idle episode; hidden time itself is not counted as study time.

## Calendar

- Daily Progress calendar now shows both effective study time and `Idle N×` for each date.
- Calendar API aggregates both metrics across browser study sessions for the learner/date.

## Database

- Adds migration `0059_v102_hotfix123_effective_study_time.sql`.
- Adds `learner_study_sessions` with monotonic client/server counters for effective seconds and idle episodes.
- Heartbeat updates are delta-based and idempotent, with bounded per-request acceptance.
