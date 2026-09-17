"use client";
import { useState } from "react";

export function PronounceButton({text,compact=false}:{text:string;compact?:boolean}){
  const[speaking,setSpeaking]=useState(false);
  function speak(){
    if(typeof window==="undefined"||!("speechSynthesis" in window))return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    const voices=window.speechSynthesis.getVoices();
    u.voice=voices.find(v=>v.lang.toLowerCase()==="en-sg")||voices.find(v=>v.lang.toLowerCase().startsWith("en-gb"))||voices.find(v=>v.lang.toLowerCase().startsWith("en"))||null;
    u.lang=u.voice?.lang||"en-GB";u.rate=.86;u.onstart=()=>setSpeaking(true);u.onend=()=>setSpeaking(false);u.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(u);
  }
  return <button className={compact?"pronounceButton compact":"pronounceButton"} onClick={speak} type="button" aria-label={`Pronounce ${text}`}>{speaking?"◼":"🔊"}{compact?null:<span>Listen</span>}</button>;
}
