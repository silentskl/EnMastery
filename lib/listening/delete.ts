export async function softDeleteListeningLessons(db:D1Database,ids:string[],tenantId?:string|null){
  const unique=[...new Set(ids.map(v=>String(v||"").trim()).filter(Boolean))].slice(0,100);
  if(!unique.length)return {deleted:0,ids:[] as string[]};
  const deleted:string[]=[];
  for(const id of unique){
    const row=tenantId
      ? await db.prepare("SELECT id,generation_job_id FROM content_items WHERE id=? AND tenant_id=? AND scope='tenant' AND content_type IN ('audio','video_ref') AND status<>'deleted'").bind(id,tenantId).first<{id:string;generation_job_id:string|null}>()
      : await db.prepare("SELECT id,generation_job_id FROM content_items WHERE id=? AND content_type IN ('audio','video_ref') AND status<>'deleted'").bind(id).first<{id:string;generation_job_id:string|null}>();
    if(!row)continue;
    const statements:D1PreparedStatement[]=[
      db.prepare("UPDATE content_items SET status='deleted',generation_stage='deleted',generation_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id),
      db.prepare("UPDATE questions SET status='deleted' WHERE source_content_id=?").bind(id),
    ];
    if(row.generation_job_id){
      statements.push(db.prepare("UPDATE generation_jobs SET status=CASE WHEN status IN ('queued','running') THEN 'cancelled' ELSE status END,stage=CASE WHEN status IN ('queued','running') THEN 'cancelled' ELSE stage END,deleted_at=COALESCE(deleted_at,CURRENT_TIMESTAMP),completed_at=CASE WHEN status IN ('queued','running') THEN COALESCE(completed_at,CURRENT_TIMESTAMP) ELSE completed_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.generation_job_id));
    }
    await db.batch(statements);
    deleted.push(id);
  }
  return {deleted:deleted.length,ids:deleted};
}
