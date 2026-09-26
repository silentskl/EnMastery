import { safeJson } from "@/lib/content/store";
import type { VocabularyDetail } from "@/lib/vocabulary/types";

export type VocabularyCollectionSummary={
  id:string;name:string;code:string|null;description:string;collectionType:"system"|"custom";scope:"system"|"tenant";cefrLevel:string|null;stage:string|null;itemCount:number;masteredCount:number;completionPercent:number;averageMastery:number;active:boolean;dailyTarget:number;
};

export async function listVocabularyCollections(db:D1Database,childId:string){
  const settings=await db.prepare("SELECT daily_target FROM learner_vocabulary_training_settings WHERE child_id=?").bind(childId).first<{daily_target:number}>();
  const rows=await db.prepare(`WITH learner AS (SELECT COALESCE(tenant_id,'tenant-default') tenant_id FROM child_profiles WHERE id=?)
    SELECT c.id,c.name,c.code,c.description,c.collection_type,c.tenant_id,c.cefr_level,c.stage,
    COUNT(ci.vocabulary_id) item_count,
    SUM(CASE WHEN COALESCE(tp.mastery,0)>=80 THEN 1 ELSE 0 END) mastered_count,
    COALESCE(AVG(tp.mastery),0) average_mastery
    FROM vocabulary_collections c CROSS JOIN learner l
    LEFT JOIN tenant_system_vocabulary_visibility sv ON sv.tenant_id=l.tenant_id AND sv.collection_id=c.id
    LEFT JOIN vocabulary_collection_items ci ON ci.collection_id=c.id
    LEFT JOIN vocabulary_training_progress tp ON tp.vocabulary_id=ci.vocabulary_id AND tp.child_id=?
    WHERE c.status='published' AND ((c.collection_type='custom' AND c.tenant_id=l.tenant_id) OR (c.collection_type='system' AND COALESCE(sv.visible,CASE WHEN c.id IN ('sg-p1p4','sg-p5','sg-p6') THEN 1 ELSE 0 END)=1))
    GROUP BY c.id ORDER BY c.sort_order,c.name`).bind(childId,childId).all<{id:string;name:string;code:string|null;description:string;collection_type:"system"|"custom";tenant_id?:string|null;cefr_level:string|null;stage:string|null;item_count:number;mastered_count:number|null;average_mastery:number|null}>();
  return rows.results.map(r=>({id:r.id,name:r.name,code:r.code,description:r.description,collectionType:r.collection_type,scope:r.collection_type==="system"?"system":"tenant",cefrLevel:r.cefr_level,stage:r.stage,itemCount:Number(r.item_count||0),masteredCount:Number(r.mastered_count||0),completionPercent:r.item_count?Math.round(Number(r.mastered_count||0)*100/Number(r.item_count)):0,averageMastery:Math.round(Number(r.average_mastery||0)),active:false,dailyTarget:Math.max(5,Math.min(50,settings?.daily_target||10))} satisfies VocabularyCollectionSummary));
}

export async function ensureCollectionAccess(db:D1Database,childId:string,collectionId:string){
  const row=await db.prepare("SELECT id,name,collection_type,tenant_id FROM vocabulary_collections WHERE id=? AND status='published' AND (collection_type='system' OR (collection_type='custom' AND tenant_id=(SELECT COALESCE(tenant_id,'tenant-default') FROM child_profiles WHERE id=?)))").bind(collectionId,childId).first<{id:string;name:string;collection_type:string;tenant_id:string|null}>();
  if(!row)throw new Error("Vocabulary collection not found");
  return row;
}

