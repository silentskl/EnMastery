import { getEnv } from "@/lib/cloudflare";
import { ensureLearnerSession, learnerCookie } from "@/lib/student/session";
import { scheduleReview, type ReviewRating } from "@/lib/vocabulary/srs";
import { completeMatchingTasks } from "@/lib/student/tasks";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const env=getEnv();const session=await ensureLearnerSession(request,env.DB);const {id}=await params;
  const body=await request.json() as {rating?:unknown};
  const rating=body.rating;
  if(rating!=="again"&&rating!=="hard"&&rating!=="good"&&rating!=="easy")return Response.json({error:"Invalid review rating."},{status:400});
  const row=await env.DB.prepare("SELECT mastery,review_count,correct_streak,next_review_at FROM learner_vocabulary WHERE child_id=? AND vocabulary_id=?").bind(session.childId,id).first<{mastery:number;review_count:number;correct_streak:number;next_review_at:string|null}>();
  if(!row)return Response.json({error:"Vocabulary item not found."},{status:404});
  const next=scheduleReview({rating:rating as ReviewRating,mastery:row.mastery,reviewCount:row.review_count,correctStreak:row.correct_streak});
  await env.DB.batch([
    env.DB.prepare("UPDATE learner_vocabulary SET mastery=?,status=?,review_count=review_count+1,correct_streak=?,last_reviewed_at=CURRENT_TIMESTAMP,next_review_at=?,updated_at=CURRENT_TIMESTAMP WHERE child_id=? AND vocabulary_id=?").bind(next.mastery,next.status,next.correctStreak,next.nextReviewAt,session.childId,id),
    env.DB.prepare("INSERT INTO vocabulary_review_events (id,child_id,vocabulary_id,rating,previous_mastery,new_mastery,previous_due_at,next_due_at) VALUES (?,?,?,?,?,?,?,?)").bind(`vre-${crypto.randomUUID()}`,session.childId,id,rating,row.mastery,next.mastery,row.next_review_at,next.nextReviewAt),
  ]);
  const remaining=await env.DB.prepare("SELECT COUNT(*) AS n FROM learner_vocabulary WHERE child_id=? AND status!='mastered' AND (next_review_at IS NULL OR datetime(next_review_at)<=CURRENT_TIMESTAMP)").bind(session.childId).first<{n:number}>();
  if((remaining?.n||0)===0) await completeMatchingTasks(env.DB,session.childId,"vocabulary");
  const res=Response.json({ok:true,mastery:next.mastery,status:next.status,nextReviewAt:next.nextReviewAt,correctStreak:next.correctStreak});if(session.isNew)res.headers.set("Set-Cookie",learnerCookie(session.sessionId));return res;
}
