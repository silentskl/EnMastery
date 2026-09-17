# R25 · Free Queue hardening + unified Source & Content Studio

## Queue execution
A Queue consumer invocation processes one persisted generation job only. Listening imports are resumable checkpoints: `source_prepared` (25%), `ai_generated` (72%), then D1 persistence. Each checkpoint stores only safe generated state; fetched companion text is not retained.

## Unified admin workspace
`/platform/sources` and `/admin/sources` are now the single creation workspace with Reading, Listening, Speaking, Writing, Cloze & Question Bank, and Content Library tabs. Existing routes redirect to the relevant tab so bookmarks remain valid.

## Deployment
The task-runner is both consumer and producer of `english-mastery-jobs`; deploy the updated `workers/task-runner/wrangler.jsonc`. `scripts/sync-settings-master-key.sh` remains the supported way to set the same encryption key on all three Workers.
