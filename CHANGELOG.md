# V1.0.2 Hotfix 11.9.1

- Add a shared Back button across all Learn and Practice routes with browser-history navigation and safe section fallbacks.
- Reorder Learn to show Today's Learning Mission, Learning Momentum and Daily Progress in that exact top-to-bottom order.
- No database migration; 0056 remains latest.

# V1.0.2 Hotfix 11.8.3

- Fix Daily Reading/Speaking/Writing false UNAVAILABLE by filtering cooldown eligibility before Tenant lesson-limit slicing.
- Keep the 7-day configurable repeat rule completion-only and hard.
- Add bounded Reading/Listening daily-filter fallback to concrete resources instead of false UNAVAILABLE.
- Planner cache v12 rematerialises broken 11.8.2 cards.

## v1.0.2 Hotfix 11.8.2

- Preserve and recover legitimate same-day Listening/Reading/Speaking completion across Daily Planner upgrades.
- Fix lesson cooldown to exclude only genuinely completed/PASS lessons, not merely assigned or opened resources.
- Bump Daily Planner cache to v11 so 11.8.1 UNAVAILABLE cards are rematerialised.
- Make 0055 fresh-install data repair non-destructive for the deployment day.

## v1.0.2 Hotfix 11.8.1

- Restore the shared `PronunciationResult` response type used by Vocabulary Daily Trainer pronunciation scoring.
- Define the vocabulary pronunciation progress/result contract in `lib/vocabulary/types.ts` and import it explicitly in the trainer, fixing `TS2304: Cannot find name PronunciationResult`.
- Add Hotfix 11.8.1 release regression guards so the shared type/export/import cannot silently disappear again.
- No database migration; 0055 remains latest.

## v1.0.2 Hotfix 11.8

- Bind Daily Reading, Listening and Speaking tasks to concrete resources; replace missing-resource cases with explicit non-clickable unavailable tasks instead of choose-a-lesson placeholders.
- Add Tenant-configurable lesson repeat cooldown (default 7 days, range 0-90) across Reading, Listening, Speaking and Writing; resources become eligible again after the window.
- Require real passing scores for all three Daily Speaking parts (Conversation, Reading Aloud, Stimulus) before the Speaking task can PASS.
- Make Reading lesson navigation lightweight and daily-assignment aware to reduce Cloudflare Worker 1102 risk.
- Centralize Web Speech types without global Window augmentation, fixing TS2717 duplicate SpeechRecognition declarations.
- Add migration 0055 for cooldown policy, per-mode Speaking evidence, supporting indexes and legacy placeholder/false PASS cleanup.

## v1.0.2 Hotfix 11.7

- Fix browser SpeechRecognition cumulative-result handling in Speaking Workspace so final phrases are committed once instead of appended again on every `onresult` callback.
- Apply the same result-slot de-duplication to Question Bank oral answers and intensive-listening shadowing.
- Reset committed result slots for each new recording, preserving legitimate repeated speech across separate recordings; guard the asynchronous microphone start path against accidental double-starts.
- No database migration; 0054 remains latest.

## v1.0.2 Hotfix 11.6

- Replace one-pass Source HTML stripping with multi-strategy extraction across JSON-LD, article/main containers, embedded app JSON and cleaned page text.
- Reject high-confidence service/form/login/submission URLs before queueing and filter them from Source discovery.
- Add structured Source extraction error codes/details for HTTP, fetch, anti-bot, PDF, unsupported type, non-content and too-short cases.
- Log successful extraction method/character count in Work Queue diagnostics.
- Use resilient ModelBridge JSON repair for Speaking/Writing/Cloze source-domain generation.
- No database migration; 0054 remains latest.

## v1.0.2 Hotfix 11.5

