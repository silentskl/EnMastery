import {getEnv} from "@/lib/cloudflare";
import {ensureLearnerSession,learnerCookie} from "@/lib/student/session";
import {getTenantDailyGameMinutes} from "@/lib/settings/learning-policy";

export async function POST(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB);
  const tenant=await env.DB.prepare("SELECT COALESCE(tenant_id,'tenant-default') tenant_id FROM child_profiles WHERE id=?").bind(session.childId).first<{tenant_id:string}>();const maxMinutes=await getTenantDailyGameMinutes(env.DB,tenant?.tenant_id||"tenant-default");
  if(maxMinutes<=0)return Response.json({error:"Game rewards are disabled by your Tenant Admin"},{status:403});
  const body=await request.json().catch(()=>({})) as {rewardId?:unknown};
  const requested=typeof body.rewardId==="string"?body.rewardId:"";
  const reward=requested
    ?await env.DB.prepare("SELECT id,source_label FROM daily_game_rewards WHERE id=? AND child_id=? AND status='available'").bind(requested,session.childId).first<{id:string;source_label:string}>()
    :await env.DB.prepare("SELECT id,source_label FROM daily_game_rewards WHERE child_id=? AND status='available' ORDER BY unlocked_at ASC LIMIT 1").bind(session.childId).first<{id:string;source_label:string}>();
  if(!reward)return Response.json({error:"No game reward is available"},{status:409});
  const game=await env.DB.prepare("SELECT id,name,url,category FROM reward_game_catalog WHERE enabled=1 ORDER BY RANDOM() LIMIT 1").first<{id:string;name:string;url:string;category:string|null}>();
  if(!game)return Response.json({error:"No reward games are enabled"},{status:503});
  let parsed:URL;try{parsed=new URL(game.url)}catch{return Response.json({error:"Reward game URL is invalid"},{status:503})}
  if(parsed.protocol!=="https:"||parsed.hostname!=="poki.com")return Response.json({error:"Reward game host is not allowed"},{status:503});
  const used=await env.DB.prepare("UPDATE daily_game_rewards SET status='used',game_id=?,used_at=CURRENT_TIMESTAMP WHERE id=? AND child_id=? AND status='available'").bind(game.id,reward.id,session.childId).run();
  if(Number(used.meta?.changes||0)!==1)return Response.json({error:"This reward has already been used"},{status:409});
  const response=Response.json({ok:true,rewardId:reward.id,sourceLabel:reward.source_label,maxMinutes,game:{name:game.name,url:game.url,category:game.category}});
  if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
  return response;
}
