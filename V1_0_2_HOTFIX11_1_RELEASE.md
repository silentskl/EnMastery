# English Mastery v1.0.2 Hotfix 11.1

## Worker queue typing fix

Hotfix 11 introduced a watchdog wake-up path that sent `{ wake: true }` to `TASK_QUEUE` even though the binding is typed as `Queue<{ jobId: string }>`.

Hotfix 11.1 changes `wakeNext()` to send the existing queue protocol:

```ts
await env.TASK_QUEUE.send({ jobId: id });
```

The queue consumer still treats `generation_jobs` as the FIFO source of truth and looks up the earliest queued job before processing. Therefore the behavioral guarantees remain unchanged:

- max concurrency: 1
- max batch size: 1
- FIFO ordering by `COALESCE(enqueued_at, created_at), rowid`
- scheduled timeout sweep can wake the next queued job

A Hotfix 11 regression assertion now rejects the invalid `{ wake: true }` message shape.

No database migration is added. Migration count remains 51.
