import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession,learnerCookie } from "@/lib/student/session";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { mergeD1SamplePages,randomD1SampleKey } from "@/lib/d1/indexed-sample";
const STAGES=["P1-P4","P5","P6","S1","S2","S3","S4"];
type QuestionRow={id:string;question_type:string;stem_json:string;answer_json:string;explanation_json:string|null;marks:number};

export async function POST(request:Request){
  const env=getEnv(),session=await ensureLearnerSession(request,env.DB),{tenantId}=await learnerTenantContext(env.DB,session.childId);
  const body=await request.json().catch(()=>({})) as Record<string,unknown>,stage=String(body.stage||"P5"),topic=String(body.topic||"all"),requested=Math.max(1,Math.min(20,Number(body.count)||10));
  if(!STAGES.includes(stage))return Response.json({error:"Unsupported stage"},{status:400});
  const cursor=randomD1SampleKey();
  const page=async(comparison:">="|"<",limit:number)=>{
    const topicFilter=topic!=="all"?"AND b.subcategory=?":"";
    const sql=`SELECT q.id,q.question_type,q.stem_json,q.answer_json,q.explanation_json,q.marks
      FROM question_bank_items b JOIN questions q ON q.id=b.question_id
      WHERE b.category='cloze' ${topicFilter} AND b.sample_key ${comparison} ?
        AND q.status='published' AND q.school_level=?
        AND (q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?))
      ORDER BY b.sample_key,b.question_id LIMIT ?`;
    return topic!=="all"
      ?env.DB.prepare(sql).bind(topic,cursor,stage,tenantId,limit).all<QuestionRow>()
      :env.DB.prepare(sql).bind(cursor,stage,tenantId,limit).all<QuestionRow>();
  };
  const after=await page(">=",requested),remaining=requested-after.results.length,before=remaining>0?await page("<",remaining):{results:[] as QuestionRow[]};
  const selected=mergeD1SamplePages(after.results,before.results,requested);
  if(!selected.length)return Response.json({error:"No cloze items match this stage/topic"},{status:404});
  const id=`spec-${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO specialised_sessions (id,child_id,mode,category,requested_count,status) VALUES (?,?,'practice','cloze',?,'active')").bind(id,session.childId,selected.length).run();
  let order=1;
  for(const q of selected)await env.DB.prepare("INSERT INTO specialised_session_items (id,session_id,question_id,item_order,question_type,stem_json,answer_json,explanation_json,marks,max_score,status) VALUES (?,?,?,?,?,?,?,?,?,?,'pending')").bind(`specitem-${crypto.randomUUID()}`,id,q.id,order++,q.question_type,q.stem_json,q.answer_json,q.explanation_json,q.marks,q.marks).run();
  const response=Response.json({sessionId:id,count:selected.length},{status:201});
  if(session.isNew)response.headers.set("Set-Cookie",learnerCookie(session.sessionId));
  return response;
}
