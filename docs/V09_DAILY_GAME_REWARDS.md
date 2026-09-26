# V0.9 Daily Game Rewards

Daily Game Rewards adds a controlled incentive after daily learning. A completed eligible Daily Mission can unlock a game session.

## Unlock policy

Rewards are idempotent through `daily_game_rewards`, which has a unique key on `(child_id, source_type, source_id)`. Refreshes and retries cannot mint duplicate rewards for the same completion.

## Embedded game policy

Reward games run inside the English Mastery application shell. The learner stays in the current browser tab and keeps the standard sidebar/top bar; no reward game uses `window.open()` or an external browser popup.

The active reward route is `/rewards/game`. The server assigns one enabled entry from `reward_game_catalog`, stores it on the reward row, freezes the Tenant-configured game duration in `game_minutes`, and returns an absolute expiry timestamp. Reloading the route therefore resumes the same game with the same deadline rather than resetting the clock.

When the deadline is reached, the game component is removed immediately. A blocking Time's up dialog requires the learner to click Confirm; Confirm exits the game workspace and returns to the page that launched the reward.

## Built-in catalogue

Hotfix 12.2 provides eight enabled built-in entries using four internal mini-game engines:

- Memory Garden
- Space Pairs
- Quick Math
- Number Sprint
- Word Scramble
- Word Choice
- Reaction Grid
- Reaction Sprint

Historical Poki catalogue rows remain in the database for audit/history but are disabled during migration 0058.

## Storage

- `reward_game_catalog`
- `daily_game_rewards`
- `daily_game_rewards.game_minutes` (Hotfix 12.2)

Initial reward schema: `migrations/0024_v09_daily_game_rewards.sql`
Embedded-game upgrade: `migrations/0058_v102_hotfix122_embedded_reward_games.sql`
