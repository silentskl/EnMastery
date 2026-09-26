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
  __emActiveVoiceCount?:number;
};
type EventfulRecognition=SpeechRecognitionLike&{addEventListener?:(type:string,listener:()=>void,options?:AddEventListenerOptions)=>void};

let cachedNative:SpeechRecognitionCtor|undefined;
let cachedWrapped:SpeechRecognitionCtor|undefined;

function studyAwareCtor(Native:SpeechRecognitionCtor):SpeechRecognitionCtor{
  if(cachedNative===Native&&cachedWrapped)return cachedWrapped;
  const Wrapped=new Proxy(Native,{
    construct(target,args){
      const rec=Reflect.construct(target,args) as EventfulRecognition;
      const nativeStart=rec.start.bind(rec);
      let live=false;
      const finish=()=>{
        if(!live)return;
        live=false;
        const w=window as SpeechWindow;
        w.__emActiveVoiceCount=Math.max(0,(w.__emActiveVoiceCount||0)-1);
      };
      rec.start=()=>{
        const w=window as SpeechWindow;
        if(!live){live=true;w.__emActiveVoiceCount=(w.__emActiveVoiceCount||0)+1}
        try{nativeStart()}catch(error){finish();throw error}
      };
      rec.addEventListener?.("end",finish,{once:false});
      rec.addEventListener?.("error",finish,{once:false});
      return rec;
    },
  }) as SpeechRecognitionCtor;
  cachedNative=Native;
  cachedWrapped=Wrapped;
  return Wrapped;
}

export function getSpeechRecognitionCtor():SpeechRecognitionCtor|undefined{
  if(typeof window==="undefined")return undefined;
  const w=window as SpeechWindow;
  const Native=w.SpeechRecognition||w.webkitSpeechRecognition;
  return Native?studyAwareCtor(Native):undefined;
}
