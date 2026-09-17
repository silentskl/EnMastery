# English Mastery v1.0.2 Hotfix 11.9.1

## Student navigation and Learn page order

- Adds a consistent **Back** button to every route under **Learn** and **Practice**, including lesson, history, specialised practice and active session pages.
- The button returns to the browser's previous page and falls back to the section landing page (or Home when already on the landing page) for a direct visit.
- Reorders the default Learn page to show **Today's Learning Mission** first, **Learning Momentum** second and **Daily Progress** last.
- Uses the existing button and responsive layout styles so the new navigation remains consistent on desktop and mobile.

## Database

- No new migration.
- Schema remains at 56 migrations, 106 application tables and 17 maintenance triggers.

## Release gate

- `scripts/test_hotfix1191.py` guards the shared back-navigation behavior, both route layouts and the required Learn page module order.
- `npm run check:release` includes Hotfix 11.9.1.
