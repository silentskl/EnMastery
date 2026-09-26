# English Mastery v1.0.2 Hotfix 12.3.1

## TypeScript fix: progress calendar study-time fallback

- Fixes `TS2352` in `app/api/student/progress/calendar/route.ts`.
- The study-time query no longer fabricates an incomplete `D1Result<StudyRow>` object when the optional study-time table/query is unavailable.
- The query is normalised to a `StudyRow[]` with `.then(result => result.results).catch(() => [])`, so the business layer consumes a plain array and keeps the existing graceful empty-calendar fallback.
- No database migration is required.
