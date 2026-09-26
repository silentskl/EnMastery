# English Mastery V1.0.2 Hotfix 12.4 — Vocabulary Specialist

## Scope
Hotfix 12.4 adds a learner-entered Vocabulary Specialist practice flow without changing the existing Daily Mission or Vocabulary SRS flow.

## Student workflow
1. Tenant Admin sets the daily word target independently for P1–P4, P5, P6 and S1–S4 (1–30 words, default 10).
2. The learner enters one English word at a time.
3. ModelBridge creates one original PSLE-style four-option vocabulary question for that word.
4. The learner answers the question. MCQ accuracy is recorded but an incorrect MCQ does not block the next word.
5. The process repeats until the day's configured word target is answered.
6. ModelBridge automatically builds one coherent 400–500 word final cloze using every daily target word exactly once as a numbered blank.
7. The final cloze passes only when every blank is correct. Incorrect submissions are retained as attempts and only the wrong blank positions are highlighted for revision.

## Independent specialist word book
Every learner-entered word is de-duplicated into `vocabulary_specialist_wordbook`, separate from the existing Tenant/System vocabulary collections and SRS flow. It stores the word, part of speech, English definition, Chinese meaning, first-seen date, last-practised date and practice count.

## Records
Learners can review their specialist word book and daily history. Tenant Admin can review each learner's daily session, all generated MCQs, selected/correct answers, explanations, the final cloze and every cloze submission.

## Data model
Migration `0060_v102_hotfix124_vocabulary_specialist.sql` adds:
- `tenant_vocabulary_specialist_policy`
- `vocabulary_specialist_sessions`
- `vocabulary_specialist_wordbook`
- `vocabulary_specialist_question_attempts`
- `vocabulary_specialist_cloze_attempts`

The daily target is snapshotted into each daily session so later Admin setting changes do not alter an in-progress or historical session.

## AI / safety / generation contracts
- Uses the Tenant's existing ModelBridge chat integration and monthly AI quota.
- The supplied word is treated as data, not instructions.
- MCQs must have exactly four unique single-word options with exactly one target answer.
- Cloze generation validates every numbered placeholder and rejects passages outside 400–500 words after filling.
- A structurally invalid cloze is retried once; AI usage success/failure is recorded.

## Navigation
- Student: Practice → Vocabulary Specialist → Word Book / Learning History.
- Tenant Admin: Vocabulary Specialist → daily target + learning records.
- Admin interface supports English / 中文 through the existing UI-language system.

## Compatibility
- Base: V1.0.2 Hotfix 12.3.1.
- Deployment remains Cloudflare Workers + D1 with the existing deployment scripts and bindings.
- Existing Learn/Today Mission, Vocabulary SRS, Word Books, Grammar, Question Bank and reward-game flows are retained.
