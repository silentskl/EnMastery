import { modelBridgeChat } from "@/lib/ai/modelbridge";

type SummaryFeedback={scores:{mainIdeas:number;accuracy:number;organisation:number;language:number};strengths:string[];improvements:string[];overall:string};
function score(v:unknown){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0}
function extractJson(text:string){const clean=text.trim().replace(/^```(?:json)?/i,"").replace(/```$/i,"").trim();const a=clean.indexOf("{"),b=clean.lastIndexOf("}");if(a<0||b<a)throw new Error("ModelBridge returned invalid summary review");return JSON.parse(clean.slice(a,b+1)) as Record<string,unknown>}
export async function evaluateSummary(args:{baseUrl:string;apiKey:string;model:string;schoolLevel:string;skillType:"reading"|"listening"|"cloze";title:string;reference:string;summary:string;passMark?:number}){
 const body=await modelBridgeChat({baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},[
  {role:"system",content:"You are a Singapore English teacher reviewing a student's summary. Judge whether the student captured the main ideas in their own words. Be encouraging but accurate. Return strict JSON only."},
  {role:"user",content:`Review this ${args.schoolLevel} ${args.skillType} summary. A score below ${args.passMark??60} means the student must rewrite before progressing. Do not rewrite the full summary for the student.\n\nTitle: ${args.title}\n\nReference material (may be publisher metadata or transcript notes; do not invent facts beyond it):\n${args.reference.slice(0,12000)}\n\nStudent summary:\n${args.summary.slice(0,5000)}\n\nReturn JSON: {"scores":{"mainIdeas":0-100,"accuracy":0-100,"organisation":0-100,"language":0-100},"strengths":["..."],"improvements":["..."],"overall":"brief actionable feedback"}.`}
 ]);
 const text=body?.choices?.[0]?.message?.content;if(typeof text!=="string")throw new Error("ModelBridge returned no summary review");
 const x=extractJson(text),s=(x.scores||{}) as Record<string,unknown>;
 const feedback:SummaryFeedback={scores:{mainIdeas:score(s.mainIdeas),accuracy:score(s.accuracy),organisation:score(s.organisation),language:score(s.language)},strengths:Array.isArray(x.strengths)?x.strengths.filter((v):v is string=>typeof v==="string").slice(0,4):[],improvements:Array.isArray(x.improvements)?x.improvements.filter((v):v is string=>typeof v==="string").slice(0,4):[],overall:typeof x.overall==="string"?x.overall:"Revise the summary using the feedback."};
 const reviewScore=Math.round(feedback.scores.mainIdeas*.4+feedback.scores.accuracy*.25+feedback.scores.organisation*.2+feedback.scores.language*.15);
 const passMark=Math.max(1,Math.min(100,Math.round(args.passMark??60)));
 return {...feedback,reviewScore,passed:reviewScore>=passMark,passMark};
}