export async function listTenantVocabularyCollections(db:D1Database,tenantId:string){
 const rows=await db.prepare(`SELECT c.id,c.name,c.code,c.description,c.collection_type,c.tenant_id,c.stage,c.created_at,c.updated_at,COUNT(ci.vocabulary_id) item_count,
   CASE WHEN c.collection_type='system' THEN COALESCE(sv.visible,CASE WHEN c.id IN ('sg-p1p4','sg-p5','sg-p6') THEN 1 ELSE 0 END) ELSE 1 END student_visible
   FROM vocabulary_collections c LEFT JOIN tenant_system_vocabulary_visibility sv ON sv.tenant_id=? AND sv.collection_id=c.id
   LEFT JOIN vocabulary_collection_items ci ON ci.collection_id=c.id
   WHERE c.status='published' AND (c.collection_type='system' OR (c.collection_type='custom' AND c.tenant_id=?))
   GROUP BY c.id ORDER BY CASE c.collection_type WHEN 'custom' THEN 0 ELSE 1 END,c.sort_order,c.created_at,c.name`).bind(tenantId,tenantId).all<{id:string;name:string;code:string|null;description:string;collection_type:"system"|"custom";tenant_id:string|null;stage:string|null;created_at:string;updated_at:string;item_count:number;student_visible:number}>();
 return rows.results.map(r=>({id:r.id,name:r.name,code:r.code,description:r.description,collectionType:r.collection_type,scope:r.collection_type==="system"?"system":"tenant",manageable:r.collection_type==="custom"&&r.tenant_id===tenantId,stage:r.stage,itemCount:Number(r.item_count||0),createdAt:r.created_at,updatedAt:r.updated_at,studentVisible:Boolean(r.student_visible)}));
}
export async function updateTenantCustomCollection(db:D1Database,tenantId:string,collectionId:string,args:{name?:string;description?:string;stage?:string|null}){
 const row=await db.prepare("SELECT id,name,description,stage FROM vocabulary_collections WHERE id=? AND tenant_id=? AND collection_type='custom' AND status='published'").bind(collectionId,tenantId).first<{id:string;name:string;description:string;stage:string|null}>();if(!row)throw new Error("Tenant word book not found");
 const name=args.name===undefined?row.name:args.name.trim().replace(/\s+/g," ").slice(0,80);if(!name)throw new Error("Word book name is required");
 const duplicate=await db.prepare("SELECT id FROM vocabulary_collections WHERE tenant_id=? AND collection_type='custom' AND lower(name)=lower(?) AND id<>? AND status='published'").bind(tenantId,name,collectionId).first<{id:string}>();if(duplicate)throw new Error("A word book with this name already exists");
 const description=args.description===undefined?row.description:args.description.trim().slice(0,300),stage=args.stage===undefined?row.stage:(args.stage||null);
 await db.prepare("UPDATE vocabulary_collections SET name=?,description=?,stage=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND tenant_id=?").bind(name,description,stage,collectionId,tenantId).run();return{id:collectionId,name,description,stage};
}
export async function listTenantCollectionItems(db:D1Database,tenantId:string,collectionId:string,q="",limit=100,offset=0){
 const collection=await db.prepare("SELECT id,name,collection_type,tenant_id FROM vocabulary_collections WHERE id=? AND status='published' AND (collection_type='system' OR (collection_type='custom' AND tenant_id=?))").bind(collectionId,tenantId).first<{id:string;name:string;collection_type:string;tenant_id:string|null}>();if(!collection)throw new Error("Word book not found");
 const term=q.trim().slice(0,100),safeLimit=Math.max(1,Math.min(200,Math.floor(limit)||100)),safeOffset=Math.max(0,Math.floor(offset)||0),like=`%${term}%`;
 const rows=await db.prepare(`SELECT v.id,v.lemma term,v.part_of_speech,v.definition_json,ci.item_order,ci.import_synonyms_json FROM vocabulary_collection_items ci JOIN vocabulary_items v ON v.id=ci.vocabulary_id WHERE ci.collection_id=? AND (?='' OR v.lemma LIKE ? OR COALESCE(v.search_text,'') LIKE ?) ORDER BY ci.item_order,v.lemma LIMIT ? OFFSET ?`).bind(collectionId,term,like,like,safeLimit,safeOffset).all<{id:string;term:string;part_of_speech:string|null;definition_json:string;item_order:number;import_synonyms_json:string|null}>();
 const count=await db.prepare("SELECT COUNT(*) n FROM vocabulary_collection_items ci JOIN vocabulary_items v ON v.id=ci.vocabulary_id WHERE ci.collection_id=? AND (?='' OR v.lemma LIKE ? OR COALESCE(v.search_text,'') LIKE ?)").bind(collectionId,term,like,like).first<{n:number}>();
 return{collection:{id:collection.id,name:collection.name,manageable:collection.collection_type==='custom'&&collection.tenant_id===tenantId},items:rows.results.map(r=>{let synonyms:string[]=[],definition='';try{synonyms=JSON.parse(r.import_synonyms_json||'[]') as string[]}catch{}try{const defs=JSON.parse(r.definition_json||'[]') as Array<{definition?:unknown}>;definition=typeof defs?.[0]?.definition==='string'?defs[0].definition:''}catch{}return{id:r.id,term:r.term,partOfSpeech:r.part_of_speech,definition,itemOrder:r.item_order,synonyms}}),total:Number(count?.n||0),limit:safeLimit,offset:safeOffset};
}
export async function removeVocabularyFromTenantCollection(db:D1Database,tenantId:string,collectionId:string,vocabularyId:string){const owned=await db.prepare("SELECT id FROM vocabulary_collections WHERE id=? AND tenant_id=? AND collection_type='custom' AND status='published'").bind(collectionId,tenantId).first<{id:string}>();if(!owned)throw new Error("Only Tenant word books can be edited");const r=await db.prepare("DELETE FROM vocabulary_collection_items WHERE collection_id=? AND vocabulary_id=?").bind(collectionId,vocabularyId).run();return Boolean(r.meta.changes);}
export async function createTenantCustomCollection(db:D1Database,tenantId:string,name:string,description="",stage:string|null=null){
 const clean=name.trim().replace(/\s+/g," ").slice(0,80);if(!clean)throw new Error("Word book name is required");
 const duplicate=await db.prepare("SELECT id FROM vocabulary_collections WHERE tenant_id=? AND collection_type='custom' AND lower(name)=lower(?) AND status='published'").bind(tenantId,clean).first<{id:string}>();if(duplicate)throw new Error("A word book with this name already exists");
 const id=`vcol-${crypto.randomUUID()}`;await db.prepare("INSERT INTO vocabulary_collections (id,tenant_id,collection_type,name,description,stage,sort_order,status) VALUES (?,?,'custom',?,?,?,?, 'published')").bind(id,tenantId,clean,description.trim().slice(0,300),stage||null,200).run();return id;
}
export async function deleteTenantCustomCollection(db:D1Database,tenantId:string,collectionId:string){
 const row=await db.prepare("SELECT id FROM vocabulary_collections WHERE id=? AND tenant_id=? AND collection_type='custom'").bind(collectionId,tenantId).first<{id:string}>();if(!row)throw new Error("Tenant word book not found");
 const policy=await db.prepare("SELECT COUNT(*) n FROM tenant_daily_task_policy WHERE tenant_id=? AND vocabulary_collection_id=?").bind(tenantId,collectionId).first<{n:number}>();
 const practice=await db.prepare("SELECT COUNT(*) n FROM tenant_practice_policy WHERE tenant_id=? AND vocabulary_collection_id=?").bind(tenantId,collectionId).first<{n:number}>();
 if(Number(policy?.n||0)+Number(practice?.n||0)>0)throw new Error("This word book is assigned in Learning or Practice settings. Choose another book there before deleting it.");
 await db.prepare("DELETE FROM vocabulary_collections WHERE id=? AND tenant_id=?").bind(collectionId,tenantId).run();
}
export async function addVocabularyToTenantCollection(db:D1Database,tenantId:string,collectionId:string,vocabularyId:string,annotations?:{synonyms?:string[];synonymNotes?:Array<{term:string;nuance:string;interchangeable?:boolean;example?:string}>}){
 const owned=await db.prepare("SELECT id FROM vocabulary_collections WHERE id=? AND tenant_id=? AND collection_type='custom' AND status='published'").bind(collectionId,tenantId).first<{id:string}>();if(!owned)throw new Error("Tenant word book not found");
 const incoming=await db.prepare("SELECT normalized_text FROM vocabulary_items WHERE id=?").bind(vocabularyId).first<{normalized_text:string}>();if(!incoming)throw new Error("Vocabulary item not found");
 const member=await db.prepare(`SELECT ci.vocabulary_id,ci.import_synonyms_json,ci.import_synonym_notes_json FROM vocabulary_collection_items ci JOIN vocabulary_items v ON v.id=ci.vocabulary_id WHERE ci.collection_id=? AND v.normalized_text=? ORDER BY ci.added_at LIMIT 1`).bind(collectionId,incoming.normalized_text).first<{vocabulary_id:string;import_synonyms_json:string|null;import_synonym_notes_json:string|null}>();
 if(member){if(annotations&&(annotations.synonyms?.length||annotations.synonymNotes?.length)){let currentSynonyms:string[]=[],currentNotes:Array<{term:string;nuance:string;interchangeable?:boolean;example?:string}>=[];try{currentSynonyms=JSON.parse(member.import_synonyms_json||"[]") as string[]}catch{}try{currentNotes=JSON.parse(member.import_synonym_notes_json||"[]") as typeof currentNotes}catch{}const synonyms=[...new Set([...currentSynonyms,...(annotations.synonyms||[])].map(x=>x.trim()).filter(Boolean))].slice(0,20),notes=[...currentNotes];for(const note of annotations.synonymNotes||[])if(note?.term&&!notes.some(x=>x.term.toLowerCase()===note.term.toLowerCase()))notes.push(note);await db.prepare("UPDATE vocabulary_collection_items SET import_synonyms_json=?,import_synonym_notes_json=? WHERE collection_id=? AND vocabulary_id=?").bind(JSON.stringify(synonyms),JSON.stringify(notes.slice(0,20)),collectionId,member.vocabulary_id).run();}return false;}
 const order=await db.prepare("SELECT COALESCE(MAX(item_order),0)+1 n FROM vocabulary_collection_items WHERE collection_id=?").bind(collectionId).first<{n:number}>();
 await db.prepare("INSERT OR IGNORE INTO vocabulary_collection_items (collection_id,vocabulary_id,item_order,import_synonyms_json,import_synonym_notes_json) VALUES (?,?,?,?,?)").bind(collectionId,vocabularyId,order?.n||1,JSON.stringify(annotations?.synonyms||[]),JSON.stringify(annotations?.synonymNotes||[])).run();
 return true;
}

