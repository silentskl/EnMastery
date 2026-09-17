# V0.9.0 R15 Hotfix 1

Fixes the TypeScript typecheck error in `components/cloze/cloze-learning-hub.tsx`.

## Fix
The cloze catalog `fetch().json()` result is now explicitly typed as `Promise<Catalog>` before updating React state. This removes TS2345 caused by passing `setData` directly to a Promise whose resolved value was inferred as `unknown`.

No database migration or behavior change is required.

## Verification
- Release validator: PASS
- Style audit: PASS
- TS/TSX transpilation: 364 files, 0 errors
- Existing schema baseline unchanged: 32 migrations / 92 tables
