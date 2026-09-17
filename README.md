# V0.9.0 R18 visual refresh

Layout-preserving Duolingo-inspired color and progress visualization refresh.

# English Mastery V0.9.0 R16

> Release: V0.9.0 R16 — Learn progress calendar + single daily mission + idempotent completed-task navigation.

R16 builds on R15 and keeps the unified pass score, Summary mastery gates, staged Cloze bank, Work Queue and status-filtered administration.

## R16 highlights

- Learn home now has a monthly **Daily progress** calendar showing actual completed/assigned tasks per day.
- Removed the duplicate **Learn by skill** card grid from Learn home. **Today** is the single daily mission list.
- Lightweight library links remain for optional extra learning without duplicating the daily mission cards.
- Today automatically reconciles Reading, Listening and Writing tasks against authoritative PASS records. Completing a lesson from a library therefore marks the matching Today task done.
- Completed Today items are no longer clickable, preventing accidental re-runs.
- Completed Reading library items open their Past Work record; completed Listening items are visibly PASS and no longer restart the exercise.
- Calendar and Today use the same learning-task truth, with Singapore dates.

## Database

No new migration. R16 remains at **32 migrations / 92 tables**.

See `docs/V09_R16_LEARN_CALENDAR_IDEMPOTENT_PROGRESS.md` and `TEST_REPORT.txt`.

## V0.9.0 R22 account/security model
- Public visitors may register an organisation at `/register` and are signed in as its Tenant Admin.
- Tenant Admin configures the tenant-owned ModelBridge key under Admin → Settings → Integrations, then creates Student login names/PINs under Students.
- Platform/Global published content is visible to guests; authenticated students see Global + their tenant content.
- Unauthenticated visitors cannot invoke learner AI APIs; server-side AI routes require an authenticated Student session.
