import { safeJson } from "@/lib/content/store";
import type { VocabularyDetail } from "@/lib/vocabulary/types";
import type { LearningStage } from "@/lib/language/stages";
import { mergeD1SamplePages,randomD1SampleKey } from "@/lib/d1/indexed-sample";

export type CatalogVocabularyItem={
  id:string;detail:VocabularyDetail;stages:LearningStage[];mastery:number;seenCount:number;correctCount:number;saved:boolean;
};

export async function searchVocabularyCatalog(db:D1Database,args:{childId:string;stage:LearningStage;query?:string;entryType?:"word"|"phrase"|"all";limit?:number}){
  const query=(args.query||"").trim().toLowerCase().slice(0,80),like=`%${query}%`,limit=Math.max(1,Math.min(120,args.limit||60));
  const type=args.entryType&&args.entryType!=="all"?args.entryType:null;
  const rows=await db.prepare(`SELECT v.id,v.details_json,v.lemma,v.entry_type,v.part_of_speech,v.pronunciation,
      GROUP_CONCAT(DISTINCT cs_all.stage) stages,
      COALESCE(p.mastery,0) mastery,COALESCE(p.seen_count,0) seen_count,COALESCE(p.correct_count,0) correct_count,
      CASE WHEN lv.vocabulary_id IS NULL THEN 0 ELSE 1 END saved
    FROM vocabulary_items v
    JOIN vocabulary_catalog_stages cs_all ON cs_all.vocabulary_id=v.id
    LEFT JOIN vocabulary_catalog_stages cs_selected ON cs_selected.vocabulary_id=v.id AND cs_selected.stage=?
    LEFT JOIN vocabulary_catalog_progress p ON p.vocabulary_id=v.id AND p.child_id=?
    LEFT JOIN learner_vocabulary lv ON lv.vocabulary_id=v.id AND lv.child_id=?
    WHERE v.is_catalog=1
      AND (? IS NULL OR v.entry_type=?)
      AND ((?='' AND cs_selected.stage IS NOT NULL) OR (?<>'' AND (v.normalized_text LIKE ? OR lower(COALESCE(v.search_text,'')) LIKE ?)))
    GROUP BY v.id
    ORDER BY CASE WHEN ?<>'' AND v.normalized_text=? THEN 0 WHEN ?<>'' AND v.normalized_text LIKE ? THEN 1 ELSE 2 END,
      COALESCE(p.mastery,0) ASC,v.normalized_text ASC
    LIMIT ?`)
    .bind(args.stage,args.childId,args.childId,type,type,query,query,like,like,query,query,query,`${query}%`,limit)
    .all<{id:string;details_json:string;lemma:string;entry_type:string;part_of_speech:string|null;pronunciation:string|null;stages:string|null;mastery:number;seen_count:number;correct_count:number;saved:number}>();
  return rows.results.map(r=>{
    const fallback:VocabularyDetail={term:r.lemma,normalizedTerm:r.lemma.toLowerCase(),entryType:r.entry_type==="phrase"?"phrase":"word",partOfSpeech:r.part_of_speech||undefined,phonetic:r.pronunciation||undefined,meanings:[{definition:r.lemma}],examples:[],synonyms:[],antonyms:[],collocations:[],wordFamily:[],grammarPatterns:[],usageNotes:[],commonMistakes:[],topicTags:[]};
    return {id:r.id,detail:safeJson<VocabularyDetail>(r.details_json,fallback),stages:(r.stages||"").split(",").filter(Boolean) as LearningStage[],mastery:r.mastery||0,seenCount:r.seen_count||0,correctCount:r.correct_count||0,saved:Boolean(r.saved)} satisfies CatalogVocabularyItem;
  });
}

export async function getVocabularyChoiceSet(db:D1Database,stage:LearningStage,count=10){
  type Row={id:string;lemma:string;details_json:string};
  const target=Math.max(1,Math.min(20,count)),cursor=randomD1SampleKey(),poolSize=40;
  const page=(comparison:">="|"<",limit:number)=>db.prepare(`SELECT v.id,v.lemma,v.details_json FROM vocabulary_catalog_stages cs JOIN vocabulary_items v ON v.id=cs.vocabulary_id
    WHERE cs.stage=? AND cs.sample_key ${comparison} ? AND v.is_catalog=1 ORDER BY cs.sample_key,cs.vocabulary_id LIMIT ?`).bind(stage,cursor,limit).all<Row>();
  const after=await page(">=",poolSize),remaining=poolSize-after.results.length,before=remaining>0?await page("<",remaining):{results:[] as Row[]};
  const pool=mergeD1SamplePages(after.results,before.results,poolSize),rows=pool.slice(0,target);
  const defs=pool.map(r=>({id:r.id,definition:safeJson<VocabularyDetail>(r.details_json,{} as VocabularyDetail)?.meanings?.[0]?.simple||safeJson<VocabularyDetail>(r.details_json,{} as VocabularyDetail)?.meanings?.[0]?.definition||r.lemma}));
  return rows.map((r,index)=>{
    const d=safeJson<VocabularyDetail>(r.details_json,{} as VocabularyDetail),correct=d?.meanings?.[0]?.simple||d?.meanings?.[0]?.definition||r.lemma;
    const distractors=defs.filter(x=>x.id!==r.id&&x.definition!==correct).slice(index%5,index%5+3).map(x=>x.definition);
    const options=[correct,...distractors].slice(0,4);
    while(options.length<4)options.push("A meaning that does not fit this word");
    // deterministic rotation avoids always placing the correct answer first without leaking a separate answer key.
    const shift=(index*3+1)%4,rotated=options.slice(shift).concat(options.slice(0,shift));
    return {vocabularyId:r.id,term:r.lemma,entryType:d?.entryType||"word",prompt:`Which meaning best matches “${r.lemma}”?`,options:rotated};
  });
}

