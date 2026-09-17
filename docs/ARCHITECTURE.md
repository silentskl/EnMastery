# V0.1 Architecture — Cloudflare Free-first

## Runtime topology

```text
Browser / PWA
   |
   v
Next.js 16 + OpenNext Worker
   |-- D1: product/curriculum/learning state
   |-- R2 Standard: controlled media + source snapshots
   |-- ModelBridge: LLM routing
   |
   +--> activity APIs / assessment APIs / parent & admin surfaces

Cron (23:00 UTC)
   |
   v
Syllabus Monitor Worker
   |-- official MOE/SEAB fetch
   |-- immutable R2 snapshots
   |-- D1 fingerprints + change events
   |-- optional ModelBridge impact classification
   |-- review-only content update jobs
   +-- optional verified-destination Email alert
```

## Free-plan profile

Required Cloudflare services in V0.1:

- Workers + Static Assets
- D1
- R2 **Standard** storage
- one Cron Trigger

Explicitly not required:

- Workers KV
- Queues
- Workflows
- Durable Objects
- Browser Rendering

Email does not block deployment. On Workers Free, the monitor can send alerts only to a destination address verified in the Cloudflare account. The deploy script adds a destination-restricted `send_email` binding only when email alerts are enabled.

The monitor is intentionally lightweight for the Workers Free CPU/subrequest envelope: fetch official sources, normalize small HTML pages, SHA-256 fingerprint, R2 snapshot, D1 state, and ModelBridge classification only when a material fingerprint changes.

## Critical invariant

`official source change != automatic publication`.

All material changes are draft-first and auditable. Future content-generation automation may produce replacement versions, but publication requires explicit human approval.

## Curriculum model

`curriculum_version -> skill -> content/question -> learner evidence -> skill_mastery -> plan`.

A syllabus event therefore has a deterministic path to impacted content instead of relying on full-text search alone.
