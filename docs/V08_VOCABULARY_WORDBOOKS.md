# English Mastery V0.8 — Word Books & Daily Vocabulary Retrieval

## 1. Scope

V0.8 turns the V0.7 vocabulary catalogue into a reusable word-book system and adds daily retrieval practice to Learn.

System word books now include:

| Code | Display name | CEFR | Starter items |
|---|---|---:|---:|
| P1-P4 | P1–P4 Singapore Core | — | inherited from V0.7 |
| P5 | P5 Singapore Core | — | inherited from V0.7 |
| P6 | P6 Singapore Core | — | inherited from V0.7 |
| S1 | S1 Singapore Core | — | inherited from V0.7 |
| S2 | S2 Singapore Core | — | inherited from V0.7 |
| S3 | S3 Singapore Core | — | inherited from V0.7 |
| S4 | S4 Singapore Core | — | inherited from V0.7 |
| KET | A2 Key / KET | A2 | 50 |
| PET | B1 Preliminary / PET | B1 | 50 |
| FCE | B2 First / FCE | B2 | 50 |
| CAE | C1 Advanced / CAE | C1 | 50 |
| CPE | C2 Proficiency / CPE | C2 | 50 |

The KET/PET/FCE/CAE/CPE labels are kept because learners and parents commonly recognise the legacy names. The current Cambridge English names are shown beside them. The bundled content is original English Mastery learning material aligned to those broad CEFR/exam levels; it is not an official Cambridge vocabulary list.

## 2. Vocabulary data format

The implementation reuses the existing `vocabulary_items` dictionary record. New collection tables only group dictionary entries; definitions are not duplicated per learner.

Each enriched entry can include:

- term / normalised term
- word or phrase type
- part of speech
- British-English IPA when available
- learner-friendly meaning(s)
- example sentence(s)
- synonyms / antonyms
- collocations
- word family
- grammar patterns / usage notes
- common mistakes
- level/topic tags

The exam seed always includes at least one meaning and one original example sentence.

## 3. Custom word books

A learner can create any number of personal word books from the Vocabulary > Word books tab.

Supported input:

- direct pasted terms, one per line
- comma/semicolon/tab separated terms
- `.txt`
- `.csv` (first column is treated as the term column; common `word/term/vocabulary` headers are skipped)

Import flow:

1. normalise and deduplicate terms in the browser;
2. submit at most 20 terms per enrichment request;
3. reuse an existing dictionary entry when it already exists;
4. send only missing terms to the existing tenant ModelBridge vocabulary enrichment service;
5. validate generated structured JSON;
6. persist the shared dictionary entry and add it to the learner's collection.

The shared catalogue remains immutable from learner-side saves. Personal snapshots/notes and training progress remain learner-specific.

## 4. Daily training loop

The learner chooses a word book and a daily target of 5, 10, 15, 20 or 30 words.

Each selected word cycles through retrieval modes:

1. **Pronounce** — hear the word and read it aloud, slowly and then naturally.
2. **Meaning** — select the meaning from distractors.
3. **Dictation** — hear the word with the spelling hidden and type it.
4. **Definition spelling** — see the definition and spell the target word/phrase.
5. **Cloze** — retrieve the target from its example context.

Incorrect responses are recorded and repeated immediately. After a second incorrect attempt the learner can review the answer and continue, preventing a single difficult item from blocking the whole session.

This interaction is an English Mastery implementation inspired by retrieval-practice/spelling-recall learning patterns used by vocabulary apps; it does not copy another product's UI, proprietary content or internal algorithm.

## 5. Mastery model

`vocabulary_training_progress` stores five dimensions:

- pronunciation: 10%
- recognition/meaning: 20%
- listening: 20%
- spelling: 30%
- usage/context: 20%

A correct retrieval raises the relevant dimension by 22 points; an incorrect retrieval lowers it by 10 points, bounded to 0–100. The weighted result becomes `mastery`.

A word counts as **mastered** when `mastery >= 80`. Word-book completion is:

`mastered items / total items × 100%`

This means merely opening or seeing a word does not increase completion to 100%.

## 6. Learn planner integration

The adaptive planner keeps the four core tasks — Listen, Speak, Read and Write — and adds one Vocabulary task for each study day.

The task records:

- active collection ID
- collection display name
- daily word target
- link to `/learn/vocabulary`
- Vocabulary activity type
- 12 XP completion award

If the learner changes the active word book, the next planner refresh replaces future `todo/skipped` vocabulary tasks with the newly selected book. Completed or in-progress tasks are not rewritten.

## 7. Database migration

Migration: `migrations/0022_v08_exam_wordbooks_training.sql`

New tables:

- `vocabulary_collections`
- `vocabulary_collection_items`
- `learner_vocabulary_training_settings`
- `vocabulary_training_progress`
- `vocabulary_training_events`

The migration is additive and safe for an existing V0.7 database.


## R3: mandatory pronunciation recording and match

The first Daily Vocabulary retrieval step is now evidence-based. The learner must capture microphone audio, and the server resolves the real target term from the selected collection before scoring. A speech-text match of at least 85% is required. When Azure Pronunciation Assessment is configured, accuracy >= 65, completeness >= 80, and pronunciation >= 65 are also required. A failed pronunciation attempt cannot be skipped; it repeats until matched. Browser speech recognition is preferred for a low-latency transcript, ModelBridge STT is a fallback, and audio is not persisted by this vocabulary training flow.
