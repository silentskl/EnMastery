import { modelBridgeChat } from "@/lib/ai/modelbridge";
import type { ConversationFeedback } from "@/lib/speaking/types";

function cleanString(v: unknown, max = 500) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function score(v: unknown) { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0; }
function strings(v: unknown) { return Array.isArray(v) ? v.map(x => cleanString(x, 240)).filter(Boolean).slice(0, 5) : []; }
function extractJson(text: string) { const fenced=text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]; const candidate=(fenced||text).trim(); const a=candidate.indexOf("{"); const b=candidate.lastIndexOf("}"); if(a<0||b<=a) throw new Error("Model did not return speaking JSON"); return JSON.parse(candidate.slice(a,b+1)) as unknown; }

export async function evaluateConversation(args:{baseUrl:string;apiKey:string;model:string;prompt:string;transcript:string;mode:"conversation"|"stimulus";history?:Array<{role:"user"|"assistant";content:string}>}) {
  const history = (args.history || []).slice(-6).map(x => `${x.role === "user" ? "Learner" : "Tutor"}: ${x.content}`).join("\n");
  const prompt = `You are a supportive Singapore P5/P6 English oral tutor. Evaluate the learner's spoken answer from its transcript. Do not over-penalise speech-like grammar. Keep feedback concise and age-appropriate. Then continue the conversation with ONE natural follow-up question.\n\nMode: ${args.mode}\nOriginal prompt: ${args.prompt}\nRecent conversation:\n${history || "(none)"}\nLearner transcript: ${args.transcript}\n\nReturn strict JSON only:\n{"reply":"one short acknowledgement plus the follow-up question","relevance":0,"development":0,"grammar":0,"vocabulary":0,"interaction":0,"strengths":["..."],"improvements":["..."],"betterExpression":"optional improved version of one sentence","followUpQuestion":"..."}\nScores are 0-100 practice indicators, not official PSLE marks. The reply should encourage the learner to keep speaking, not lecture them.`;
  const body = await modelBridgeChat({baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},[{role:"system",content:"Return strict JSON only. You are a careful primary English oral tutor."},{role:"user",content:prompt}]);
  const text = body?.choices?.[0]?.message?.content;
  if(typeof text!=="string") throw new Error("ModelBridge returned no speaking response");
  const raw=extractJson(text); if(!raw||typeof raw!=="object") throw new Error("Invalid speaking feedback"); const x=raw as Record<string,unknown>;
  const follow=cleanString(x.followUpQuestion,300); const reply=cleanString(x.reply,700) || follow;
  return {reply,relevance:score(x.relevance),development:score(x.development),grammar:score(x.grammar),vocabulary:score(x.vocabulary),interaction:score(x.interaction),strengths:strings(x.strengths),improvements:strings(x.improvements),betterExpression:cleanString(x.betterExpression,500)||undefined,followUpQuestion:follow||undefined} satisfies ConversationFeedback;
}

function words(text:string){return text.toLowerCase().replace(/[^a-z0-9'\s]/g," ").split(/\s+/).filter(Boolean);}
function lcs(a:string[],b:string[]){const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);return dp[a.length][b.length];}
export function heuristicPronunciation(reference:string, transcript:string, durationMs:number){
  const ref=words(reference), got=words(transcript); const matched=lcs(ref,got); const completeness=ref.length?matched/ref.length*100:0; const accuracy=got.length?matched/got.length*100:0; const minutes=Math.max(durationMs,1000)/60000; const wpm=got.length/minutes; const target=115; const pacePenalty=Math.min(45,Math.abs(wpm-target)*0.45); const fluency=Math.max(25,100-pacePenalty); const pronunciation=Math.round(accuracy*.45+completeness*.35+fluency*.20);
  return {provider:"practice_heuristic" as const,transcript,accuracy:Math.round(accuracy),fluency:Math.round(fluency),completeness:Math.round(completeness),prosody:null,pronunciation,wordsPerMinute:Math.round(wpm),note:"Free practice score based on recognised words, completeness and speaking pace. Configure Azure Speech for acoustic pronunciation/prosody scoring."};
}
