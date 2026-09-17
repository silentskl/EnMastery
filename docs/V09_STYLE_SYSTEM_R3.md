# V0.9.0 R3 — Style System & Writing Workspace Repair

## Reported problem

The Writing workspace placed label text and native form controls in the same inline formatting context. A `textarea` is inline-block by default, so the label baseline aligned near the bottom of the textarea. This produced the reported layout where `Plan` and `Your writing` appeared detached from their fields and the task select sat on the same text line.

## Fix

- `label.fieldLabel` is now a one-column grid with an 8px gap.
- Its direct input/select/textarea controls use full available width and consistent borders/padding.
- Writing uses dedicated classes: `writingLayout`, `writingPaper`, `writingTaskField`, `writingEditorGrid`, `writingPlanInput`, `writingDraftInput`, `writingActions`, `writingCoach`, `writingScoreList`.
- The plan field uses a 150px desktop minimum height; the composition field uses 420px.
- Desktop keeps editor + coach columns; <=980px becomes one column; mobile actions stack.

## Global audit / hardening

- Normalised `.sectionHeading h1` at 34px desktop / 29px mobile.
- All inputs/selects/textareas are overflow-safe and keep the 17px minimum font floor.
- Added consistent `:focus-visible` treatment.
- Added missing shared styles for `.panel`, `.masteryRow`, and `.reviewBlock`.
- Added `min-width:0` safeguards to common grid/card descendants to prevent long text and selects from expanding layouts.
- Added `scripts/audit_styles.py` and `npm run stylecheck`.

## Regression contract

The style audit verifies:

1. CSS braces are balanced.
2. No explicit CSS/inline px font size is below 17px.
3. Literal class names used by TSX have a CSS contract (except intentional semantic wrappers).
4. Writing form/layout contract selectors exist.
5. The Writing workspace no longer relies on inline textarea height styling.

No schema/data changes are required for R3.
