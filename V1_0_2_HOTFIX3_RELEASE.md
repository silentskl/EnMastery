# English Mastery v1.0.2 Hotfix 3

## Fixes

- Fixed the SMTP type/build configuration as one cross-runtime change: shared SMTP remains on `node:net` + `node:tls`, while both the main Next TypeScript program and the standalone Workers TypeScript program explicitly load `@cloudflare/workers-types` and `node` types.
- Added `check:release`, which runs main TypeScript, Worker TypeScript, Next build, OpenNext/Cloudflare build, release self-check, and style audit in one command.
- Strengthened `selfcheck` so it fails if Node typings, SMTP imports, compatibility dates, or the full release-check command regress.
- Added `MindPath Education / 领思教育 · PSLE Prelim` as an enabled `reference_only` Writing content source for 2026 PSLE Prelim English composition/exam-question inspiration.
- Added the same publisher to Question Bank Sources (`writing`, priority 85) so admins can generate original PSLE-style Writing items from it.
- Added migration `0041_v102_psle_prelim_mindpath_source.sql` and release validation for the seeded source.

## Source policy

The MindPath source is intentionally `reference_only`. English Mastery may use discovered themes/question patterns to produce original exercises, but should not copy third-party prelim-paper images or question text verbatim.

## Release verification

On a machine with dependencies installed, run:

```bash
npm run check:release
```

This expands to:

```bash
npm run typecheck
npm run typecheck:workers
npm run build
npm run build:cloudflare
npm run selfcheck
npm run stylecheck
```
