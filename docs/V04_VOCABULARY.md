# V0.4 Vocabulary — Personal Words & Phrases

V0.4 adds a personal vocabulary system designed around learning vocabulary in context rather than collecting isolated definitions.

## Student workflow

1. Open a published Reading or Listening lesson.
2. Select any word or short phrase (up to 12 words).
3. Choose **Explain & save**.
4. English Mastery checks the shared vocabulary cache first. If the term has not been enriched before, ModelBridge generates a structured learner entry using the selected context.
5. Review pronunciation, meaning and usage, then choose **Add to my vocabulary**.
6. Open `/vocabulary` to search, filter and review saved items.

Students can also add a word or phrase manually from `/vocabulary` and optionally paste the sentence where they met it.

## Stored learner detail

A vocabulary entry can contain:

- word or phrase classification;
- phrase type (phrasal verb, idiom, collocation, fixed expression, other);
- part of speech;
- British-English IPA when the enrichment model is confident;
- syllables, stress and pronunciation notes;
- precise, simple and context-specific meanings;
- multiple natural example sentences;
- synonyms and antonyms;
- useful collocations;
- word family;
- grammar patterns;
- usage notes;
- common learner mistakes;
- PSLE usefulness;
- P5/P6/P6+ level tag;
- original lesson context(s);
- learner's own note.

Audio pronunciation is currently provided client-side through browser Speech Synthesis, preferring an `en-SG`, then `en-GB`, then another English voice. V0.4's later TTS provider integration can replace or supplement this without changing the vocabulary data model.

## Spaced review

Each saved entry is immediately due for learning. Reviews accept four ratings:

- **Again** — forgotten; review again in about 10 minutes and lower mastery.
- **Hard** — remembered with difficulty; short interval.
- **Good** — normal expanding interval.
- **Easy** — longer expanding interval.

The system persists mastery, review count, correct streak, last review, next review and review-event history. A term is marked `mastered` at high mastery but remains searchable and can still return for long-term review.

## API

- `GET /api/student/vocabulary`
- `POST /api/student/vocabulary`
- `POST /api/student/vocabulary/enrich`
- `PATCH /api/student/vocabulary/:id`
- `DELETE /api/student/vocabulary/:id`
- `POST /api/student/vocabulary/:id/review`

## Database migration

`0007_v04_vocabulary.sql` extends the original V0.1 vocabulary tables and adds:

- rich `details_json`;
- word/phrase classification;
- normalized lookup key and enrichment metadata;
- source lesson/sentence context;
- review state and learner notes;
- `vocabulary_contexts`;
- `vocabulary_review_events`.

The migration is additive and reuses the existing production D1 database.
