# English Mastery v1.0.2 Hotfix 6.1

Hotfix 6.1 is a compile-safety release on top of Hotfix 6. It does not add a database migration.

## TypeScript fixes

- `lib/settings/daily-task-policy.ts`
  - weekday JSON parsing now narrows to `unknown[]` first;
  - numeric conversion/filtering is explicitly typed;
  - `Set<number>` and numeric comparator prevent `unknown[]` inference under strict TypeScript.
- `lib/speaking/prompt-cache.ts`
  - all three built-in cached/fallback `SpeakingPrompt` objects now include the required `description` property.
- `lib/vocabulary/enrich.ts`
  - synonym normalization now returns `VocabularySynonym[]` directly;
  - removed the incompatible optional-property type predicate;
  - optional `interchangeable` and `example` fields are assigned only when present.

## Database

No schema change. Total migrations remain 48.
