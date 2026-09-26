# English Mastery V1.0.2 Hotfix 12.4.2 — Vocabulary Specialist TypeScript Fix

## Fixed
Hotfix 12.4.1 could fail `npm run typecheck` in `app/api/student/vocabulary-specialist/route.ts` because TypeScript widened the local `kind` value returned by `clozeItems()` from the intended literal union to a general `string`.

The parser now uses both an explicitly typed `map<StoredClozeItem>` return and an explicitly narrowed `kind` value:

```ts
return raw.map<StoredClozeItem>((item, position) => {
  // ...
  const kind: StoredClozeItem["kind"] =
  item.kind === "synonym_choice" ? "synonym_choice" : "fill";
  // ...
});
```

This keeps the returned object assignable to `StoredClozeItem[]`, whose `kind` field is strictly `"synonym_choice" | "fill"`.

## Scope
- No runtime behavior change.
- No database migration.
- The Hotfix 12.4.1 MCQ randomisation and 5+5 mixed cloze behavior are unchanged.
- Added `scripts/test_hotfix1242.py` and included it in the release gate to prevent regression.