export async function createCustomCollection(_db:D1Database,_childId:string,_name:string,_description=""){
  throw new Error("Word-book creation is managed by Tenant Admin");
}

export async function deleteCustomCollection(_db:D1Database,_childId:string,_collectionId:string){
  throw new Error("Word-book management is handled by Tenant Admin");
}

export async function addVocabularyToCollection(db:D1Database,childId:string,collectionId:string,vocabularyId:string,annotations?:{synonyms?:string[];synonymNotes?:Array<{term:string;nuance:string;interchangeable?:boolean;example?:string}>}){
  await ensureCollectionAccess(db,childId,collectionId);
  const owned=await db.prepare("SELECT collection_type,tenant_id FROM vocabulary_collections WHERE id=?").bind(collectionId).first<{collection_type:string;tenant_id:string|null}>();
  const tenant=await db.prepare("SELECT COALESCE(tenant_id,'tenant-default') tenant_id FROM child_profiles WHERE id=?").bind(childId).first<{tenant_id:string}>();
  if(owned?.collection_type!=="custom"||!owned.tenant_id||tenant?.tenant_id!==owned.tenant_id)throw new Error("Choose a Tenant word book available to this learner");
  const order=await db.prepare("SELECT COALESCE(MAX(item_order),0)+1 n FROM vocabulary_collection_items WHERE collection_id=?").bind(collectionId).first<{n:number}>();
  await db.prepare("INSERT OR IGNORE INTO vocabulary_collection_items (collection_id,vocabulary_id,item_order,import_synonyms_json,import_synonym_notes_json) VALUES (?,?,?,?,?)").bind(collectionId,vocabularyId,order?.n||1,JSON.stringify(annotations?.synonyms||[]),JSON.stringify(annotations?.synonymNotes||[])).run();
  if(annotations&&(annotations.synonyms?.length||annotations.synonymNotes?.length))await db.prepare("UPDATE vocabulary_collection_items SET import_synonyms_json=?,import_synonym_notes_json=? WHERE collection_id=? AND vocabulary_id=?").bind(JSON.stringify(annotations.synonyms||[]),JSON.stringify(annotations.synonymNotes||[]),collectionId,vocabularyId).run();
}

