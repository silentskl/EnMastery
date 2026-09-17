export async function modelBridgeTranscribe(args:{baseUrl:string;apiKey:string;model:string;audio:Blob;filename?:string;language?:string}){
  const form=new FormData(); form.append("file",args.audio,args.filename||"speech.webm"); form.append("model",args.model); if(args.language) form.append("language",args.language);
  const r=await fetch(`${args.baseUrl.replace(/\/$/,"")}/v1/audio/transcriptions`,{method:"POST",headers:{Authorization:`Bearer ${args.apiKey}`},body:form});
  const body=await r.json().catch(()=>null) as {text?:unknown;error?:{message?:unknown};message?:unknown}|null;
  if(!r.ok) throw new Error(typeof body?.error?.message==="string"?body.error.message:typeof body?.message==="string"?body.message:`STT HTTP ${r.status}`);
  const text=typeof body?.text==="string"?body.text.trim():""; if(!text) throw new Error("STT returned no transcript"); return text;
}

export async function modelBridgeSpeech(args:{baseUrl:string;apiKey:string;model:string;voice:string;text:string}){
  const r=await fetch(`${args.baseUrl.replace(/\/$/,"")}/v1/audio/speech`,{method:"POST",headers:{Authorization:`Bearer ${args.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:args.model,voice:args.voice,input:args.text,response_format:"mp3"})});
  if(!r.ok){const t=await r.text().catch(()=>"");throw new Error(`TTS HTTP ${r.status}${t?`: ${t.slice(0,200)}`:""}`);} return await r.arrayBuffer();
}
