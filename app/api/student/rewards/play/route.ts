import {getEnv} from "@/lib/cloudflare";
import {ensureLearnerSession,learnerCookie} from "@/lib/student/session";
import {getTenantDailyGameMinutes} from "@/lib/settings/learning-policy";

type RewardRow={id:string;source_label:string;status:string;game_id:string|null;used_at:string|null;game_minutes:number|null};
type GameRow={id:string;name:string;url:string;category:string|null};

function gameKey(url:string){
  if(!url.startsWith("/rewards/game?game="))return "";
  const key=url.slice("/rewards/game?game=".length).trim();
  return /^[a-z0-9-]+$/.test(key)?key:"";
}
function utcMs(value:string|null){
  if(!value)return Date.now();
  const iso=/Z$|[+-]\d\d:\d\d$/.test(value)?value:`${value.replace(" ","T")}Z`;
  const parsed=Date.parse(iso);return Number.isFinite(parsed)?parsed:Date.now();
}
async function loadGame(db:D1Database,id:string){return db.prepare("SELECT id,name,url,category FROM reward_game_catalog WHERE id=? AND enabled=1").bind(id).first<GameRow>();}

export async function POST(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB);
  const tenant=await env.DB.prepare("SELECT COALESCE(tenant_id,'tenant-default') tenant_id FROM child_profiles WHERE id=?").bind(session.childId).first<{tenant_id:string}>();
  const configuredMinutes=await getTenantDailyGameMinutes(env.DB,tenant?.tenant_id||"tenant-default");
  if(configuredMinutes<=0)return Response.json({error:"Game rewards are disabled by your Tenant Admin"},{status:403});
  const body=await request.json().catch(()=>({})) as {rewardId?:unknown};
  const requested=typeof body.rewardId==="string"?body.rewardId:"";
  let reward=requested
    ?await env.DB.prepare("SELECT id,source_label,status,game_id,used_at,game_minutes FROM daily_game_rewards WHERE id=? AND child_id=?").bind(requested,session.childId).first<RewardRow>()
    :await env.DB.prepare("SELECT id,source_label,status,game_id,used_at,game_minutes FROM daily_game_rewards WHERE child_id=? AND status='available' ORDER BY unlocked_at ASC LIMIT 1").bind(session.childId).first<RewardRow>();
  if(!reward)return Response.json({error:"No game reward is available"},{status:409});

  let game:GameRow|null=null;
  if(reward.status==="used"&&reward.game_id){
    game=await loadGame(env.DB,reward.game_id);
    if(!game)return Response.json({error:"The assigned reward game is no longer available"},{status:410});
  }else{
    game=await env.DB.prepare("SELECT id,name,url,category FROM reward_game_catalog WHERE enabled=1 AND url LIKE '/rewards/game?game=%' ORDER BY RANDOM() LIMIT 1").first<GameRow>();
    if(!game)return Response.json({error:"No embedded reward games are enabled"},{status:503});
    const used=await env.DB.prepare("UPDATE daily_game_rewards SET status='used',game_id=?,game_minutes=?,used_at=CURRENT_TIMESTAMP WHERE id=? AND child_id=? AND status='available'").bind(game.id,configuredMinutes,reward.id,session.childId).run();
    if(Number(used.meta?.changes||0)!==1){
      reward=await env.DB.prepare("SELECT id,source_label,status,game_id,used_at,game_minutes FROM daily_game_rewards WHERE id=? AND child_id=?").bind(reward.id,session.childId).first<RewardRow>()||reward;
      if(!reward.game_id)return Response.json({error:"This reward has already been used"},{status:409});
      game=await loadGame(env.DB,reward.game_id);
      if(!game)return Response.json({error:"The assigned reward game is no longer available"},{status:410});
    }else{
      reward=await env.DB.prepare("SELECT id,source_label,status,game_id,used_at,game_minutes FROM daily_game_rewards WHERE id=? AND child_id=?").bind(reward.id,session.childId).first<RewardRow>()||reward;
    }
  }
  const key=gameKey(game.url);
  if(!key)return Response.json({error:"Reward game is not configured for embedded play"},{status:503});
  const maxMinutes=Math.max(1,Number(reward.game_minutes||configuredMinutes));
  const startedAtMs=utcMs(reward.used_at),expiresAt=new Date(startedAtMs+maxMinutes*60*1000).toISOString();
  const response=Response.json({ok:true,rewardId:reward.id,sourceLabel:reward.source_label,maxMinutes,startedAt:new Date(startedAtMs).toISOString(),expiresAt,game:{id:game.id,key,name:game.name,category:game.category}});
  if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
  return response;
}