export async function searchVocabularyCollection(db:D1Database,args:{childId:string;collectionId:string;query?:string;entryType?:"word"|"phrase"|"all";limit?:number}){
  await ensureCollectionAccess(db,args.childId,args.collectionId);
  const q=(args.query||"").trim().toLowerCase().slice(0,80),like=`%${q}%`,limit=Math.max(1,Math.min(150,args.limit||80));
  const type=args.entryType&&args.entryType!=="all"?args.entryType:null;
  const rows=await db.prepare(`SELECT v.id,v.lemma,v.entry_type,v.part_of_speech,v.pronunciation,v.details_json,ci.import_synonyms_json,ci.import_synonym_notes_json,
      COALESCE(tp.mastery,0) mastery,COALESCE(tp.repetitions,0) seen_count,COALESCE(tp.correct_count,0) correct_count,
      CASE WHEN lv.vocabulary_id IS NULL THEN 0 ELSE 1 END saved
    FROM vocabulary_collection_items ci JOIN vocabulary_items v ON v.id=ci.vocabulary_id
    LEFT JOIN vocabulary_training_progress tp ON tp.vocabulary_id=v.id AND tp.child_id=?
    LEFT JOIN learner_vocabulary lv ON lv.vocabulary_id=v.id AND lv.child_id=?
    WHERE ci.collection_id=? AND (? IS NULL OR v.entry_type=?)
      AND (?='' OR v.normalized_text LIKE ? OR lower(COALESCE(v.search_text,'')) LIKE ?)
    ORDER BY CASE WHEN ?<>'' AND v.normalized_text=? THEN 0 WHEN ?<>'' AND v.normalized_text LIKE ? THEN 1 ELSE 2 END,
      COALESCE(tp.mastery,0),ci.item_order,v.normalized_text LIMIT ?`).bind(args.childId,args.childId,args.collectionId,type,type,q,like,like,q,q,q,`${q}%`,limit).all<{id:string;lemma:string;entry_type:string;part_of_speech:string|null;pronunciation:string|null;details_json:string;import_synonyms_json:string;import_synonym_notes_json:string;mastery:number;seen_count:number;correct_count:number;saved:number}>();
  return rows.results.map(r=>{const fallback:VocabularyDetail={term:r.lemma,normalizedTerm:r.lemma.toLowerCase(),entryType:r.entry_type==="phrase"?"phrase":"word",partOfSpeech:r.part_of_speech||undefined,phonetic:r.pronunciation||undefined,meanings:[{definition:r.lemma}],examples:[],synonyms:[],synonymNotes:[],antonyms:[],collocations:[],wordFamily:[],grammarPatterns:[],usageNotes:[],commonMistakes:[],topicTags:[]};const detail=safeJson<VocabularyDetail>(r.details_json,fallback);let imported:string[]=[];let importedNotes:Array<{term:string;nuance:string;interchangeable?:boolean;example?:string}>=[];try{imported=JSON.parse(r.import_synonyms_json||"[]") as string[]}catch{}try{importedNotes=JSON.parse(r.import_synonym_notes_json||"[]") as typeof importedNotes}catch{}detail.synonyms=[...new Set([...(detail.synonyms||[]),...imported])];detail.synonymNotes=[...(detail.synonymNotes||[]),...importedNotes.filter(n=>!(detail.synonymNotes||[]).some(x=>x.term.toLowerCase()===n.term.toLowerCase()))];return{id:r.id,detail,stages:[],mastery:r.mastery||0,seenCount:r.seen_count||0,correctCount:r.correct_count||0,saved:Boolean(r.saved)};});
}

