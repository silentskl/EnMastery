# English Mastery V1.0.2 Hotfix 12.4.1 — Vocabulary Specialist Mixed Cloze

## Changes from Hotfix 12.4

### 1. Learner-entered word is no longer always the MCQ answer
Each generated four-option question now randomly uses one of two modes:
- **Target-correct mode**: the learner-entered word is the correct answer.
- **Target-distractor mode**: the learner-entered word is included as a plausible incorrect option, while a different word is the correct answer.

The four option positions are also shuffled. The generation contract validates that target-distractor questions do not accidentally make the target word correct.

### 2. Final 400–500 word passage is now a 5 + 5 mixed cloze
The final stage always uses exactly **10 words** selected from the learner's completed daily set:
- **Blanks 1–5: synonym / near-synonym multiple choice.** For each selected target word, the passage blank is answered by a different one-word synonym or near-synonym. Four options are shown and the target word itself is not offered as an option.
- **Blanks 6–10: direct fill-in.** The other five selected target words are shown in a fill-in word bank and must be typed into the correct blanks.

The completed passage remains strictly **400–500 words**. All ten answers must be correct to PASS. Failed attempts remain in learning history and only incorrect positions are highlighted for revision.

## Daily target compatibility
Vocabulary Specialist daily targets remain Tenant-configurable, now with a minimum of **10** and maximum of **30** words. If a target is greater than 10, the learner completes all configured MCQs first and the final mixed cloze randomly selects 10 words from that completed set. An unfinished same-day legacy session below 10 words is upgraded to a target of 10 so the learner is not stranded.

## History and compatibility
- No database migration is required; migration 0060 remains the latest schema change.
- Existing Hotfix 12.4 legacy all-fill cloze records remain readable.
- Student history does not expose synonym-choice answers before the mixed cloze is passed.
- Tenant Admin history shows the mixed-cloze type, target word, options and correct answer for review.
