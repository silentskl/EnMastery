import { processJob, type JobEnv } from "../../lib/jobs/dispatch";
import { sweepTimedOutJobs } from "../../lib/jobs/timeout";

type Env = JobEnv;

/**
 * Free-plan guardrail:
 * - one Cloudflare Queue invocation processes at most ONE persisted job;
 * - generation_jobs remains the FIFO source of truth;
 * - max_concurrency=1 and max_batch_size=1 are also enforced by Wrangler;
 * - a scheduled watchdog marks stale running jobs timed_out and wakes the FIFO.
 */
async function nextQueuedJobId(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare("SELECT id FROM generation_jobs WHERE status='queued' AND deleted_at IS NULL ORDER BY COALESCE(enqueued_at,created_at) ASC, rowid ASC LIMIT 1")
    .first<{ id: string }>();
  return row?.id ?? null;
}
async function wakeNext(env:Env){const id=await nextQueuedJobId(env.DB);if(id&&env.TASK_QUEUE)await env.TASK_QUEUE.send({jobId:id});return id;}

export default {
  async queue(batch: MessageBatch<unknown>, env: Env) {
    const [message, ...overflow] = batch.messages;
    for (const extra of overflow) extra.retry({ delaySeconds: 2 });
    if (!message) return;
    await sweepTimedOutJobs(env.DB,{allScopes:true}).catch(error=>console.error("[task-runner] timeout sweep failed",error));
    const jobId = await nextQueuedJobId(env.DB);
    if (!jobId) { message.ack(); return; }
    try { await processJob(jobId, env); message.ack(); }
    catch { message.retry({ delaySeconds: 15 }); }
  },
  async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){
    ctx.waitUntil((async()=>{const swept=await sweepTimedOutJobs(env.DB,{allScopes:true});if(swept.timedOut>0)await wakeNext(env);})());
  },
} satisfies ExportedHandler<Env>;