export async function setTrainingSettings(db:D1Database,childId:string,collectionId:string,dailyTarget:number){
  await ensureCollectionAccess(db,childId,collectionId);const target=Math.max(1,Math.min(50,Math.round(dailyTarget||10)));
  await db.prepare(`INSERT INTO learner_vocabulary_training_settings (child_id,active_collection_id,daily_target,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(child_id) DO UPDATE SET active_collection_id=excluded.active_collection_id,daily_target=excluded.daily_target,updated_at=CURRENT_TIMESTAMP`).bind(childId,collectionId,target).run();
  return target;
}

export async function getTrainingSettings(db:D1Database,childId:string){
  const collections=await listVocabularyCollections(db,childId);const active=collections.find(c=>c.active)||collections[0]||null;
  return{activeCollectionId:active?.id||null,dailyTarget:active?.dailyTarget||10,collections};
}

export type TrainingItem={id:string;detail:VocabularyDetail;mastery:number;pronunciationScore:number;recognitionScore:number;listeningScore:number;spellingScore:number;usageScore:number};
export async function getTrainingQueue(db:D1Database,childId:string,collectionId:string,count:number,reviewPolicy?:{windowDays:number;reviewRepetitions:number;difficulty?:"adaptive"|"easy"|"medium"|"hard"},queueMode:"new"|"review"|"mixed"="mixed"){
  await ensureCollectionAccess(db,childId,collectionId);const n=Math.max(1,Math.min(50,Math.round(count||10)));
  const windowDays=Math.max(1,Math.min(30,Math.round(reviewPolicy?.windowDays||7))),reviews=Math.max(0,Math.min(10,Math.round(reviewPolicy?.reviewRepetitions??2))),difficulty=reviewPolicy?.difficulty||"adaptive";
  const modifier=`-${Math.max(0,windowDays-1)} days`,requiredAppearances=reviews+1;
  const modeFilter=queueMode==="new"?" AND COALESCE(ed.appearance_days,0)=0 ":queueMode==="review"?" AND COALESCE(ed.appearance_days,0)>0 AND ed.first_training_day>=date('now','+8 hours',?) AND COALESCE(ed.appearance_days,0)<? AND COALESCE(ed.last_training_day,'')<>date('now','+8 hours') ":"";
  const sql=`SELECT v.id,v.lemma,v.entry_type,v.part_of_speech,v.details_json,
      COALESCE(tp.mastery,0) mastery,COALESCE(tp.pronunciation_score,0) pronunciation_score,COALESCE(tp.recognition_score,0) recognition_score,
      COALESCE(tp.listening_score,0) listening_score,COALESCE(tp.spelling_score,0) spelling_score,COALESCE(tp.usage_score,0) usage_score,
      CASE WHEN ed.first_training_day>=date('now','+8 hours',?) AND COALESCE(ed.appearance_days,0)<? AND COALESCE(ed.last_training_day,'')<>date('now','+8 hours') THEN 0 ELSE 1 END review_rank,
      CASE ? WHEN 'easy' THEN -COALESCE(tp.mastery,0) WHEN 'medium' THEN ABS(COALESCE(tp.mastery,0)-50) WHEN 'hard' THEN COALESCE(tp.mastery,0) ELSE CASE WHEN COALESCE(tp.mastery,0)>=80 THEN 1000+COALESCE(tp.mastery,0) ELSE COALESCE(tp.mastery,0) END END difficulty_rank
    FROM vocabulary_collection_items ci JOIN vocabulary_items v ON v.id=ci.vocabulary_id
    LEFT JOIN vocabulary_training_progress tp ON tp.vocabulary_id=v.id AND tp.child_id=?
    LEFT JOIN vocabulary_training_rollups ed ON ed.vocabulary_id=v.id AND ed.child_id=?
    WHERE ci.collection_id=? ${modeFilter}
    ORDER BY review_rank,difficulty_rank,COALESCE(tp.last_trained_at,'1970-01-01'),v.id LIMIT ?`;
  const params=queueMode==="review"?[modifier,requiredAppearances,difficulty,childId,childId,collectionId,modifier,requiredAppearances,n]:[modifier,requiredAppearances,difficulty,childId,childId,collectionId,n];
  const rows=await db.prepare(sql).bind(...params).all<{id:string;lemma:string;entry_type:string;part_of_speech:string|null;details_json:string;mastery:number;pronunciation_score:number;recognition_score:number;listening_score:number;spelling_score:number;usage_score:number;review_rank:number}>();
  return rows.results.map(r=>{const fallback:VocabularyDetail={term:r.lemma,normalizedTerm:r.lemma.toLowerCase(),entryType:r.entry_type==="phrase"?"phrase":"word",partOfSpeech:r.part_of_speech||undefined,meanings:[{definition:r.lemma}],examples:[],synonyms:[],antonyms:[],collocations:[],wordFamily:[],grammarPatterns:[],usageNotes:[],commonMistakes:[],topicTags:[]};return{id:r.id,detail:safeJson<VocabularyDetail>(r.details_json,fallback),mastery:r.mastery||0,pronunciationScore:r.pronunciation_score||0,recognitionScore:r.recognition_score||0,listeningScore:r.listening_score||0,spellingScore:r.spelling_score||0,usageScore:r.usage_score||0} satisfies TrainingItem;});
}

