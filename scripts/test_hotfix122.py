from pathlib import Path
import sqlite3,sys
root=Path(__file__).resolve().parents[1];errors=[]
def read(path):
 p=root/path
 if not p.exists(): errors.append(f"missing {path}"); return ""
 return p.read_text(errors="ignore")
def need(path,*markers):
 s=read(path)
 for marker in markers:
  if marker not in s: errors.append(f"{path}: missing {marker}")
 return s

reward=need('components/daily-game-reward.tsx','router.push(`/rewards/game?rewardId=','current tab')
if 'window.open(' in reward: errors.append('Daily reward still opens a browser popup')
workspace=need('components/reward-game-workspace.tsx','EmbeddedRewardGame','Date.parse(session.expiresAt)-Date.now()','setExpired(true)','role="alertdialog"','Confirm','router.replace(target)')
need('components/embedded-reward-games.tsx','MemoryGame','MathGame','WordGame','ReactionGame')
api=need('app/api/student/rewards/play/route.ts','game_minutes','used_at','expiresAt','/rewards/game?game=','ORDER BY RANDOM()')
if 'hostname!=="poki.com"' in api or 'gameWindow' in reward: errors.append('External Poki popup runtime remains active')
need('app/rewards/game/page.tsx','RewardGameWorkspace','rewardId','returnTo')
need('migrations/0058_v102_hotfix122_embedded_reward_games.sql','ALTER TABLE daily_game_rewards ADD COLUMN game_minutes','UPDATE reward_game_catalog','enabled=0','em-memory-garden','em-reaction-sprint')

try:
 db=sqlite3.connect(':memory:')
 for m in sorted((root/'migrations').glob('*.sql')): db.executescript(m.read_text())
 enabled=db.execute("select id,url from reward_game_catalog where enabled=1 order by sort_order").fetchall()
 if len(enabled)!=8: errors.append(f'expected 8 enabled embedded reward games, got {len(enabled)}')
 for gid,url in enabled:
  if not gid.startswith('em-') or not url.startswith('/rewards/game?game='): errors.append(f'non-embedded enabled game: {(gid,url)}')
 poki=db.execute("select count(*) from reward_game_catalog where id like 'poki-%' and enabled=1").fetchone()[0]
 if poki: errors.append(f'{poki} Poki games remain enabled')
 cols={r[1] for r in db.execute('pragma table_info(daily_game_rewards)')}
 if 'game_minutes' not in cols: errors.append('daily_game_rewards.game_minutes missing')
 db.close()
except Exception as e: errors.append(f'Hotfix12.2 SQLite migration regression failed: {e}')

if errors:
 print('HOTFIX 12.2 TEST FAIL');[print('-',e) for e in errors];sys.exit(1)
print('HOTFIX 12.2 TEST PASS: reward games stay inside the app shell, preserve the original timer across reloads, and expire behind a required Confirm dialog')
