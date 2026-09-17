import {getEnv} from "@/lib/cloudflare";
import {ensureLearnerSession,learnerCookie} from "@/lib/student/session";
import {maybeGrantEnglishDailyReward} from "@/lib/student/game-rewards";

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB);
  // Also reconcile the reward on read so a learner who completed the four tasks
  // before an app refresh still receives today's single mission token.
  await maybeGrantEnglishDailyReward(env.DB,session.childId);
  const rows=await env.DB.prepare(`SELECT id,reward_date,source_type,source_id,source_label,unlocked_at
    FROM daily_game_rewards WHERE child_id=? AND status='available'
    ORDER BY unlocked_at ASC LIMIT 20`).bind(session.childId).all<{
      id:string;reward_date:string;source_type:string;source_id:string;source_label:string;unlocked_at:string
    }>();
  const response=Response.json({available:rows.results.length,rewards:rows.results});
  if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
  return response;
}
