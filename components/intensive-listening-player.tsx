"use client";
import { useRef } from "react";
type Content={id:string;school_level:string;media:{media_url?:string|null};segments?:Array<{id:string;start_ms:number;end_ms:number}>};
export function IntensiveListeningPlayer({content}:{content:Content}){
 const audio=useRef<HTMLAudioElement|null>(null);
 function playSegment(start:number,end:number){const element=audio.current;if(!element)return;element.currentTime=start/1000;void element.play();const stop=()=>{if(element.currentTime>=end/1000){element.pause();element.removeEventListener("timeupdate",stop)}};element.addEventListener("timeupdate",stop)}
 return <section className="card intensivePanel">
  <div className="cardHeader"><h2>Listening audio</h2><span>Owned · authorised recording</span></div>
  <audio ref={audio} controls preload="metadata" src={content.media.media_url||undefined} className="fullAudio"/>
  {Boolean(content.segments?.length)&&<div className="passCoach"><div><strong>Replay a difficult part</strong><p>Listen again before answering. The transcript is hidden so you can practise listening for meaning.</p></div>
   <div className="rowActions">{content.segments?.slice(0,8).map((part,i)=><button key={part.id} className="button ghost smallButton" onClick={()=>playSegment(part.start_ms,part.end_ms)}>▶ Part {i+1}</button>)}</div></div>}
 </section>;
}
