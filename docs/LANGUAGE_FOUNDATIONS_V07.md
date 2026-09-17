# English Mastery V0.7 — Language Foundations

## Purpose

V0.7 adds two student learning pathways on top of the V0.6 R5 tenant / Question Bank architecture:

1. **Vocabulary** — a Singapore curriculum-aligned word and phrase library with dictionary-style search, personal saving, spaced review, multiple-choice reinforcement and short reading reinforcement.
2. **Grammar** — staged grammar explanations with examples, common mistakes, learning goals and mixed-mode exercises.

The module supports these independent learning stages:

- P1–P4 · Foundation
- P5 · Upper Primary
- P6 · PSLE
- S1 · Lower Secondary
- S2 · Lower Secondary
- S3 · Upper Secondary
- S4 · Upper Secondary

The stage selected in Vocabulary or Grammar is stored separately from the legacy `child_profiles.school_level` value. This is intentional: the existing PSLE course, Practice and Exam implementation remains P5/P6-compatible, while Language Foundations can extend through P1–S4 without a risky global schema rewrite.

## Curriculum alignment

The content is labelled **Singapore curriculum-aligned**, not an official MOE prescribed vocabulary list. The pathway is designed around the progression described in the Ministry of Education English Language syllabuses, where grammar and vocabulary are language resources developed together with listening, speaking, reading, viewing, writing and representing.

Reference documents:

- MOE, *English Language Syllabus 2020 — Primary*: https://www.moe.gov.sg/-/media/files/primary/english-language-syllabus-2020-primary.pdf
- MOE, *English Language Syllabus 2020 — Secondary*: https://www.moe.gov.sg/-/media/files/secondary/syllabuses/eng/2020-english-language-syllabus-secondary.pdf

The seed definitions, examples, passages, explanations and exercises in this release are English Mastery-authored learning content.

## Vocabulary pathway

### Dictionary

`/vocabulary` now opens a Language Foundations hub with four tabs:

- **Dictionary**
- **Quick choices**
- **Reading boost**
- **My vocabulary**

The curated catalogue can be filtered by stage and by word / phrase. A non-empty search queries the complete P1–S4 catalogue so a learner is not prevented from looking up a word from another level.

If a term is not in the curated catalogue, **Explain “term”** uses the existing vocabulary enrichment endpoint to generate a dictionary card. The learner can then save it to My Vocabulary.

### Initial curated content

The migration creates:

- 135 distinct catalogue vocabulary records
- 140 stage memberships (20 per stage)
- words plus fixed expressions / collocations / useful phrases
- original simple definitions and example sentences
- 14 short reinforcement passages (2 per stage)

Some terms intentionally appear in more than one stage. The legacy `vocabulary_items` table has a unique `(lemma, part_of_speech)` key, so cross-stage reuse is represented in `vocabulary_catalog_stages` rather than by duplicating the same dictionary record.

### Reinforcement

**Quick choices** generates a 10-question meaning retrieval set from the selected stage. Results update `vocabulary_catalog_progress` and append immutable events to `vocabulary_practice_events`.

**Reading boost** provides short passages containing target stage vocabulary. Questions test contextual vocabulary and passage understanding.

**My vocabulary** retains the existing personal vocabulary and spaced-review flow. Manual Explain now inherits the stage selected in the Vocabulary hub.

Catalogue records are protected from learner-side mutation: saving a curated term creates/updates the learner snapshot and progress only; it does not overwrite the shared catalogue definition.

## Grammar pathway

`/grammar` contains 8 sections for each stage, for a total of **56 grammar topics**. Each topic provides:

- a core rule
- why the rule matters
- learning objectives
- correct / contrasting examples
- common mistakes
- two exercises
- learner mastery and attempt tracking

The seed contains **112 exercises** and covers all four activity modalities across the pathway:

- reading
- writing
- listening (using the existing pronunciation/audio playback capability)
- speaking-oriented response practice

Speaking-oriented grammar items ask the learner to produce the sentence orally first and then enter it for grammar checking. This release does not claim automated pronunciation scoring for these grammar exercises.

### Stage outline

| Stage | Main grammar focus |
| --- | --- |
| P1–P4 | nouns/pronouns, articles, adjectives, simple tenses, agreement, prepositions, connectors, questions/commands/punctuation |
| P5 | tense consistency, complex agreement, modals, relative clauses, reported speech, active/passive, synthesis, grammar cloze |
| P6 | perfect/progressive forms, conditionals, reported questions, passive focus, complex clauses, editing, cohesion, PSLE synthesis |
| S1 | noun phrase expansion, aspect, prepositional phrases, modifiers, clause variety, viewpoint/reporting, voice, cohesion |
| S2 | relative/non-finite clauses, conditionals, fronted adverbials, modality, editing, nominalisation, text-type grammar, conjunctive adverbs |
| S3 | advanced aspect, passive choices, mixed conditionals, fronting/inversion, nominalisation, logical relations, argument grammar, parallelism |
| S4 | precision/concision, sophisticated clause control, information structure, hedging, extended cohesion, ambiguity, discourse grammar, synthesis/editing |

## Data model

Migration: `migrations/0021_v07_language_foundations.sql`

New tables:

- `vocabulary_catalog_stages`
- `learner_language_preferences`
- `vocabulary_catalog_progress`
- `vocabulary_practice_events`
- `vocabulary_reinforcement_passages`
- `grammar_topics`
- `grammar_exercises`
- `grammar_topic_progress`
- `grammar_attempts`

The migration also adds catalogue metadata fields to the existing `vocabulary_items` table.

## Student APIs

### Stage preference

- `GET /api/student/language-stage`
- `PUT /api/student/language-stage`

PUT body:

```json
{"module":"vocabulary","stage":"S2"}
```

or:

```json
{"module":"grammar","stage":"P5"}
```

### Vocabulary catalogue / reinforcement

- `GET /api/student/vocabulary/catalog?stage=P6&q=...&type=all`
- `GET /api/student/vocabulary/reinforcement?mode=choice&stage=P6&count=10`
- `GET /api/student/vocabulary/reinforcement?mode=reading&stage=P6`
- `POST /api/student/vocabulary/reinforcement`

The existing `/api/student/vocabulary`, `/enrich` and review endpoints remain in use for personal vocabulary.

### Grammar

- `GET /api/student/grammar/topics?stage=S1`
- `GET /api/student/grammar/topics/:id`
- `POST /api/student/grammar/topics/:id/answer`

## Compatibility

V0.7 intentionally does **not** change these V0.6 R5 guarantees:

- Platform Admin → one Tenant Admin → Students account model
- tenant-default history / ownership recovery
- tenant-owned ModelBridge resolution
- strict serial Task Runner
- existing P5/P6 course and learner profile schema
- Practice and Exam continue to consume Question Bank resources under their existing rules
- existing IDs and historical learner content are preserved

## Upgrade

Apply migrations through `0021_v07_language_foundations.sql` using the normal release update command. The new migration is additive; it does not rebuild or delete the historical course / question / learner tables.
