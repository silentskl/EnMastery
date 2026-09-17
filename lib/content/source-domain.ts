import {modelBridgeChat} from "@/lib/ai/modelbridge";
import {parseModelJson} from "@/lib/ai/model-json";
import {DEFAULT_CLOZE_GENERATION_CONFIG,type ClozeGenerationConfig} from "@/lib/content/cloze-config";

export type SourceLessonDomain="speaking"|"writing"|"cloze";
function contentText(body:any){const v=body?.choices?.[0]?.message?.content;if(typeof v!=="string"||!v.trim())throw new Error("ModelBridge returned no content");return v;}
export async function adaptSourceForDomain(args:{baseUrl:string;apiKey:string;model:string;domain:SourceLessonDomain;sourceTitle:string;sourceUrl:string;sourceText:string;schoolLevel:"P5"|"P6";topic:string;clozeConfig?:ClozeGenerationConfig}){
 const common=`You are an expert Singapore primary English curriculum editor. Create ORIGINAL ${args.domain} learning material for ${args.schoolLevel} students. Use the source only for factual/background inspiration. Never copy source sentences, distinctive phrasing, copyrighted passages, or images. Source title: ${args.sourceTitle}\nSource URL: ${args.sourceUrl}\nRequested topic: ${args.topic}\nSource reference text:\n${args.sourceText.slice(0,10000)}`;
 let instruction="";
 if(args.domain==="speaking")instruction=`Return JSON only: {"title":"...","description":"...","topic":"...","mode":"stimulus","prompt":"...","stimulusAlt":"an original scene description inspired by the topic, not the source image","followUpGoals":["...","...","..."]}. Make it PSLE-style oral practice with age-appropriate personal response and opinion prompts.`;
 else if(args.domain==="writing")instruction=`Return JSON only: {"title":"...","description":"...","topic":"...","writingType":"continuous","prompt":"an original PSLE-style writing task","minimumWords":150,"planningPrompts":["...","...","..."]}. Do not ask students to reproduce or summarise the source.`;
 else {const c=args.clozeConfig||DEFAULT_CLOZE_GENERATION_CONFIG;instruction=`Return JSON only: {"title":"...","description":"...","topic":"...","passage":"an original passage with exactly ${c.blankCount} numbered blanks formatted ___1___ through ___${c.blankCount}___","questions":[{"questionType":"grammar_cloze","prompt":"Blank 1: choose the best answer","options":["...","...","...","..."],"answer":"...","explanation":"..."}]}. The passage MUST be between ${c.minChars} and ${c.maxChars} characters inclusive (counting spaces and the blank markers) and questions MUST contain exactly ${c.blankCount} items, one for each blank. questionType must be grammar_cloze, vocabulary_cloze or comprehension_cloze; every question needs exactly four distinct options and answer must exactly match one option.`;}
 const body=await modelBridgeChat({baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},[{role:"system",content:"Return strict JSON only. Create original educational material and do not reproduce source wording."},{role:"user",content:`${common}\n\n${instruction}`}]);
 const out=await parseModelJson({text:contentText(body),expected:"object",repair:{baseUrl:args.baseUrl,apiKey:args.apiKey,model:args.model},purpose:`${args.domain} source lesson generation`}) as Record<string,unknown>;if(typeof out.title!=="string"||typeof out.topic!=="string")throw new Error("Generated lesson is missing title/topic");
 if(args.domain==="speaking"&&(typeof out.prompt!=="string"||typeof out.stimulusAlt!=="string"))throw new Error("Generated speaking lesson is incomplete");
 if(args.domain==="writing"&&typeof out.prompt!=="string")throw new Error("Generated writing lesson is incomplete");
 if(args.domain==="cloze"){
   const c=args.clozeConfig||DEFAULT_CLOZE_GENERATION_CONFIG,passage=typeof out.passage==="string"?out.passage.trim():"",questions=Array.isArray(out.questions)?out.questions:[];
   if(passage.length<c.minChars||passage.length>c.maxChars)throw new Error(`Generated cloze passage has ${passage.length} characters; required ${c.minChars}-${c.maxChars}`);
   const markers=[...passage.matchAll(/___(\d+)___/g)].map(m=>Number(m[1])),expectedMarkers=Array.from({length:c.blankCount},(_,i)=>i+1);
   if(markers.length!==c.blankCount||markers.some((n,i)=>n!==expectedMarkers[i]))throw new Error(`Generated cloze passage must contain exactly the ordered markers ___1___ through ___${c.blankCount}___`);
   if(questions.length!==c.blankCount)throw new Error(`Generated cloze lesson has ${questions.length} blanks; required exactly ${c.blankCount}`);
   for(const [index,q] of questions.entries()){
     if(!q||typeof q!=="object")throw new Error(`Generated cloze item ${index+1} is invalid`);const x=q as Record<string,unknown>,options=Array.isArray(x.options)?x.options.filter((v):v is string=>typeof v==="string"):[],answer=typeof x.answer==="string"?x.answer:"",questionType=String(x.questionType||"");
     if(!["grammar_cloze","vocabulary_cloze","comprehension_cloze"].includes(questionType))throw new Error(`Generated cloze item ${index+1} has invalid questionType`);
     if(options.length!==4||new Set(options).size!==4||!options.includes(answer))throw new Error(`Generated cloze item ${index+1} must have four distinct options and a matching answer`);
   }
 }
 return out;
}
