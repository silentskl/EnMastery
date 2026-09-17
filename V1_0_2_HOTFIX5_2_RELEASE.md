# English Mastery v1.0.2 Hotfix 5.2

- Learning Settings and Practice Settings use compact, full-width tables per learner-stage tab.
- Vocabulary Review window / Required reviews moved from Learning Settings to the Vocabulary row in Practice Settings.
- Migration 0045 copies existing review-frequency values from the legacy daily-task columns into Vocabulary Practice policy so upgrades preserve configuration.
- Daily Vocabulary learning retains only its words-per-day target; forced spaced-review frequency applies to Vocabulary Practice.
- Compact Today's learning mission now calls a today-only plan endpoint. If today's persisted tasks already exist, refresh returns them immediately instead of rebuilding the weekly plan first.
