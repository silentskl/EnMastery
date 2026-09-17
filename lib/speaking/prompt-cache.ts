import type {SpeakingMode,SpeakingPrompt} from "@/lib/speaking/types";
import type {LearningStage} from "@/lib/language/stages";

const stageAge:Record<LearningStage,string>={"P1-P4":"younger primary","P5":"Primary 5","P6":"Primary 6","S1":"Secondary 1","S2":"Secondary 2","S3":"Secondary 3","S4":"Secondary 4"};
function fallbackPrompt(stage:LearningStage,mode:SpeakingMode):SpeakingPrompt{
 const label=stageAge[stage];
 if(mode==="reading_aloud")return{id:`cached-${stage}-reading-aloud`,title:"A Helpful Choice",schoolLevel:stage,topic:"Everyday life",description:"A cached read-aloud passage for fluency, phrasing and expressive reading practice.",mode,prompt:"Read the passage aloud clearly. Pause at punctuation, group words naturally and use expression to show meaning.",referenceText:`After school, a student noticed that someone had dropped a folder near the gate. Instead of walking past it, the student picked it up and checked the name on the cover. A teacher helped return the folder to its owner. The small action took only a few minutes, but it saved another person a great deal of worry. It was a useful reminder that being responsible often begins with noticing what is happening around us and choosing to help.`};
 if(mode==="stimulus")return{id:`cached-${stage}-stimulus`,title:"Working Together",schoolLevel:stage,topic:"Communication",description:"A cached visual-stimulus speaking task for observation, explanation and personal response.",mode,prompt:`Imagine the scene described below. Explain what is happening, what the people are doing well, and what you would do next. Give reasons suitable for a ${label} learner.`,stimulusAlt:"A group of students are preparing a class activity. One is organising materials, another is explaining an idea, two are checking the instructions, and one student looks unsure and is asking for help."};
 return{id:`cached-${stage}-conversation`,title:"AI Talking · Everyday Decisions",schoolLevel:stage,topic:"Conversation",description:"A cached AI conversation prompt for sustained speaking, explanation and follow-up questions.",mode:"conversation",prompt:`Talk with the AI tutor about a decision you made recently at school, at home or with friends. Explain what happened, why you made the choice, and what you learned. The tutor will ask follow-up questions appropriate for a ${label} learner.`};
}

export async function ensureSpeakingModeCache(db:D1Database,tenantId:string,stage:LearningStage,mode:SpeakingMode,live:SpeakingPrompt[]):Promise<SpeakingPrompt[]>{
 const usable=live.filter(p=>p.mode===mode);
 if(usable.length){
  const payload=usable.slice(0,40);const fingerprint=payload.map(p=>p.id).join("|");
  await db.prepare(`INSERT INTO speaking_prompt_cache(tenant_id,school_level,mode,prompts_json,source_fingerprint,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(tenant_id,school_level,mode) DO UPDATE SET prompts_json=excluded.prompts_json,source_fingerprint=excluded.source_fingerprint,updated_at=CURRENT_TIMESTAMP`).bind(tenantId,stage,mode,JSON.stringify(payload),fingerprint).run().catch(()=>undefined);
  return payload;
 }
 const cached=await db.prepare("SELECT prompts_json FROM speaking_prompt_cache WHERE tenant_id=? AND school_level=? AND mode=?").bind(tenantId,stage,mode).first<{prompts_json:string}>().catch(()=>null);
 if(cached?.prompts_json){try{const x=JSON.parse(cached.prompts_json) as SpeakingPrompt[];if(Array.isArray(x)&&x.length)return x}catch{}}
 const fallback=[fallbackPrompt(stage,mode)];
 await db.prepare(`INSERT INTO speaking_prompt_cache(tenant_id,school_level,mode,prompts_json,source_fingerprint,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
  ON CONFLICT(tenant_id,school_level,mode) DO UPDATE SET prompts_json=excluded.prompts_json,source_fingerprint=excluded.source_fingerprint,updated_at=CURRENT_TIMESTAMP`).bind(tenantId,stage,mode,JSON.stringify(fallback),"builtin-v1").run().catch(()=>undefined);
 return fallback;
}