- Fix Cloudflare Error 1102 risk on Today Mission by separating a one-day resource-bounded planner from the seven-day week planner.
- Cap heavy candidate results at 24 rows/domain, reuse candidate pools, batch task writes and add D1 planner/task/streak indexes.
- Remove request-time completion reconciliation from Plan/Calendar GETs; activity completion endpoints remain authoritative.
- Remove duplicate Today Plan fetch from Learning Momentum and deduplicate same-month Calendar fetches.
- Always create safe Reading/Listening fallback cards when no eligible assigned lesson is available, preventing partial missions.
- Surface Cloudflare 1102 explicitly when an API response is terminated as non-JSON.
- Adds migration 0054.

## v1.0.2 Hotfix 11.4

- Tenant Admin controls which System vocabulary books are visible in student accounts.
- Defaults: P1-P4, P5 and P6 visible; all other System books hidden until enabled.
- Tenant custom books remain visible; Daily Learning / Practice assignments remain authoritative even if a System book is hidden from normal browsing.
- Adds migration 0053 for per-Tenant System word-book visibility overrides.

# v1.0.2 Hotfix 11.2
- Added resilient ModelBridge JSON parsing/repair for vocabulary enrichment and reading adaptation.
- Vocabulary batch JSON failures fall back to per-term enrichment instead of aborting the whole import chunk.
- Tenant word-book imports are normalized/idempotent and report duplicate skips, so partial imports can be safely rerun.

# Hotfix 11.1

- Fixed `workers/task-runner/index.ts` queue wake message typing.
- `TASK_QUEUE.send({wake:true})` is replaced by the existing `{jobId}` queue protocol.
- Added regression coverage to prevent the invalid message shape from returning.
- No schema change; migration count remains 51.

# V1.0.2 Hotfix 11

- Make Today Mission failures diagnosable: Student Plan and Progress Calendar APIs now return structured error code, exact stage, message and request ID; student UI shows the details instead of only a generic refresh message.
- Add an emergency Today mission fallback when planner/policy generation fails but core learner/task storage remains usable; completion reconciliation and streak are non-blocking.
- Expand **Tenant Admin → Word Books** into an existing-book inventory. Tenant books can be viewed/searched, renamed, have stage/description changed, receive incremental queued imports, remove individual terms, and be deleted when not assigned; System books remain visible read-only.
- Add configurable Work Queue task timeout, default **120 minutes** (range 5–1440). A five-minute watchdog marks stale running jobs `timed_out`; admins can delete or retrigger them. Retrigger creates a new FIFO job and keeps the original audit record.
- Preserve queue `max_batch_size=1`, `max_concurrency=1` and oldest-enqueued-job FIFO semantics.
- Add migration `0051_v102_hotfix11_queue_timeout.sql`.

# V1.0.2 Hotfix 10

- Move vocabulary word-book bulk import out of the Student learning UI and into **Tenant Admin → Word Books**.
- Tenant Admin can create an empty tenant word book, create a word book and queue an import, or append an import to an existing tenant word book.
- TXT, CSV and pasted-editor input are parsed on the server and persisted as a `vocabulary_import` job before background processing starts.
- Vocabulary imports reuse the existing `generation_jobs` + `TASK_QUEUE` pipeline, survive page refresh/logout, expose progress/results in Work Queue, and resume from a persisted cursor.
- Import jobs process in bounded chunks while preserving their original queue time; with the existing task-runner `max_batch_size=1` and `max_concurrency=1`, jobs execute strict FIFO with only one running task at any time. A failed item is recorded without aborting the remaining terms, and a failed job does not block the next queued job.
- Tenant-managed custom word books are shared with students in that tenant. Students can study them and save unknown lesson words/phrases into an available custom word book, but cannot create/delete/bulk-import word books.
- Tenant Learning/Practice word-book policies can select either published system books or tenant-managed custom books.
- Add migration `0050_v102_hotfix10_tenant_vocabulary_import.sql` for tenant ownership of custom vocabulary collections.


