"use client";
import type { VocabularyDetail } from "@/lib/vocabulary/types";
import { PronounceButton } from "@/components/vocabulary/pronounce-button";

export function VocabularyDetailCard({detail,compact=false}:{detail:VocabularyDetail;compact?:boolean}){
  const first=detail.meanings[0];
  return <div className={compact?"vocabDetail compact":"vocabDetail"}>
    <div className="vocabDetailHead"><div><div className="vocabTermLine"><h3>{detail.term}</h3><span className="entryTypePill">{detail.entryType}{detail.phraseType?` · ${detail.phraseType.replaceAll("_"," ")}`:""}</span></div><div className="pronunciationLine">{detail.phonetic&&<code>{detail.phonetic}</code>}{detail.partOfSpeech&&<span>{detail.partOfSpeech}</span>}{detail.level&&<span>{detail.level}</span>}</div></div><PronounceButton text={detail.term}/></div>
    {detail.syllables||detail.stress||detail.pronunciationNote?<div className="microFacts">{detail.syllables&&<span><b>Syllables</b>{detail.syllables}</span>}{detail.stress&&<span><b>Stress</b>{detail.stress}</span>}{detail.pronunciationNote&&<span><b>Pronunciation</b>{detail.pronunciationNote}</span>}</div>:null}
    <div className="meaningStack">{detail.meanings.map((m,i)=><div className="meaningBlock" key={i}>{m.label&&<span className="meaningLabel">{m.label}</span>}<strong>{m.definition}</strong>{m.simple&&<p><b>Simple:</b> {m.simple}</p>}{m.contextMeaning&&<p><b>In this context:</b> {m.contextMeaning}</p>}</div>)}</div>
    {!compact&&<>
      {detail.examples.length?<section className="vocabSection"><h4>Examples</h4>{detail.examples.map((e,i)=><div className="exampleLine" key={i}><span>{i+1}</span><p>{e.sentence}{e.note&&<small>{e.note}</small>}</p></div>)}</section>:null}
      {detail.collocations.length?<section className="vocabSection"><h4>Useful collocations</h4><div className="vocabChips">{detail.collocations.map(x=><span key={x}>{x}</span>)}</div></section>:null}
      {((detail.synonyms?.length||0)||(detail.synonymNotes?.length||0)||detail.antonyms.length)?<section className="vocabTwoCols"><div><h4>Synonyms & fine differences</h4>{detail.synonymNotes?.length?<div className="synonymNuanceList">{detail.synonymNotes.map((x,i)=><div className="synonymNuance" key={`${x.term}-${i}`}><strong>{x.term}</strong><p>{x.nuance}</p>{typeof x.interchangeable==="boolean"&&<small>{x.interchangeable?"Often interchangeable in the right context":"Not always interchangeable"}</small>}{x.example&&<em>{x.example}</em>}</div>)}</div>:<p>{detail.synonyms.join(" · ")||"—"}</p>}</div><div><h4>Antonyms</h4><p>{detail.antonyms.join(" · ")||"—"}</p></div></section>:null}
      {detail.wordFamily.length?<section className="vocabSection"><h4>Word family</h4><div className="familyGrid">{detail.wordFamily.map((x,i)=><div key={`${x.term}-${i}`}><strong>{x.term}</strong><span>{x.partOfSpeech||""}</span>{x.meaning&&<small>{x.meaning}</small>}</div>)}</div></section>:null}
      {detail.grammarPatterns.length?<section className="vocabSection"><h4>Grammar & patterns</h4><ul>{detail.grammarPatterns.map((x,i)=><li key={i}>{x}</li>)}</ul></section>:null}
      {detail.usageNotes.length?<section className="vocabSection"><h4>Usage notes</h4><ul>{detail.usageNotes.map((x,i)=><li key={i}>{x}</li>)}</ul></section>:null}
      {detail.commonMistakes.length?<section className="vocabSection warningSection"><h4>Common mistakes</h4><ul>{detail.commonMistakes.map((x,i)=><li key={i}>{x}</li>)}</ul></section>:null}
      {detail.psleUsefulness&&<section className="psleUseBox"><span>PSLE use</span><p>{detail.psleUsefulness}</p></section>}
      {detail.topicTags.length?<div className="vocabChips subtle">{detail.topicTags.map(x=><span key={x}>{x}</span>)}</div>:null}
    </>}
    {compact&&first?.simple&&<p className="compactSimple">{first.simple}</p>}
  </div>;
}
