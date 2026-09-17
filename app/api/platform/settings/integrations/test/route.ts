import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { resolveIntegrations } from "@/lib/settings/runtime";
import { modelBridgeChat } from "@/lib/ai/modelbridge";
import { modelBridgeSpeech } from "@/lib/ai/audio";
import { sendNotificationEmail } from "@/lib/notifications/email";

export async function POST(request:Request){
  const denied=await requireAdmin(request); if(denied)return denied;
  const env=await resolveIntegrations(getEnv());
  const body=await request.json().catch(()=>({})) as Record<string,unknown>; const integration=String(body.integration||"");
  try{
    if(integration==="modelbridge"){
      if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_CHAT_MODEL)return Response.json({ok:false,error:"ModelBridge API key/chat model is not configured"},{status:400});
      const r=await modelBridgeChat({baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_CHAT_MODEL},[{role:"user",content:"Reply with exactly OK"}]);
      return Response.json({ok:true,detail:r?.choices?.[0]?.message?.content||"Connected"});
    }
    if(integration==="youtube"){
      if(!env.YOUTUBE_API_KEY)return Response.json({ok:false,error:"YouTube API key is not configured"},{status:400});
      const u=new URL("https://www.googleapis.com/youtube/v3/videos");u.searchParams.set("part","id");u.searchParams.set("id","jNQXAC9IVRw");u.searchParams.set("key",env.YOUTUBE_API_KEY);
      const r=await fetch(u,{headers:{Accept:"application/json"}}); if(!r.ok)throw new Error(`YouTube HTTP ${r.status}: ${(await r.text().catch(()=>" ")).slice(0,160)}`);
      return Response.json({ok:true,detail:"YouTube Data API v3 key accepted"});
    }
    if(integration==="tts"){
      if(!env.MODELBRIDGE_API_KEY||!env.MODELBRIDGE_TTS_MODEL)return Response.json({ok:false,error:"ModelBridge TTS is not configured"},{status:400});
      const audio=await modelBridgeSpeech({baseUrl:env.MODELBRIDGE_BASE_URL,apiKey:env.MODELBRIDGE_API_KEY,model:env.MODELBRIDGE_TTS_MODEL,voice:env.MODELBRIDGE_TTS_VOICE||"alloy",text:"English Mastery text to speech test."});
      return Response.json({ok:true,detail:`TTS returned ${audio.byteLength} bytes`});
    }
    if(integration==="smtp"){
      const result=await sendNotificationEmail(env,{subject:"[English Mastery] SMTP test",text:"English Mastery SMTP integration is configured correctly.",html:"<p><strong>English Mastery SMTP test</strong></p><p>Your SMTP integration is configured correctly.</p>"});
      if(!result.sent)return Response.json({ok:false,error:result.reason==="smtp_disabled"?"SMTP is disabled":"SMTP test could not be sent"},{status:400});
      return Response.json({ok:true,detail:`SMTP accepted ${result.accepted} recipient(s)`});
    }
    return Response.json({ok:false,error:"Unknown integration test"},{status:400});
  }catch(e){return Response.json({ok:false,error:e instanceof Error?e.message:"Integration test failed"},{status:502});}
}
