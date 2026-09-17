export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ModelBridgeTraceEvent={phase:"request"|"response"|"error";url:string;status?:number;request?:unknown;response?:unknown;raw?:string};
export interface ModelBridgeConfig { baseUrl:string;apiKey:string;model:string;trace?:(event:ModelBridgeTraceEvent)=>void|Promise<void>; }
export async function modelBridgeChat(config:ModelBridgeConfig,messages:ChatMessage[]){
  const url=`${config.baseUrl.replace(/\/$/,"")}/v1/chat/completions`,requestBody={model:config.model,messages,temperature:0.3,stream:false};
  await config.trace?.({phase:"request",url,request:requestBody});
  let response:Response;
  try{response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${config.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(requestBody)});}catch(error){await config.trace?.({phase:"error",url,response:{message:error instanceof Error?error.message:String(error)}});throw error}
  const raw=await response.text();let body:any=null;try{body=raw?JSON.parse(raw):null}catch{body=null}
  await config.trace?.({phase:response.ok?"response":"error",url,status:response.status,response:body,raw});
  if(!response.ok){const detail=body?.error?.message||body?.message||raw.slice(0,1000)||`HTTP ${response.status}`;const error=new Error(`ModelBridge request failed: ${detail}`) as Error&{details?:unknown};error.details={httpStatus:response.status,response:body??raw};throw error}
  return body;
}
