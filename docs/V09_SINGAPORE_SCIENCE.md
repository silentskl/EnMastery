# English Mastery V0.9 — Singapore Science

## Scope

Singapore Science is a separate learner domain parallel to Vocabulary and Grammar. It does not write to English `learning_tasks`, `skill_mastery`, `xp_ledger`, English vocabulary progress, or English grammar progress.

Curriculum structure follows the Singapore MOE 2023 Primary Science syllabus used for the 2026 PSLE Science examination. The five themes are Diversity, Cycles, Systems, Interactions and Energy.

## Grade / topic map

### P3
- Diversity of Living and Non-living Things — Diversity
- Diversity of Materials — Diversity
- Life Cycles of Plants and Animals — Cycles
- Magnets — Interactions

### P4
- Plant System: Parts and Functions — Systems
- Human System: Digestive System — Systems
- Matter — Cycles
- Light — Energy
- Heat — Energy

### P5
- Reproduction in Plants and Humans — Cycles
- Water and the Water Cycle — Cycles
- Plant Transport System — Systems
- Human Respiratory and Circulatory Systems — Systems
- Electrical System — Systems

### P6
- Photosynthesis — Energy
- Energy Conversion — Energy
- Forces — Interactions
- Interactions within the Environment — Interactions

## Seed content

- 18 published Science topics
- 4 key learning ideas per topic
- 10 Science vocabulary items per topic = 180 items
- 8 starter questions per topic = 144 questions
- Vocabulary definitions and contextual learning examples
- MCQ and short-answer question types

## Student experience

`/science`
- Filter by grade: All / P3 / P4 / P5 / P6
- Filter by theme: All / Diversity / Cycles / Systems / Interactions / Energy
- Filters can be combined
- Open a topic to study key ideas and vocabulary
- Vocabulary Reference shows terms, definitions and context
- Vocabulary Recall hides the term and requires retrieval from the definition
- Topic Practice records independent Science question attempts
- Topic completion combines Science vocabulary mastery and correct-question coverage

`/science/daily`
- Separate Science daily routine
- Select P3 / P4 / P5 / P6
- Optionally select a theme
- Optionally select one topic
- Set daily vocabulary target and question target independently
- Daily session prioritises lower-mastery vocabulary and questions not yet answered correctly
- Separate Science daily streak
- No English XP or English daily-task completion is affected

## Data model

Migration: `0023_v09_singapore_science.sql`

Independent tables:
- `science_topics`
- `science_vocabulary`
- `science_questions`
- `science_vocabulary_progress`
- `science_question_attempts`
- `science_daily_settings`
- `science_daily_sessions`
- `science_daily_session_items`

## Upgrade

V0.8.0 R4 -> V0.9.0 R1 is an additive migration. Existing English Vocabulary, Grammar, Question Bank, Practice, Exam, Tenant and learner data are not rewritten.
