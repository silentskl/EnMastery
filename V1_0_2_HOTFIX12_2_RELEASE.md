# English Mastery v1.0.2 Hotfix 12.2

## Embedded Daily Reward games

- Reward games no longer open a browser popup/new tab.
- Clicking **Play one game** navigates in the current tab to `/rewards/game`, which is rendered inside the normal English Mastery application shell with the existing sidebar and top bar.
- Replaced the external Poki launch catalogue with eight built-in reward entries backed by four internal mini-game engines: Memory, Numbers, Words and Reflex.
- Added a persistent server-side start time and frozen `game_minutes` value so refreshing the game page cannot reset the reward timer.
- At expiry the game component is removed immediately and a blocking **Time's up** dialog appears. The learner must click **Confirm**, which closes the game workspace and returns to the page from which the reward was started.
- Reloading an already-started reward reopens the same assigned game and continues the original countdown instead of consuming another reward.

## Database

- Adds migration `0058_v102_hotfix122_embedded_reward_games.sql`.
- Existing Poki catalogue rows are retained but disabled; eight internal reward rows are enabled.
- Adds nullable `daily_game_rewards.game_minutes` for immutable per-session limits.