const modeColumn={pronounce:"pronunciation_score",meaning:"recognition_score",dictation:"listening_score",definition_spelling:"spelling_score",cloze:"usage_score"} as const;
export type TrainingMode=keyof typeof modeColumn;
export async function recordTrainingAttempt(db:D1Database,args:{childId:string;collectionId:string;vocabularyId:string;mode:TrainingMode;correct:boolean;response?:string}){
  await ensureCollectionAccess(db,args.childId,args.collectionId);
  const member=await db.prepare("SELECT 1 ok FROM vocabulary_collection_items WHERE collection_id=? AND vocabulary_id=?").bind(args.collectionId,args.vocabularyId).first<{ok:number}>();if(!member)throw new Error("Vocabulary item is not in this word book");
  const col=modeColumn[args.mode];const delta=args.correct?22:-10;
  await db.prepare(`INSERT INTO vocabulary_training_progress (child_id,vocabulary_id,${col},repetitions,correct_count,incorrect_count,last_trained_at,updated_at)
      VALUES (?,?,?,1,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(child_id,vocabulary_id) DO UPDATE SET ${col}=MIN(100,MAX(0,${col}+?)),repetitions=repetitions+1,correct_count=correct_count+?,incorrect_count=incorrect_count+?,last_trained_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`)
    .bind(args.childId,args.vocabularyId,args.correct?22:0,args.correct?1:0,args.correct?0:1,delta,args.correct?1:0,args.correct?0:1).run();
  await db.prepare(`UPDATE vocabulary_training_progress SET mastery=ROUND(pronunciation_score*0.10+recognition_score*0.20+listening_score*0.20+spelling_score*0.30+usage_score*0.20,1) WHERE child_id=? AND vocabulary_id=?`).bind(args.childId,args.vocabularyId).run();
  await db.prepare("INSERT INTO vocabulary_training_events (id,child_id,collection_id,vocabulary_id,mode,correct,response_text) VALUES (?,?,?,?,?,?,?)").bind(`vte-${crypto.randomUUID()}`,args.childId,args.collectionId,args.vocabularyId,args.mode,args.correct?1:0,(args.response||"").slice(0,180)||null).run();
  const progress=await db.prepare("SELECT mastery,pronunciation_score,recognition_score,listening_score,spelling_score,usage_score FROM vocabulary_training_progress WHERE child_id=? AND vocabulary_id=?").bind(args.childId,args.vocabularyId).first<{mastery:number;pronunciation_score:number;recognition_score:number;listening_score:number;spelling_score:number;usage_score:number}>();
  return progress;
}
