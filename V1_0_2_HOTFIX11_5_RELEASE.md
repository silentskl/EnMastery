# English Mastery v1.0.2 Hotfix 11.5

## Purpose

Hotfix 11.5 addresses Cloudflare **Error 1102 / Worker exceeded resource limits** on the learner **Today’s learning mission** page.

The previous request path could perform too much work during a single page load: the Learn page mounted two consumers of the Today Plan and two consumers of the progress calendar, while the Today Plan could invoke the seven-day planner, scan large candidate pools, parse many Reading JSON bodies, and perform per-task completion reconciliation. Cloudflare can terminate such a request before application `try/catch` can return structured diagnostics.

## Changes

- Added a dedicated resource-bounded `ensureTodayPlan()` path. `?scope=today` never invokes the seven-day materialiser.
- Planner cache version is now `daily-cache-v9-resource-bounded`, invalidating unstarted old planner tasks safely.
- Today planner returns at most 24 heavy candidates per learning domain rather than materialising/parsing up to 200 Reading/Listening rows in application code.
- Tenant `lesson_limit` is still respected using an ordered SQL `allowed` CTE; the Worker only receives a bounded candidate result set.
- Reading/Listening/Speaking/Writing candidate pools are loaded once and reused; task inserts are issued in one D1 batch.
- If no eligible Reading or Listening lesson exists, Today Mission still gets a safe library fallback card instead of silently omitting that skill.
- Stale preselected completion cleanup is restricted to **today’s at-most-five tasks**. The page request no longer scans the full future week.
- `/api/student/plan?scope=today` is read-mostly when a valid mission is already persisted.
- Request-time `reconcileTodayTaskProgress()` was removed from both Today Plan GET and Calendar GET. Completion is written by activity completion endpoints; reconciliation utilities remain available for write/maintenance paths.
- Learning Momentum no longer issues a second `/api/student/plan` request.
- Learning Momentum and Learning Progress Calendar share/deduplicate the same current-month calendar request.
- Calendar endpoint is read-only and now includes the streak value used by Learning Momentum.
- Non-JSON Cloudflare responses explicitly recognise `Error 1102 / Worker exceeded resource limits` in the learner UI when the API request itself is terminated.
- Added D1 access-path indexes for daily planner content lookup, daily tasks and streak XP lookup.

## Database

New migration:

`0054_v102_hotfix115_daily_plan_resource_indexes.sql`

No new application table is introduced. Schema remains **101 application tables**.

## Preserved behavior

- Daily Learning / Vocabulary Practice word-book assignment remains Tenant Admin-controlled.
- Custom word books remain Tenant-owned; there is no Personal word-book category.
- Per-Tenant System word-book visibility from Hotfix 11.4 remains unchanged.
- Vocabulary imports remain background FIFO jobs with one concurrent task, JSON repair and normalized duplicate prevention.
- Queue timeout remains configurable with a default of 120 minutes.

## Deployment

Apply migration 0054 and deploy the main Worker. In a dependency-enabled environment run:

```bash
npm run verify:release
```

After deployment, reload `/learn`. The Today request returns header `X-Plan-Mode: today-bounded` when the new endpoint is active.
