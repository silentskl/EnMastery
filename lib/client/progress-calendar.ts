"use client";

export type StudentProgressCalendar={month:string;today:string;streak:number;days:Array<{date:string;total:number;done:number;percent:number;studySeconds:number;studyMinutes:number;idleCount:number}>;requestId?:string};
type ApiError={error?:string|{code?:string;message?:string;stage?:string;requestId?:string}};
const inflight=new Map<string,Promise<StudentProgressCalendar>>();

async function load(month:string):Promise<StudentProgressCalendar>{
 const response=await fetch(`/api/student/progress/calendar?month=${encodeURIComponent(month)}`,{cache:"no-store"});
 const raw=await response.text();let body:StudentProgressCalendar|ApiError={};
 try{body=raw?JSON.parse(raw) as StudentProgressCalendar|ApiError:{}}catch{const resourceLimit=/Error\s*1102|Worker exceeded resource limits/i.test(raw);throw new Error(resourceLimit?`cloudflare_worker_1102 · Worker exceeded resource limits · HTTP ${response.status}`:`calendar: HTTP ${response.status} · non-JSON response${raw?` · ${raw.slice(0,240).replace(/\s+/g," ")}`:""}`)}
 if(!response.ok){const error=(body as ApiError).error;if(typeof error==="object"&&error)throw new Error(`${error.code||"progress_calendar_failed"} · ${error.stage||"calendar"} · ${error.message||`HTTP ${response.status}`} · request ${error.requestId||response.headers.get("X-Request-Id")||"unknown"}`);throw new Error(typeof error==="string"?error:`calendar: HTTP ${response.status}`)}
 return body as StudentProgressCalendar;
}

/** Deduplicate same-month calendar requests mounted by Learn page widgets. */
export function fetchStudentProgressCalendar(month:string){
 const existing=inflight.get(month);if(existing)return existing;
 const promise=load(month);inflight.set(month,promise);
 void promise.then(()=>setTimeout(()=>inflight.delete(month),1500),()=>setTimeout(()=>inflight.delete(month),1500));
 return promise;
}