## V1.0.2 Hotfix 9
- Prevented Daily Task completion reconciliation from blocking Today mission generation or progress calendar reads.
- Isolated stale-task, XP, reward and completion-evidence repairs with graceful degradation and server diagnostics.
- Re-materialises the current plan after a stale day-carried task is removed.
# V1.0.2 Hotfix 8

- Student Vocabulary → Word books now has distinct **Create new** and **Create & import** actions. Create new persists an empty custom word book; Create & import creates the book and imports from pasted text or a loaded TXT/CSV file.
- **Add to existing** accepts the same editor/TXT/CSV input and appends deduplicated terms to a selected custom word book. CSV parsing supports quoted fields and synonym columns; TXT supports one word/phrase per line.
- Vocabulary selected inside Reading, Listening, Speaking, Writing, question/feedback and other lesson surfaces can be saved directly into a chosen custom word book while remaining in My vocabulary.
- Daily Tasks completion is now scoped to the current **Asia/Singapore** date. A Reading/Listening/Writing PASS from a previous day no longer completes a new day's task.
- Pre-generated future Daily Tasks are invalidated when their selected lesson is completed early, so the scheduled day receives a fresh lesson instead of inheriting a historical PASS.
- Existing false current-day adaptive PASS rows from the old lifetime reconciliation logic are self-repaired, including task XP and any still-unused daily reward token.
- The Today mission automatically refreshes at Singapore midnight and when the browser tab regains focus/visibility, preventing an overnight-open page from showing yesterday's completion state.
- No new database migration; schema remains at migration 0049.

# V1.0.2 Hotfix 7

- Tenant Admin **Learning Settings** can assign a specific published system vocabulary word book per learning stage; Daily Vocabulary uses that book and the configured words-per-day target.
- Tenant Admin **Practice Settings** can independently assign a vocabulary word book for Vocabulary Practice, alongside question count, difficulty and review cadence.
- Student Vocabulary Learning/Practice resolves the tenant policy on the server; an assigned book cannot be overridden by the student UI. Vocabulary Practice completion no longer completes the Daily Learning vocabulary mission.
- Tenant-owned Reading, Listening, Speaking and Writing lessons/tasks can be reassigned between P1–P4, P5, P6 and S1–S4. Linked questions move with the lesson while IDs and attempt/history records are preserved. Future unstarted adaptive tasks for the affected stages are invalidated and regenerated.
- Source-driven Cloze creation now supports configurable minimum passage characters, maximum passage characters and exact words/blanks per passage for both Platform Admin and Tenant Admin.
- Cloze generation passes those limits into the ModelBridge prompt and hard-validates passage length, ordered blank markers, exact question count, question type, four distinct options and answer membership before persistence. Duplicate detection includes the Cloze configuration so the same source can be regenerated with different passage/blanks settings.
- Add migration `0049_v102_hotfix7_vocab_books.sql`.

# V1.0.2 Hotfix 5

- Tenant Admin Learning Settings now covers P1–P4, P5, P6 and S1–S4.
- Add per-stage adaptive Daily Task filters for maximum Listening video duration and maximum Reading passage word count; 0 means unlimited.
- Daily Task generation now intersects tenant-visible lessons with the configured Reading/Listening limits and creates no Reading/Listening fallback task when no eligible lesson exists.
- When a cap is configured, video lessons with unknown duration and Reading lessons with unknown text length are excluded from the Daily Task pool; audio-only Listening remains unaffected by the video cap.
- Saving changed Learning Settings invalidates future unstarted adaptive core tasks so the next plan uses the new visibility/filter policy while preserving completed/in-progress work.
- Fix tenant lesson visibility so the configured `lesson_limit` is actually enforced by learner lesson/task selection.
- New tenants now initialise Learn visibility and Daily Task policy rows for all seven learning stages.
- Add migration `0043_v102_daily_task_filters_learning_stages.sql`.

# V1.0.2 Hotfix 4

