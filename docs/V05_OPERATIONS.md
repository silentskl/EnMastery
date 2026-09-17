# V0.5 Operations Guide

## V0.5.0 R6 — Four-skill Learn / Practice / Daily Mission

R6 changes the student learning flow without adding a D1 migration. Learn and Practice are both organised by **Listen / Speak / Read / Write**, and the adaptive planner builds a four-skill daily mission from existing published courses.

Student URLs:

```text
/learn
/practice
/practice/listen
/practice/speak
/practice/read
/practice/write
/plan
```

Daily mission rules:

- one Listening task from published listening lessons;
- one Speaking task from published oral prompts;
- one Reading task from unfinished reading or a Paper 2 set;
- one Writing task from published writing prompts;
- due Vocabulary review is an extra task, not a replacement for a core skill.

The Learn/Practice skill cards use real D1 mastery evidence and current library counts. Unassessed skills show `—` rather than demo percentages.

Upgrade:

```bash
./scripts/deploy.sh update
```

No new migration is added. Existing D1/R2/Queue resources are reused.


## R3: Admin-managed integrations

After deploying R3, open:

```text
/platform/settings/integrations
```

The first `./scripts/deploy.sh update` creates `SETTINGS_MASTER_KEY` on all three Workers. This is the only new bootstrap secret. It is not written to `.deploy.env`.

From the page you can configure:

- ModelBridge API/base URL and Chat model
- ModelBridge STT/TTS model IDs and TTS voice
- YouTube Data API v3 key
- Azure Speech region/key

Saved provider secrets are AES-GCM encrypted before D1 storage. After save, the UI only shows a masked hint such as `••••A1b2`; the full value is never returned.

If you already configured values with Wrangler, the page shows them as `Configured · worker`. Click **Migrate existing Worker values** once to copy the current runtime values into the Admin-managed vault. Existing Worker secrets can remain in place as fallbacks.

Use the built-in tests after saving:

- **Test chat** — calls ModelBridge Chat
- **Test TTS** — requests a short TTS sample
- **Test YouTube** — validates the YouTube Data API key

The Task Runner and Syllabus Monitor read the same managed configuration, so no separate key entry is required for queued jobs.

System/bootstrap items remain read-only in Admin:

- `ADMIN_ACCESS_TOKEN`
- `ADMIN_MONITOR_TOKEN`
- `SETTINGS_MASTER_KEY`
- D1/R2/Queue bindings

Cloudflare Email binding setup also remains deployment/Dashboard-managed because it is a Worker binding, not an application-level provider credential.


## V0.5.0 R4 hotfix

If R3 fails `npm run typecheck` with `TS2304: Cannot find name resolveIntegrations` in `app/api/platform/content/route.ts` or `app/api/platform/listening/owned/route.ts`, use the R4 full package. R4 adds the two missing runtime integration imports and a release validator guard for every future `resolveIntegrations(...)` call site.

R4 adds no migration. Run:

```bash
./scripts/deploy.sh update
```


## V0.5.0 R2 hotfix

If `next build` / OpenNext fails while collecting route configuration with:

```text
Cannot find module 'cloudflare:workers'
lib/jobs/dispatch.ts: import { waitUntil } from "cloudflare:workers"
```

use the R2 full package. R2 removes the Workers-only module from the Next.js route dependency graph. All persistent external-source/AI work is dispatched through the configured `TASK_QUEUE`; no in-process background fallback is used.

R2 adds no migration. Run:

```bash
./scripts/deploy.sh update
```


## V0.5.0 R1 hotfix

If the original V0.5.0 package fails `npm run typecheck` with `CloudflareEnv is not assignable to JobEnv` / `R2GetOptions` errors, replace it with the R1 full package and run:

```bash
./scripts/deploy.sh update
```

R1 adds no migration; it only fixes the Cloudflare binding type boundary used by the persistent job/Queue layer.

## 1. Upgrade

Reuse the existing D1/R2 resources and `.deploy.env`:

```bash
cd english-mastery-v0.5.0
./scripts/deploy.sh update
```

