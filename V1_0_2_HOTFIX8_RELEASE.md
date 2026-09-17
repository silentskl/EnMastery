# English Mastery V1.0.2 Hotfix 8

Hotfix 8 builds on V1.0.2 Hotfix 7 and fixes the student custom-word-book workflow plus Daily Tasks day rollover.

## Delivered

### 1. Student custom word books
- **Create new** creates and persists a completely empty custom word book.
- **Create & import** creates the word book and immediately imports terms from the editor or a loaded TXT/CSV file.
- **Add to existing** appends editor/TXT/CSV terms to any custom word book owned by the signed-in student.
- TXT accepts one word or phrase per line and the existing `word,synonyms` form.
- CSV parsing supports quoted cells and multiple synonym columns; `;`, `|` and `/` remain supported inside synonym cells.
- Duplicate terms are merged by normalised term; supplied synonym annotations continue through the existing enrichment/import path.

### 2. Lesson vocabulary → custom word book
- The existing select-text vocabulary flow now includes a **Save to** selector.
- A learner can keep the item only in **My vocabulary** or additionally place it in one of their custom word books.
- Server-side validation confirms that the destination is a custom collection owned by that learner; system collections cannot be modified.
- This applies anywhere the common lesson vocabulary controls are used, including Reading, Listening, Speaking, Writing and selectable question/feedback text.

### 3. Daily Tasks new-day reset
- Reading, Listening and Writing reconciliation now requires PASS evidence from the same **Asia/Singapore** calendar day as the Daily Task.
- A historical completed lesson no longer turns a newly assigned task into PASS.
- If a future pre-generated task references a lesson the student finishes early, that stale task is removed before planner cache validation and a new eligible lesson is selected.
- Current-day false adaptive PASS rows created by the previous lifetime-progress logic are repaired automatically. The associated task-completion XP entry and any still-unused English daily reward are also removed before the replacement task is generated.
- The student Today component refreshes just after Singapore midnight and again when the tab/window becomes visible or focused, so an overnight-open browser cannot keep yesterday's state.

## Database
- No new migration.
- Migration count remains **49**; latest is `0049_v102_hotfix7_vocab_books.sql`.

## Validation
- Release validation: PASS — 49 migrations / 99 tables.
- Strict D1 migration compatibility: PASS.
- Hotfix 5, 5.2, 6, 6.1, 7 and 8 regressions: PASS.
- AI guest guard and historical R10/R12/R13/R14/R15/R16/R24 regressions: PASS.
- UI style audit: PASS.
- TypeScript parser/transpile across app/components/lib/workers: 404 files, 0 syntax diagnostics.
- Shell syntax checks for deploy/install scripts: PASS.

The sandbox does not contain this project's npm dependency tree. `npm run typecheck` therefore stops before source checking because `@cloudflare/workers-types` and `@types/node` are absent. Run `npm run verify:release` in the normal deployment environment to execute the dependency-backed TypeScript, Next and OpenNext gates.
