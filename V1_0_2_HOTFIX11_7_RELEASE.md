# English Mastery v1.0.2 Hotfix 11.7

## Speaking recognition de-duplication

Chrome/Edge Web Speech recognition exposes a cumulative `results` list. The previous Speaking Workspace loop traversed the complete list on every callback and appended every final result again, so one spoken sentence could appear many times in **What we heard**.

Hotfix 11.7 tracks committed recognition result slots for the current recording. A final slot is appended exactly once; interim text remains replaceable. Starting a new recording clears the slot set, so a learner can intentionally repeat the same sentence in another recording without suppression. The same correction is applied to Question Bank oral recording and intensive-listening shadowing. The asynchronous microphone start path is also guarded so a rapid double-click cannot create two recognition sessions.

No database migration is added. Migration 0054 remains latest.