The deploy helper performs release selfcheck, TypeScript typecheck and OpenNext build before applying production migrations.

## 2. Persistent Jobs

Open `/platform/jobs` to inspect source/AI background work. Each task has:
- queued / running / succeeded / failed / cancelled
- stage
- progress
- retry count
- entity link
- last error

Failed tasks below the retry limit can be retried. Delete cancels the task and removes unpublished placeholder output.

## 3. Batch Reading Lessons

1. Open `/platform/sources`.
2. Choose a Reading source and Discover.
3. Tick multiple discovered articles, or Select all.
4. Set the shared P5/P6 level, topic and skill mapping.
5. Click `Create & queue N lessons`.
6. The selected lessons are inserted into Content Library immediately with `generating` state.
7. Each lesson receives its own generation job and runs independently.
8. Later open `/platform/content` and Review/Publish each draft separately.

Maximum batch size: 20 lessons.

Switching sources after queueing does not cancel or overwrite the tasks. If an earlier discovery finishes after the administrator has switched source, it remains visible in Jobs and does not replace the current source's screen results.

## 4. Batch Listening Lessons

1. Open `/platform/listening`.
2. Discover YouTube or Podcast media.
3. Multi-select items.
4. Set shared level/topic/listening skills.
5. Optionally enable publisher companion text where available.
6. Click `Create & queue N lessons`.
7. Every selected item becomes a separate Listening Lesson Library row immediately.
8. Review each generated draft later and publish individually.

Authorised transcript input is intentionally single-item only. Bulk jobs use media metadata and optional publisher companion pages; the platform does not assume one transcript applies to multiple source items.

## 5. Job/lesson state model

Expected lesson state progression:

```text
generating / queued
→ generating / fetching_source|preparing_source
→ generating / generating_with_ai
→ draft / complete
→ published
```

Failure:

```text
generating
→ failed
→ Retry
→ generating
```

Delete before publish:

```text
job cancelled/deleted
+ placeholder lesson removed
+ generated draft question mappings removed
+ owned R2 media removed when applicable
```

## 6. Writing

Student: `/learn/write`

Admin: `/platform/writing`

Writing AI feedback is persistent. A submission is saved before ModelBridge evaluation starts. If the browser is closed, the submission remains and the background task can finish or fail independently.

## 7. Paper 2

Student: `/practice`

Admin: `/platform/questions`

AI-generated Paper 2 questions are always Drafts. Review the question, answer and explanation before publishing.

## 8. Diagnostic

Student: `/exam`

Diagnostic results update learner Skill Mastery and are visible in the Parent dashboard. Current diagnostics focus on Paper 2 readiness; they are not full PSLE Paper 1–4 mock exams.

## 9. Account use

Parent/student entry: `/account`

Parent dashboard: `/parent`

Parents can register a child and create the child's login/PIN. The student then signs in without needing an email address.

## 10. Operational checks

```bash
./scripts/deploy.sh status
```

Confirm:
- main Worker deployment
- task-runner Worker deployment
- syllabus-monitor deployment
- D1 and migrations
- R2 bucket
- Queue + DLQ

Health endpoint:

```bash
curl https://study.wisewavesg.com/api/health
```

Expected version: `0.5.0`.

## Serial async queue (R5)

All source/AI generation jobs are persisted in `generation_jobs` before dispatch. The `english-mastery-task-runner` consumer is deliberately configured with `max_batch_size=1` and `max_concurrency=1`. This means one external source/ModelBridge job runs at a time; the next job starts only after the current job completes.

Cloudflare Queues do not guarantee publish-order delivery, so the Task Runner uses each Queue delivery only as a wake-up signal and selects the oldest `queued` D1 job (`created_at`, then SQLite `rowid`) for execution. This gives the application a stable oldest-first work queue while keeping Cloudflare Queue durability.

Batch-create operations can still enqueue up to 20 lessons at once. They will appear immediately in Lesson Library as `generating/queued`, but processing is serial. Failed jobs do not block later jobs; they become `failed` and can be retried manually.

