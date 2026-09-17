import type { LearnerVocabularyItem, VocabularyDetail } from "@/lib/vocabulary/types";
import { safeJson } from "@/lib/content/store";

export function normalizeVocabularyTerm(term:string){ return term.trim().replace(/\s+/g," ").toLowerCase(); }

export async function findVocabularyDetail(db:D1Database, term:string):Promise<{id:string;detail:VocabularyDetail}|null>{
  const normalized=normalizeVocabularyTerm(term);
  const row=await db.prepare("SELECT id,lemma,part_of_speech,details_json FROM vocabulary_items WHERE normalized_text=? ORDER BY updated_at DESC LIMIT 1").bind(normalized).first<{id:string;lemma:string;part_of_speech:string|null;details_json:string}>();
  if(!row)return null;
  const detail=safeJson<VocabularyDetail|null>(row.details_json,null);
  if(!detail?.meanings?.length)return null;
  return {id:row.id,detail};
}

export async function saveVocabularyItem(db:D1Database,args:{detail:VocabularyDetail;model?:string|null}){
  const normalized=normalizeVocabularyTerm(args.detail.term);
  const existing=await db.prepare("SELECT id,is_catalog FROM vocabulary_items WHERE normalized_text=? AND entry_type=? ORDER BY is_catalog DESC,updated_at DESC LIMIT 1").bind(normalized,args.detail.entryType).first<{id:string;is_catalog:number}>();
  const vocabularyId=existing?.id || `vocab-${crypto.randomUUID()}`;
  const primaryMeaning=args.detail.meanings[0]?.definition||"";
  if(existing&&!existing.is_catalog){
    await db.prepare("UPDATE vocabulary_items SET lemma=?,part_of_speech=?,definition_json=?,pronunciation=?,details_json=?,enrichment_model=COALESCE(?,enrichment_model),updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(args.detail.term,args.detail.partOfSpeech||null,JSON.stringify(args.detail.meanings),args.detail.phonetic||null,JSON.stringify(args.detail),args.model||null,vocabularyId).run();
  }else if(!existing){
    await db.prepare("INSERT INTO vocabulary_items (id,lemma,part_of_speech,definition_json,pronunciation,entry_type,normalized_text,details_json,enrichment_model,enrichment_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'v1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")
      .bind(vocabularyId,args.detail.term,args.detail.partOfSpeech||null,JSON.stringify(args.detail.meanings.length?args.detail.meanings:[{definition:primaryMeaning}]),args.detail.phonetic||null,args.detail.entryType,normalized,JSON.stringify(args.detail),args.model||null).run();
  }
  return vocabularyId;
}

export async function saveVocabulary(db:D1Database,args:{childId:string;detail:VocabularyDetail;sourceContentId?:string|null;sourceSentence?:string|null;model?:string|null}){
  const vocabularyId=await saveVocabularyItem(db,{detail:args.detail,model:args.model});
  await db.prepare(`INSERT INTO learner_vocabulary (child_id,vocabulary_id,mastery,next_review_at,last_seen_at,detail_snapshot_json,source_content_id,source_sentence,status,review_count,correct_streak,updated_at)
    VALUES (?,?,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?,?,?, 'learning',0,0,CURRENT_TIMESTAMP)
    ON CONFLICT(child_id,vocabulary_id) DO UPDATE SET last_seen_at=CURRENT_TIMESTAMP,detail_snapshot_json=excluded.detail_snapshot_json,source_content_id=COALESCE(excluded.source_content_id,learner_vocabulary.source_content_id),source_sentence=COALESCE(excluded.source_sentence,learner_vocabulary.source_sentence),updated_at=CURRENT_TIMESTAMP`)
    .bind(args.childId,vocabularyId,JSON.stringify(args.detail),args.sourceContentId||null,args.sourceSentence||null).run();
  const context=(args.sourceSentence||"").trim().slice(0,700);
  if(context){
    await db.prepare("INSERT INTO vocabulary_contexts (id,child_id,vocabulary_id,content_id,context_text,context_type) VALUES (?,?,?,?,?,'lesson')")
      .bind(`vctx-${crypto.randomUUID()}`,args.childId,vocabularyId,args.sourceContentId||null,context).run();
  }
  return vocabularyId;
}

export async function listVocabulary(db:D1Database,childId:string):Promise<LearnerVocabularyItem[]>{
  const rows=await db.prepare(`SELECT v.id,v.details_json,v.lemma,v.part_of_speech,v.entry_type,v.pronunciation,
    lv.mastery,lv.status,lv.next_review_at,lv.last_seen_at,lv.last_reviewed_at,lv.review_count,lv.correct_streak,lv.source_content_id,lv.source_sentence,lv.learner_note,lv.detail_snapshot_json
    FROM learner_vocabulary lv JOIN vocabulary_items v ON v.id=lv.vocabulary_id WHERE lv.child_id=? ORDER BY CASE WHEN lv.next_review_at IS NULL THEN 1 ELSE 0 END, lv.next_review_at, lv.last_seen_at DESC`).bind(childId).all<{
      id:string;details_json:string;lemma:string;part_of_speech:string|null;entry_type:string;pronunciation:string|null;mastery:number;status:string;next_review_at:string|null;last_seen_at:string|null;last_reviewed_at:string|null;review_count:number;correct_streak:number;source_content_id:string|null;source_sentence:string|null;learner_note:string|null;detail_snapshot_json:string|null;
    }>();
  const ids=rows.results.map(r=>r.id);
  const contextMap=new Map<string,Array<{text:string;contentId:string|null;createdAt:string}>>();
  if(ids.length){
    const placeholders=ids.map(()=>"?").join(",");
    const contexts=await db.prepare(`SELECT vocabulary_id,context_text,content_id,created_at FROM vocabulary_contexts WHERE child_id=? AND vocabulary_id IN (${placeholders}) ORDER BY created_at DESC`).bind(childId,...ids).all<{vocabulary_id:string;context_text:string;content_id:string|null;created_at:string}>();
    for(const c of contexts.results){const arr=contextMap.get(c.vocabulary_id)||[];if(arr.length<5)arr.push({text:c.context_text,contentId:c.content_id,createdAt:c.created_at});contextMap.set(c.vocabulary_id,arr);}
  }
  return rows.results.map(r=>{
    const fallback:VocabularyDetail={term:r.lemma,normalizedTerm:normalizeVocabularyTerm(r.lemma),entryType:r.entry_type==="phrase"?"phrase":"word",partOfSpeech:r.part_of_speech||undefined,phonetic:r.pronunciation||undefined,meanings:[{definition:r.lemma}],examples:[],synonyms:[],antonyms:[],collocations:[],wordFamily:[],grammarPatterns:[],usageNotes:[],commonMistakes:[],topicTags:[]};
    const detail=safeJson<VocabularyDetail>(r.detail_snapshot_json||r.details_json,fallback);
    return {id:r.id,detail,mastery:r.mastery,status:r.status,nextReviewAt:r.next_review_at,lastSeenAt:r.last_seen_at,lastReviewedAt:r.last_reviewed_at,reviewCount:r.review_count,correctStreak:r.correct_streak,sourceContentId:r.source_content_id,sourceSentence:r.source_sentence,learnerNote:r.learner_note,contexts:contextMap.get(r.id)||[]};
  });
}
