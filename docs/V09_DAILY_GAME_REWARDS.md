# English Mastery V0.9.0 R2 — Daily Game Rewards

## Goal

Daily Game Rewards adds a small, controlled incentive after daily learning. One completed daily learning unit unlocks one game launch.

### What counts as one learning unit

- English daily mission: Listening, Speaking, Reading, Writing and Vocabulary each unlock one reward when the matching `learning_tasks` row changes to `done`.
- Singapore Science: one completed Daily Science session unlocks one reward.
- Normal browsing, dictionary searches, topic reading and non-daily practice do not create rewards.

Rewards are idempotent. `daily_game_rewards` has a unique key on `(child_id, source_type, source_id)`, so retries and refreshes cannot create duplicate launches for the same completed unit.

## Game launch model

English Mastery does **not** copy, proxy or iframe Poki game code. The reward opens the selected game on the official `https://poki.com/en/g/...` page in a new browser tab.

The reward is consumed at launch time. English Mastery cannot reliably observe when a round inside a third-party Poki game begins or ends, so `one reward = one external game launch` is the enforceable boundary.

The server validates that the selected URL uses HTTPS and has hostname `poki.com` before returning it.

## Seeded game catalog

The R2 migration seeds eight enabled games:

1. 2048
2. Monkey Mart
3. Stickman Hook
4. Drive Mad
5. Papa's Freezeria
6. Blumgi Slime
7. Brain Test: Tricky Puzzles
8. Tiny Fishing

The catalog is stored in `reward_game_catalog`; enabled rows are selected with SQLite `ORDER BY RANDOM() LIMIT 1`.

## Student UX

A game-controller button appears in the student top bar. Its badge shows currently available rewards. When a newly completed task is detected, the reward dialog opens automatically. The student can also open it manually.

The dialog shows which completed learning unit unlocked each reward. Clicking **Play one game** consumes that reward and launches a randomly selected Poki game.

The UI clearly states that Poki is an external site and controls its own game content, advertising and privacy experience.

## Database

Migration: `migrations/0024_v09_daily_game_rewards.sql`

New tables:

- `reward_game_catalog`
- `daily_game_rewards`

No existing English, Science, Vocabulary, Grammar, Question Bank or learner progress tables are rewritten.

## Upgrade

V0.9.0 R1 → V0.9.0 R2 is additive. Run the normal D1 migration/update process before deploying the new application code.
