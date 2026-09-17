# English Mastery v1.0.2 Hotfix 11

Daily Mission diagnostics, Tenant word-book inventory, and configurable queue-timeout release.

## Today Mission reliability and diagnostics

- `/api/student/plan` now assigns a request ID and tracks the exact execution stage.
- Server/database failures return a structured `student_plan_failed` error with `message`, `stage`, and `requestId` instead of only a generic client message.
- Student Today and Learning Momentum surfaces display those diagnostics so production failures can be located without guessing.
- Planner-policy/materialisation failures degrade to an emergency Today mission when the learner/task tables remain available.
- Completion reconciliation and streak calculation are best-effort and cannot take down an otherwise usable Today mission.
- Progress Calendar uses the same request-ID/stage diagnostic format.

## Tenant Admin Word Books

- Tenant Admin → Word Books now lists existing Tenant and System word books with term count and stage.
- Tenant-owned word books support View terms, search, rename/description/stage edits, individual-term removal, delete protection, and Add terms via the existing persistent import queue.
- System word books are visible for reference and are explicitly read-only.
- Existing Tenant books can therefore be maintained incrementally rather than only during initial creation.

## Queue timeout policy

- Adds a persisted Task Queue runtime policy with a default timeout of **120 minutes**.
- Tenant Admin Work Queue and Platform Work Queue can configure the timeout from 5 to 1440 minutes.
- A five-minute Task Runner watchdog marks stale `running` jobs as terminal `failed / timed_out`.
- Timed-out jobs can be deleted from queue history or retriggered.
- Retrigger creates a new FIFO execution record while retaining the original timed-out job and logs for audit.
- Queue execution remains `max_batch_size=1`, `max_concurrency=1`, and persisted FIFO by original queue-entry time.

## Database

- Adds `0051_v102_hotfix11_queue_timeout.sql`.
- Migration count: 51.
- Table count: 100.
