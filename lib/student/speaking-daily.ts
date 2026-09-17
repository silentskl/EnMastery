import type { SpeakingMode } from "@/lib/speaking/types";
import { getLearnerPassScore } from "@/lib/settings/learning-policy";
import { completeMatchingTasks, sgDate } from "@/lib/student/tasks";

const REQUIRED_MODES:SpeakingMode[]=["conversation","reading_aloud","stimulus"];
export type DailySpeakingProgress={
  taskDate:string;
  passMark:number;
  passedModes:SpeakingMode[];
  scores:Partial<Record<SpeakingMode,number>>;
  completed:boolean;
};

export function conversationOverallScore(feedback:{relevance:number;development:number;grammar:number;vocabulary:number;interaction:number}){
  const values=[feedback.relevance,feedback.development,feedback.grammar,feedback.vocabulary,feedback.interaction].map(Number).filter(Number.isFinite);
  return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
}

export async function getDailySpeakingProgress(db:D1Database,childId:string):Promise<DailySpeakingProgress>{
  const taskDate=sgDate(),passMark=await getLearnerPassScore(db,childId);
  const rows=await db.prepare("SELECT mode,score,passed FROM speaking_daily_mode_progress WHERE child_id=? AND task_date=? ORDER BY mode")
    .bind(childId,taskDate).all<{mode:SpeakingMode;score:number;passed:number}>().catch(()=>({results:[]} as {results:Array<{mode:SpeakingMode;score:number;passed:number}>}));
  const scores:Partial<Record<SpeakingMode,number>>={};for(const row of rows.results)if(REQUIRED_MODES.includes(row.mode))scores[row.mode]=Math.round(Number(row.score)||0);
  // Derive PASS from the Tenant's current mastery threshold. Stored `passed` remains
  // an audit snapshot of the score at submission time, not the source of truth.
  const passedModes=REQUIRED_MODES.filter(mode=>Number(scores[mode]??-1)>=passMark);
  return{taskDate,passMark,passedModes,scores,completed:REQUIRED_MODES.every(mode=>passedModes.includes(mode))};
}

export async function recordDailySpeakingModeScore(db:D1Database,args:{childId:string;mode:SpeakingMode;promptId?:string|null;score:number}){
  const taskDate=sgDate(),passMark=await getLearnerPassScore(db,args.childId),score=Math.max(0,Math.min(100,Math.round(Number(args.score)||0))),passed=score>=passMark;
  await db.prepare(`INSERT INTO speaking_daily_mode_progress(child_id,task_date,mode,prompt_id,score,pass_mark,passed,updated_at)
    VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(child_id,task_date,mode) DO UPDATE SET
      prompt_id=excluded.prompt_id,
      score=MAX(speaking_daily_mode_progress.score,excluded.score),
      pass_mark=excluded.pass_mark,
      passed=CASE WHEN MAX(speaking_daily_mode_progress.score,excluded.score)>=excluded.pass_mark THEN 1 ELSE 0 END,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(args.childId,taskDate,args.mode,args.promptId||null,score,passMark,passed?1:0).run();
  const progress=await getDailySpeakingProgress(db,args.childId);
  if(progress.completed)await completeMatchingTasks(db,args.childId,"speaking");
  return progress;
}
