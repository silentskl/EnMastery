import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { BANK_CATEGORIES, isBankCategory, type BankCategory } from "@/lib/question-bank/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { difficultyRange, getTenantPracticePolicy, type PracticeActivity } from "@/lib/settings/practice-policy";
import { mergeD1SamplePages, randomD1SampleKey } from "@/lib/d1/indexed-sample";

const categoryActivity:Record<BankCategory,PracticeActivity>={oral:"speaking",reading_comprehension:"reading",cloze:"cloze",writing:"writing"};

export async function GET(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId,schoolLevel}=await learnerTenantContext(env.DB,session.childId);
  const categories:Record<string,number>={},practicePolicies:Record<string,unknown>={};
  for(const category of BANK_CATEGORIES){
    const policy=await getTenantPracticePolicy(env.DB,tenantId,schoolLevel,categoryActivity[category]),range=difficultyRange(policy.difficulty),flag=range?1:0,low=range?.[0]||1,high=range?.[1]||5;
    const row=await env.DB.prepare(`SELECT COUNT(*) count FROM question_bank_items b JOIN questions q ON q.id=b.question_id
      WHERE b.category=? AND q.status='published' AND q.school_level=? AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?)) AND (?=0 OR q.difficulty BETWEEN ? AND ?)`)
      .bind(category,policy.contentStage,tenantId,flag,low,high).first<{count:number}>();
    categories[category]=Number(row?.count||0);practicePolicies[category]=policy;
  }
  const response=Response.json({schoolLevel,categories,practicePolicies});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
export async function POST(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),body=await request.json().catch(()=>({}))as Record<string,unknown>,category=body.category,mode=body.mode==="exam"?"exam":"practice";
  if(!isBankCategory(category))return Response.json({error:"Unsupported question-bank category"},{status:400});
  const {tenantId,schoolLevel}=await learnerTenantContext(env.DB,session.childId);const policy=await getTenantPracticePolicy(env.DB,tenantId,schoolLevel,categoryActivity[category]);
  const requested=mode==="practice"?policy.questionCount:Math.max(1,Math.min(20,Number(body.count)||5)),contentStage=mode==="practice"?policy.contentStage:schoolLevel,range=mode==="practice"?difficultyRange(policy.difficulty):null,flag=range?1:0,low=range?.[0]||1,high=range?.[1]||5;
  type QuestionRow={id:string;question_type:string;stem_json:string;answer_json:string;explanation_json:string|null;marks:number};
  const cursor=randomD1SampleKey();
  const page=async(comparison:">="|"<",limit:number)=>env.DB.prepare(`SELECT q.id,q.question_type,q.stem_json,q.answer_json,q.explanation_json,q.marks FROM question_bank_items b JOIN questions q ON q.id=b.question_id
    WHERE b.category=? AND b.sample_key ${comparison} ? AND q.status='published' AND q.school_level=? AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?)) AND (?=0 OR q.difficulty BETWEEN ? AND ?) ORDER BY b.sample_key,b.question_id LIMIT ?`)
    .bind(category,cursor,contentStage,tenantId,flag,low,high,limit).all<QuestionRow>();
  const after=await page(">=",requested),remaining=requested-after.results.length,before=remaining>0?await page("<",remaining):{results:[] as QuestionRow[]};
  const selected=mergeD1SamplePages(after.results,before.results,requested);
  if(!selected.length)return Response.json({error:"No published questions match the Tenant practice stage/difficulty policy"},{status:404});
  const id=`spec-${crypto.randomUUID()}`;await env.DB.prepare("INSERT INTO specialised_sessions (id,child_id,mode,category,requested_count,status) VALUES (?,?,?,?,?,'active')").bind(id,session.childId,mode,category,selected.length).run();
  let order=1;for(const q of selected){await env.DB.prepare("INSERT INTO specialised_session_items (id,session_id,question_id,item_order,question_type,stem_json,answer_json,explanation_json,marks,max_score,status) VALUES (?,?,?,?,?,?,?,?,?,?,'pending')").bind(`specitem-${crypto.randomUUID()}`,id,q.id,order++,q.question_type,q.stem_json,q.answer_json,q.explanation_json,q.marks,q.marks).run();}
  const response=Response.json({ok:true,sessionId:id,count:selected.length,practicePolicy:mode==="practice"?policy:null},{status:201});if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));return response;
}
