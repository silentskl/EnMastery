# V0.9.0 R12 — Work Queue

English Mastery uses D1 as the source of truth for background-work ordering. Cloudflare Queue messages wake the runner, but the runner always selects the oldest active queued row by `enqueued_at`, then `rowid`. The task-runner consumer is configured with `max_batch_size=1` and `max_concurrency=1`, so only one job is processed at a time.

## Admin UI

Open **Admin → Work Queue** to view Queued, Running, Completed and Failed work. The page refreshes every three seconds and shows the global FIFO position of each waiting task. Tenant Admin sees only its own task details; queue position can still reflect other hidden tenants/platform work ahead of it. Platform Operator sees the global queue.

## Retry and deletion

Retry is available only for Failed jobs below their retry limit. A retry gets a new `enqueued_at` value and therefore joins the end of the current FIFO queue. Delete is available only for Completed or Failed history. Deleting queue history never removes generated lesson/question/media outputs. Queued and Running jobs are protected from deletion.

## Timezone

All user-visible timestamps and the live header clock are rendered in `Asia/Singapore`. D1 timestamps remain stored in UTC.
