# V0.9.0 R4 — Writing progression, Past work and idempotent Queue deployment

## Writing progression

A writing prompt is considered completed only after the AI feedback job reaches `reviewed`. The learner Writing API now returns completion metadata for every published prompt and places unfinished prompts before reviewed prompts.

Normal behaviour:

1. Open `/learn/write`.
2. The first unfinished prompt for the learner's school level is selected.
3. The learner writes and chooses **Save & review**.
4. When the review succeeds, that prompt is marked completed for progression purposes.
5. The workspace offers **Next writing →**.
6. On the next visit to `/learn/write`, another unfinished prompt is selected automatically.
7. Only after all published prompts are completed are reviewed prompts shown again as review/re-practice choices.

The weekly adaptive planner also removes future `todo/skipped` Writing tasks that still point to a reviewed prompt, then replans them with unfinished prompts. The completed task and historical records are never deleted.

## Past work

History is available at:

`Learn → Writing → Past work`

and directly at:

`/learn/write/history`

Each `Save & review` creates a separate submission record. Past work shows the prompt, saved response, word count, status, AI scores, strengths, improvement hints and submission time. R4 snapshots the prompt title/body at submit time so later administrator edits do not rewrite history. Migration 0025 best-effort backfills snapshots for pre-R4 submissions from the currently published prompt.

## Cloudflare Queue update fix

Previous releases first ran `wrangler queues list` and only then attempted Queue creation. If list output was stale, paginated or changed format, an existing Queue could be missed and `wrangler queues create english-mastery-jobs` returned Cloudflare API error `11009` (`Queue name ... is already taken`). Under `set -e` this stopped the whole update.

R4 makes Queue provisioning idempotent:

- list lookup remains a fast best-effort check;
- creation is the authoritative fallback;
- create success continues normally;
- Cloudflare error `11009`, `already taken` or `already exists` is treated as "resource already present" and deployment continues;
- all other Queue errors remain fatal.

This applies to both `english-mastery-jobs` and `english-mastery-jobs-dlq`.

## Upgrade

Run from the R4 release directory:

```bash
npm install --no-audit --no-fund
npm run cf:update
```

No Queue deletion or rename is required. Keep the existing Queue and its pending messages.
