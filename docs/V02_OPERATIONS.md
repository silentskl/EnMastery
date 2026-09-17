# V0.2 Operations Quick Start

1. Deploy/update: `./scripts/deploy.sh update`.
2. Open `https://study.wisewavesg.com/platform/login` and enter the Admin password stored in the `ADMIN_ACCESS_TOKEN` Worker secret.
3. Open **Sources**. Test a seeded source with **Discover latest items** or add another trusted RSS/web source.
4. Select an item and choose **Create lesson**.
5. In **Content**, choose P5/P6, topic and reading skills, then **Fetch & create draft**.
6. Open **Review**, inspect passage/questions/answers and publish.
7. Open Student View → **Learn → Read**. The published lesson is immediately available.
8. Answer questions. Home dashboard shows XP/progress and newly collected mastery evidence.

## Source use policy

Use `reference_only` for normal internet sources. The imported raw source is kept privately for audit and ModelBridge is instructed to create original learning prose rather than republish the source.

## Troubleshooting

- Admin login 503: set `ADMIN_ACCESS_TOKEN` with `npx wrangler secret put ADMIN_ACCESS_TOKEN`.
- Import 503: ensure `MODELBRIDGE_API_KEY` and `MODELBRIDGE_CHAT_MODEL` are configured.
- Import host mismatch: add the correct RSS/page as a Source; imported article URLs must remain under that source host.
- No student lesson: verify content status is `published` and level matches the P5/P6 library filter.
- Check migrations: `npx wrangler d1 migrations list english-mastery --remote`.