export async function scoreVocabularyChoice(db:D1Database,childId:string,stage:LearningStage,vocabularyId:string,selected:string){
  const row=await db.prepare("SELECT details_json FROM vocabulary_items WHERE id=? AND is_catalog=1").bind(vocabularyId).first<{details_json:string}>();
  if(!row)throw new Error("Vocabulary item not found");
  const detail=safeJson<VocabularyDetail>(row.details_json,{} as VocabularyDetail),correctAnswer=detail?.meanings?.[0]?.simple||detail?.meanings?.[0]?.definition||"";
  const norm=(x:string)=>x.toLowerCase().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ").trim();
  const correct=norm(selected)===norm(correctAnswer);
  await recordVocabularyPractice(db,{childId,vocabularyId,stage,activityType:"choice",correct});
  return {correct,correctAnswer,explanation:detail?.examples?.[0]?.sentence?`Example: ${detail.examples[0].sentence}`:"Review the definition and try the word in a sentence."};
}

export async function listVocabularyPassages(db:D1Database,stage:LearningStage){
  const rows=await db.prepare("SELECT id,title,body_text,target_terms_json,questions_json FROM vocabulary_reinforcement_passages WHERE stage=? AND status='published' ORDER BY title").bind(stage).all<{id:string;title:string;body_text:string;target_terms_json:string;questions_json:string}>();
  return rows.results.map(r=>({id:r.id,title:r.title,body:r.body_text,targetTerms:safeJson<string[]>(r.target_terms_json,[]),questions:safeJson<Array<{prompt:string;options:string[]}>>(r.questions_json,[]).map(q=>({prompt:q.prompt,options:q.options}))}));
}

export async function scoreVocabularyReading(db:D1Database,childId:string,stage:LearningStage,passageId:string,questionIndex:number,optionIndex:number){
  const row=await db.prepare("SELECT target_terms_json,questions_json FROM vocabulary_reinforcement_passages WHERE id=? AND stage=? AND status='published'").bind(passageId,stage).first<{target_terms_json:string;questions_json:string}>();
  if(!row)throw new Error("Reading passage not found");
  const questions=safeJson<Array<{prompt:string;options:string[];correctOption:number;explanation?:string}>>(row.questions_json,[]),q=questions[questionIndex];
  if(!q)throw new Error("Question not found");
  const correct=optionIndex===q.correctOption;
  const targets=safeJson<string[]>(row.target_terms_json,[]);let vocabularyId:string|null=null;
  if(targets.length){const v=await db.prepare("SELECT id FROM vocabulary_items WHERE normalized_text=? AND is_catalog=1 LIMIT 1").bind(targets[0].toLowerCase()).first<{id:string}>();vocabularyId=v?.id||null;}
  if(vocabularyId)await recordVocabularyPractice(db,{childId,vocabularyId,stage,activityType:"reading",correct});
  else await db.prepare("INSERT INTO vocabulary_practice_events (id,child_id,vocabulary_id,stage,activity_type,correct) VALUES (?,?,NULL,?,'reading',?)").bind(`vpe-${crypto.randomUUID()}`,childId,stage,correct?1:0).run();
  return {correct,correctOption:q.correctOption,explanation:q.explanation||"Review the passage and the exact wording of the question."};
}

async function recordVocabularyPractice(db:D1Database,args:{childId:string;vocabularyId:string;stage:LearningStage;activityType:"choice"|"context_choice"|"reading";correct:boolean}){
  await db.batch([
    db.prepare("INSERT INTO vocabulary_practice_events (id,child_id,vocabulary_id,stage,activity_type,correct) VALUES (?,?,?,?,?,?)").bind(`vpe-${crypto.randomUUID()}`,args.childId,args.vocabularyId,args.stage,args.activityType,args.correct?1:0),
    db.prepare(`INSERT INTO vocabulary_catalog_progress (child_id,vocabulary_id,mastery,seen_count,correct_count,last_practiced_at,updated_at)
      VALUES (?,?,?,1,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(child_id,vocabulary_id) DO UPDATE SET mastery=MIN(100,MAX(0,vocabulary_catalog_progress.mastery+?)),seen_count=vocabulary_catalog_progress.seen_count+1,correct_count=vocabulary_catalog_progress.correct_count+?,last_practiced_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`)
      .bind(args.childId,args.vocabularyId,args.correct?12:0,args.correct?1:0,args.correct?10:-5,args.correct?1:0)
  ]);
}