- Send a welcome email when a new tenant is self-registered, created with a Tenant Admin by Platform Admin, or receives its first Tenant Admin account.
- Add Tenant Admin “Forgot password?” on the login page with SMTP-delivered, one-time reset links.
- Password reset tokens are random 256-bit values; only SHA-256 token hashes are stored, links expire after 30 minutes, and successful resets invalidate all outstanding reset links and existing Tenant Admin sessions.
- Add account/IP reset-request throttling and generic unknown-account responses to reduce account enumeration.
- Add migration `0042_v102_account_email_password_reset.sql`.

# V1.0.2

- Student Account reflects the current student session instead of asking the signed-in student to log in again.
- Immediate lesson-library refresh after publish and explicit review-page back navigation.
- Create-time content deduplication with automatic skip semantics.
- SMTP integration and SMTP-only system email notifications.

# V1.0.1

- Added domain-aware discoverable Content Sources for Reading, Speaking, Writing and Cloze; Listening retains its YouTube/Podcast content-source studio.
- Separated Speaking/Writing curriculum references from Content Sources that can Discover → Select → Create & Queue.
- Added source-driven draft generation for Speaking, Writing and Cloze.
- Fixed Learn → Reading daily tasks incorrectly routing to Practice and repaired legacy uncompleted Reading task links.
- Daily learning missions are now cached by date (`daily-cache-v2`) and are not re-picked on every page/API load.
- Extended remembered login duration and show the signed-in name in the top-right account identity.
- Added migration `0040_v101_content_source_domains.sql`.

# V1.0.0

- Promoted the release line from V0.9.0 R27 to V1.0.0.
- Fixed the AppShell TypeScript active-navigation comparison for ops routes.
- Added a visible `v1.0.0` badge after `English Mastery Platform` in the upper-left brand.

# V0.9.0 R27

- Reading now has a dedicated lesson library beneath its source/discovery workflow.
- Speaking and Writing expose filtered reference-source catalogues and source creation (Platform Admin).
- Cloze and Question Bank are separate source/content tabs with their own libraries.
- Question-bank library views include approved/published items, not only active drafts.
- Content Library now aggregates Reading, Listening, Speaking, Writing, Cloze and Question Bank with type/status filters and bulk publish/take-offline.

# V0.9.0 R25

- Cloudflare Free subrequest hardening: task-runner explicitly processes at most one persisted job per Worker invocation.
- Listening imports now checkpoint across three invocations: source preparation → AI generation → batched D1 persistence. Retry resumes from the last checkpoint and does not repeat completed AI work.
- Task-runner now has a TASK_QUEUE producer binding so staged jobs can safely enqueue their own continuation.
- Listening persistence batches questions/skill links into a single D1 batch to reduce subrequests.
- Platform and Tenant navigation now expose one **Sources & Content** workspace for Reading, Listening, Speaking, Writing, Cloze/Question Bank and Content Library. Legacy top-level creation URLs redirect into the matching tab.
- Question Bank reference-source creation now supports Oral, Reading Comprehension, Cloze and Writing categories instead of being hard-wired to Oral only.
- Owned/authorised listening creation is embedded in the unified Listening workspace.
- `scripts/sync-settings-master-key.sh` is included in the release.
- No database migration.

# V0.9.0 R24 Hotfix 1

- Fix Cloudflare Queue handler typing: the task-runner treats queue messages as wake-up signals, so the handler now accepts `MessageBatch<unknown>` rather than narrowing the framework callback to `MessageBatch<{jobId:string}>`.
- Harden app TypeScript typecheck to ignore nested/version-archive `workers/` trees (`**/workers/**`), preventing stale folders such as `r23/workers/...` from contaminating `tsc --noEmit`.
- No database migration.

# V0.9.0 R21

- Enforced content visibility: guests see Platform/global content only; signed-in students see global + their tenant content.
- Guests cannot invoke student AI endpoints; speaking AI/pronunciation controls are disabled until sign-in.
- Added original global Reading Aloud and Stimulus Conversation content for P5/P6.
- Added Cambridge English speaking reference sources and Platform Admin can add additional oral reference sources from Question Bank.
- Speaking library visibility is no longer truncated by the tenant lesson-limit setting.

