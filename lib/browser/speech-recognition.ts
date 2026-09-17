export type SpeechRecognitionEventLike={
  resultIndex?:number;
  results:{length:number;[index:number]:{0:{transcript:string};isFinal:boolean}};
};
export type SpeechRecognitionLike={
  lang:string;
  interimResults:boolean;
  continuous:boolean;
  onresult:((e:SpeechRecognitionEventLike)=>void)|null;
  onerror:((e:unknown)=>void)|null;
  onend:(()=>void)|null;
  start:()=>void;
  stop:()=>void;
};
export type SpeechRecognitionCtor=new()=>SpeechRecognitionLike;

type SpeechWindow=Window&{
  webkitSpeechRecognition?:SpeechRecognitionCtor;
  SpeechRecognition?:SpeechRecognitionCtor;
};

export function getSpeechRecognitionCtor():SpeechRecognitionCtor|undefined{
  if(typeof window==="undefined")return undefined;
  const w=window as SpeechWindow;
  return w.SpeechRecognition||w.webkitSpeechRecognition;
}
