import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession,learnerCookie } from "@/lib/student/session";
import { listVocabularyCollections } from "@/lib/vocabulary/collections";
import { learnerTenantContext } from "@/lib/tenant/learner-context";
import { getTenantDailyTaskPolicy } from "@/lib/settings/daily-task-policy";
import { stageCoreVocabularyBookId } from "@/lib/vocabulary/policy-books";

export async function GET(request:Request){
 const env=getEnv(),session=await ensureLearnerSession(request,env.DB);
 const [collections,ctx]=await Promise.all([listVocabularyCollections(env.DB,session.childId),learnerTenantContext(env.DB,session.childId)]);
 const policy=await getTenantDailyTaskPolicy(env.DB,ctx.tenantId,ctx.schoolLevel);
 const fallback=stageCoreVocabularyBookId(ctx.schoolLevel);
 const assigned=policy.vocabularyCollectionId||fallback;
 const rows=collections.map(c=>({...c,active:c.id===assigned}));
 const r=Response.json({collections:rows,assignedCollectionId:assigned,assignmentSource:"tenant_admin"});
 if(session.isNew)r.headers.set("Set-Cookie",learnerCookie(session.sessionId));return r;
}
export async function POST(){return Response.json({error:"Word-book creation is managed by Tenant Admin"},{status:403});}
