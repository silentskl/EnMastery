"use client";
import { useState } from "react";

const entries: Record<string, {pos:string; meaning:string; simple:string; synonyms:string}> = {
  reluctant: { pos: "adjective", meaning: "not willing or eager to do something", simple: "You do not really want to do it.", synonyms: "hesitant · unwilling" },
  thriving: { pos: "verb", meaning: "growing, developing or doing very well", simple: "Doing very well.", synonyms: "flourishing · prospering" },
};

export function ReadingWorkspace() {
 const [word, setWord] = useState("reluctant");
 const item = entries[word];
 return <div className="readingGrid">
   <article className="readingPaper">
     <div className="readingMeta">Singapore · Nature · P6 · 9 min</div>
     <h2>Why Singapore&apos;s otters returned</h2>
     <p>For many years, smooth-coated otters were rarely seen in Singapore. As waterways became cleaner and food sources returned, families of otters slowly began moving back into urban rivers and reservoirs.</p>
     <p>At first, some animals appeared <button className="inlineWord" onClick={() => setWord("reluctant")}>reluctant</button> to enter busy areas. Over time, however, several groups adapted to life close to people.</p>
     <p>Their return is often treated as a sign of a <button className="inlineWord" onClick={() => setWord("thriving")}>thriving</button> ecosystem. It also creates new questions about how people and wildlife can share the same city responsibly.</p>
     <div className="readingQuestion"><strong>Guided check 1 of 3</strong><p>Why might the return of otters be considered evidence of environmental improvement?</p><textarea placeholder="Use evidence from the passage..." /></div>
   </article>
   <aside className="coachPanel">
     <div className="panelTabs"><b>Vocabulary</b><span>Notes</span><span>Questions</span></div>
     <div className="wordCard"><div className="wordTitle">{word} <button aria-label="Play pronunciation">🔊</button></div><span>{item.pos}</span><p>{item.meaning}</p><div className="simpleMeaning">Simple meaning<br/><strong>{item.simple}</strong></div><div className="synonyms">{item.synonyms}</div><button className="button secondary">Save word</button></div>
   </aside>
 </div>;
}
