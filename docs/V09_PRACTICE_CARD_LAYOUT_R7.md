# V0.9.0 R7 — Practice card layout fix

## What changed

The specialised Practice cards now keep the item count in normal document flow. The count can no longer overlap the descriptive copy, even when the global 17px minimum font size causes additional wrapping.

The Reading comprehension copy was also simplified from “Standalone passages and questions drawn only from the question bank.” to “Standalone passages with comprehension questions.” The source is already stated by the `QUESTION BANK · PRACTICE` kicker, so the repeated wording was redundant.

The footer now reads `N published items` and is separated from the description by a thin divider.

## Responsive behaviour

- Wide desktop: 4 columns
- Medium layouts: 2 columns
- Narrow/mobile: 1 column

## Upgrade

No database migration is required. Deploy over V0.9.0 R6.