## 0.9.0-r20 — configurable YouTube discovery filters

- YouTube listening sources remain fully configurable: admins can add any channel by @handle, URL, or channel ID.
- Added discovery conditions: keyword, publish date range, minimum/maximum duration, Made for Kids, sort order, and result count.
- Conditions are passed to the persistent discovery worker; returned media is already filtered before selection.
- Added Clear filters in Platform Admin and Tenant Admin listening studios.
- YouTube discovery is channel-scoped; the legacy hard-coded curated story catalog is not required for normal listening content selection.
- No database migration required.

## 0.9.0-r19-hotfix11

- Reworked Listening Source Studio around configurable sources instead of the fixed curated story bank.
- Platform Admin can add/disable YouTube channels and podcast feeds.
- Added channel-scoped YouTube keyword search, sorting, and up to 50 results.
- Listening imports are created only from media explicitly selected by the administrator.
- Tenant Admin inherits Platform-approved sources and can select channel media without configuring a separate YouTube API key.
- No database migration required.

## 0.9.0-r19-hotfix4
- Curated Story Bank now falls back to the official publisher-hosted story page when no approved embeddable YouTube copy exists.
- Adds `external_video` media mode with a safe "Open publisher video" student/review experience.
- Fixes `story-r9-059` (British Council — The animal shelter) to the current official publisher URL.

# V0.9.0 R19 Hotfix 2

- Listening retry is now replay-first: when a prior successful `modelbridge_response` log exists, retry reuses that response and does not make another ModelBridge request.
- Added compatibility normalization for `type -> questionType` and `question -> prompt`, plus common question-type aliases and structural inference.
- Added a `runner_version` event (`0.9.0-r19-hotfix2`) so Work Queue logs prove which Task Runner version actually executed the job.
- No database migration added; schema remains at migration 0033.

# V0.9.0 R18 learning momentum

- Added XP and streak reward badges to Learn.
- Added Today and monthly completion rings.
- Added Listen/Speak/Read/Write evidence-based mastery bars.
- Removed duplicate compact-plan streak summary.
- Strengthened completed-task success treatment.
- No database migration added.

# V0.9.0 R17 visual refresh

Layout-preserving Duolingo-inspired color and progress visualization refresh.

# V0.9.0 R16

- Added monthly Learn progress calendar with per-day done/total and percentage.
- Removed duplicate Learn-by-skill cards from Learn home; Today is now the one daily mission list.
- Added authoritative Today reconciliation for completed Reading, Listening and Writing work.
- Completed Today tasks are display-only and cannot accidentally launch another attempt.
- Completed Reading lessons open Past Work; completed Listening lessons no longer restart from the library.
- Preserved R15 unified pass score and all earlier mastery gates.
- No database migration added; schema remains at migration 0032.

# V0.9.0 R15

- Added tenant-level unified `Passing score (%)`, default 60.
- Reading, Listening and Cloze Summary AI reviews now use the configured pass score instead of a hard-coded 30.
- Writing AI review now uses the same configured pass score instead of a hard-coded 60.
- Cloze now requires a per-passage Summary after the cloze answer is correct; Next remains disabled until both gates pass.
- Added full Cloze summary attempt/rewrite history and Work Queue job type `cloze_summary_feedback`.
- Fixed specialised practice finalisation so failed items do not incorrectly count as finished.
- Added migration `0032_v09_r15_unified_pass_score_cloze_summary.sql`.

## R18 Hotfix 3
- Restored high-contrast Admin sidebar navigation colors on the light sidebar; student navigation theme is unchanged.

## 0.9.0-r19
- Work Queue diagnostic log viewer and persistent job event timeline.
- Fixed listening import D1 undefined binding failures through strict generated-question validation.
- ModelBridge request/response/error tracing for listening imports with secret redaction.

