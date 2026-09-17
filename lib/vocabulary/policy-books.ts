export type PolicyVocabularyBook={id:string;name:string;code:string|null;stage:string|null;cefrLevel:string|null;itemCount:number;scope:"system"|"tenant"};

export async function listPolicyVocabularyBooks(db:D1Database,tenantId?:string|null):Promise<PolicyVocabularyBook[]>{
  const rows=await db.prepare(`SELECT c.id,c.name,c.code,c.stage,c.cefr_level,c.tenant_id,COUNT(ci.vocabulary_id) item_count
    FROM vocabulary_collections c LEFT JOIN vocabulary_collection_items ci ON ci.collection_id=c.id
    WHERE c.status='published' AND (c.collection_type='system' OR (c.collection_type='custom' AND c.tenant_id=?))
    GROUP BY c.id,c.name,c.code,c.stage,c.cefr_level,c.tenant_id,c.sort_order
    ORDER BY CASE WHEN c.collection_type='system' THEN 0 ELSE 1 END,c.sort_order,c.name`).bind(tenantId||"").all<{id:string;name:string;code:string|null;stage:string|null;cefr_level:string|null;tenant_id:string|null;item_count:number}>();
  return rows.results.map(r=>({id:r.id,name:r.name,code:r.code,stage:r.stage,cefrLevel:r.cefr_level,itemCount:Number(r.item_count||0),scope:r.tenant_id?"tenant":"system"}));
}

export async function validatePolicyVocabularyBook(db:D1Database,value:unknown,tenantId?:string|null):Promise<string|null>{
  if(value===null||value===undefined||value==="")return null;if(typeof value!=="string")throw new Error("Choose a valid vocabulary word book");const id=value.trim();
  const row=await db.prepare("SELECT id FROM vocabulary_collections WHERE id=? AND status='published' AND (collection_type='system' OR (collection_type='custom' AND tenant_id=?))").bind(id,tenantId||"").first<{id:string}>();
  if(!row)throw new Error("Choose a published system or Tenant word book");return row.id;
}
export function stageCoreVocabularyBookId(stage:string){return `sg-${stage.toLowerCase().replace(/[^a-z0-9]/g,"")}`;}
