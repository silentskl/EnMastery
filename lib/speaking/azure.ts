import type { PronunciationAssessment } from "@/lib/speaking/types";

type AzureWord={Word?:string;PronunciationAssessment?:{AccuracyScore?:number;ErrorType?:string}};
type AzureBest={Display?:string;Words?:AzureWord[];PronunciationAssessment?:{AccuracyScore?:number;FluencyScore?:number;CompletenessScore?:number;ProsodyScore?:number;PronScore?:number}};
type AzureResponse={DisplayText?:string;NBest?:AzureBest[]};
function b64Utf8(text:string){const bytes=new TextEncoder().encode(text);let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);}
export async function azurePronunciationAssessment(args:{region:string;key:string;audio:ArrayBuffer;referenceText:string;language?:string}):Promise<PronunciationAssessment>{
  const params={ReferenceText:args.referenceText,GradingSystem:"HundredMark",Granularity:"Phoneme",EnableMiscue:true,EnableProsodyAssessment:true,PhonemeAlphabet:"IPA",NBestPhonemeCount:0};
  const url=`https://${encodeURIComponent(args.region)}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?format=detailed&language=${encodeURIComponent(args.language||"en-SG")}`;
  const r=await fetch(url,{method:"POST",headers:{Accept:"application/json","Content-Type":"audio/wav; codecs=audio/pcm; samplerate=16000","Ocp-Apim-Subscription-Key":args.key,"Pronunciation-Assessment":b64Utf8(JSON.stringify(params))},body:args.audio});
  const body=await r.json().catch(()=>null) as AzureResponse|null; if(!r.ok||!body) throw new Error(`Azure pronunciation assessment failed: HTTP ${r.status}`);
  const best=body.NBest?.[0]; const pa=best?.PronunciationAssessment||{}; const words=(best?.Words||[]).slice(0,150).map(w=>({word:w.Word||"",accuracy:w.PronunciationAssessment?.AccuracyScore,errorType:w.PronunciationAssessment?.ErrorType})).filter(w=>w.word);
  return {provider:"azure",transcript:best?.Display||body.DisplayText||"",accuracy:Math.round(pa.AccuracyScore||0),fluency:Math.round(pa.FluencyScore||0),completeness:Math.round(pa.CompletenessScore||0),prosody:typeof pa.ProsodyScore==="number"?Math.round(pa.ProsodyScore):null,pronunciation:Math.round(pa.PronScore||pa.AccuracyScore||0),words};
}