## R19 Hotfix 7
- Extend D1 media_kind CHECK constraints to include `external_video` for publisher-hosted listening stories.
- Rebuild `content_media` and `listening_imports` safely while preserving existing rows and indexes.

## R19 Hotfix 8
- Platform-managed integration inheritance for Listening.
- Tenant inherits YouTube/Azure/provider keys; ModelBridge remains tenant-owned.
- Added managed-secret decrypt diagnostics and resolver marker r19-hotfix8.

## 0.9.0 R26
- Keep Source & Content workspace tabs visible while scrolling.
- Add persistent English / Simplified Chinese operation-console language switch.
- Translate platform/tenant shell, unified Source Studio and common operational labels while preserving source/content text.

## V1.0.2 Hotfix 5
- Expanded Tenant Admin Learning Settings to P1–P4, P5, P6, S1–S4 with Listening video-duration and Reading word-count Daily Task filters.
- Added Vocabulary Daily Task size and configurable spaced-review window/repetition policy based on distinct learning days.
- Added per-stage Practice Settings for Listening, Speaking, Reading, Writing, Vocabulary, Grammar and Cloze (content stage, count and difficulty) and wired policies into student practice selection.
- Removed Today's four-skill mission / StudentPlan from the Student Practice page.
- Initialises Learning, Daily Task and Practice defaults for all stages on new-tenant creation.
- Added multi-registry dependency installer (`npm run deps:install`) and one-command full verification (`npm run verify:release`).

## V1.0.2 Hotfix 5.1
- Reworked migrations 0043/0044 to avoid D1 remote `SQLITE_LIMIT_COMPOUND_SELECT` failures by replacing multi-term `UNION ALL` seed queries with `VALUES` CTEs.
- Added a D1 migration compatibility regression that executes 0043/0044 with `SQLITE_LIMIT_COMPOUND_SELECT=3`, verifies prior Tenant Learn settings survive the table rebuild, and verifies 7 Daily Task + 49 Practice policy rows are seeded.
- Added LF enforcement for migration SQL to avoid Wrangler remote migration parser issues on cross-platform checkouts.

## V1.0.2 Hotfix 5.2
- Replaced Tenant Learning Settings and Practice Settings card grids with compact full-width tables inside each learner-stage tab.
- Moved Vocabulary `Review window` and `Required reviews` from Learning Settings to the Vocabulary row in Practice Settings; the practice runtime now uses these values only in Vocabulary Practice.
- Added migration `0045_v102_practice_vocab_review_and_settings_tables.sql`; existing review-frequency values are copied from the legacy Daily Task columns into Vocabulary Practice policy during upgrade.
- Fixed Student Learn refresh behavior: compact Today's learning mission now uses a today-only plan endpoint and returns persisted tasks before attempting a weekly rebuild.

## v1.0.2 Hotfix 6.1
- Fixed all strict TypeScript diagnostics reported after Hotfix 6 in daily task weekday parsing, speaking cache fallback prompts and vocabulary synonym normalization.
- Added Hotfix 6.1 type regression guard to the release gate.

## V1.0.2 Hotfix 11.3
- Removed LIKE/GLOB from Daily Planner materialisation to avoid Cloudflare D1 pattern-complexity failures.
- Fixed partial Today missions so planner degradation fills missing Listening/Reading/etc tasks instead of leaving only existing task types.
- Moved `Use for daily learning` fully to Tenant Admin and blocked Student word-book assignment changes.
- Unified custom word books as Tenant-owned only; migration 0052 preserves and migrates historical learner-owned custom books.
# V1.0.2 Hotfix 11.9

- Added D1-safe incremental rollups for daily learning progress, vocabulary review, Tenant AI usage and Work Queue status.
- Replaced growing candidate-set random sorting with indexed cursor sampling for Question Bank, Cloze and vocabulary practice.
- Removed O(n²) Work Queue position counting and added covering indexes/EXPLAIN release gates for Reading History and other hot paths.
