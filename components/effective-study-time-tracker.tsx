"use client";
import {useEffect,useRef} from "react";
import {usePathname} from "next/navigation";

const IDLE_MS=60_000;
const HEARTBEAT_MS=30_000;
const TICK_MS=1_000;
const STUDY_PREFIXES=["/learn","/practice","/exam","/grammar","/science","/vocabulary","/assignments"];

type StudyWindow=typeof window&{
  __emActiveMicCount?:number;
  __emActiveVoiceCount?:number;
};

function sgDate(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Singapore",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function makeSessionId(){return `study-${crypto.randomUUID().replace(/-/g,"")}`}
function mediaIsPlaying(){return [...document.querySelectorAll<HTMLMediaElement>("audio,video")].some(m=>!m.paused&&!m.ended&&m.readyState>=2)}
function voiceIsLive(){const w=window as StudyWindow;return Boolean((w.__emActiveMicCount||0)+(w.__emActiveVoiceCount||0))}
function isStudyPath(path:string){return STUDY_PREFIXES.some(prefix=>path===prefix||path.startsWith(`${prefix}/`))&&!path.startsWith("/rewards/")}

/**
 * Effective study time deliberately does NOT count the first idle minute.
 * Quiet seconds are kept pending and only committed when another genuine activity
 * arrives inside the 60-second window. If the full minute expires, the pending
 * quiet period is discarded and exactly one idle episode is recorded.
 */
export function EffectiveStudyTimeTracker(){
  const pathname=usePathname();
  const pathRef=useRef(pathname);
  const activeSeconds=useRef(0);
  const idleCount=useRef(0);
  const pendingQuietSeconds=useRef(0);
  const lastHumanActivityAt=useRef(0);
  const lastTickAt=useRef(Date.now());
  const sessionId=useRef(makeSessionId());
  const studyDate=useRef(sgDate());
  const idleEpisode=useRef(false);
  const hasEngaged=useRef(false);
  const mediaWasPlaying=useRef(false);
  const hiddenSince=useRef(0);
  const youtubePlaying=useRef(false);

  useEffect(()=>{
    const oldPath=pathRef.current;
    pathRef.current=pathname;
    if(isStudyPath(oldPath)&&!isStudyPath(pathname)){
      pendingQuietSeconds.current=0;
      lastHumanActivityAt.current=0;
      idleEpisode.current=false;
      hasEngaged.current=false;
      mediaWasPlaying.current=false;
      youtubePlaying.current=false;
    }
  },[pathname]);

  useEffect(()=>{
    const win=window as StudyWindow;
    win.__emActiveMicCount=win.__emActiveMicCount||0;
    win.__emActiveVoiceCount=win.__emActiveVoiceCount||0;

    const commitPending=()=>{
      if(pendingQuietSeconds.current>0){
        activeSeconds.current+=pendingQuietSeconds.current;
        pendingQuietSeconds.current=0;
      }
    };
    const markActivity=()=>{
      const now=Date.now();
      if(document.visibilityState!=="visible"||!isStudyPath(pathRef.current))return;
      if(lastHumanActivityAt.current>0&&!idleEpisode.current&&now-lastHumanActivityAt.current<IDLE_MS)commitPending();
      else pendingQuietSeconds.current=0;
      lastHumanActivityAt.current=now;
      hasEngaged.current=true;
      idleEpisode.current=false;
    };
    const registerIdle=()=>{
      if(!hasEngaged.current||idleEpisode.current)return;
      idleCount.current+=1;
      idleEpisode.current=true;
      pendingQuietSeconds.current=0;
    };

    const onMessage=(event:MessageEvent)=>{
      if(!/https:\/\/(www\.)?(youtube(-nocookie)?\.com)/.test(event.origin))return;
      try{
        const data=typeof event.data==="string"?JSON.parse(event.data):event.data;
        const state=data?.event==="onStateChange"?data?.info:data?.info?.playerState;
        if(state===1){youtubePlaying.current=true;hasEngaged.current=true;idleEpisode.current=false;pendingQuietSeconds.current=0}
        else if(state===0||state===2)youtubePlaying.current=false;
      }catch{}
    };
    window.addEventListener("message",onMessage);

    const pingYoutube=()=>{
      const frames=[...document.querySelectorAll<HTMLIFrameElement>('iframe[src*="youtube.com/embed"],iframe[src*="youtube-nocookie.com/embed"]')];
      if(!frames.length)youtubePlaying.current=false;
      for(const frame of frames){
        try{frame.contentWindow?.postMessage(JSON.stringify({event:"listening",id:"em-study-time"}),"*")}catch{}
      }
    };
    pingYoutube();
    const youtubePing=setInterval(pingYoutube,5_000);

    const events:[keyof DocumentEventMap,EventListenerOrEventListenerObject][]=[
      ["pointermove",markActivity],["pointerdown",markActivity],["keydown",markActivity],["input",markActivity],
      ["change",markActivity],["wheel",markActivity],["touchstart",markActivity],["selectionchange",markActivity],
    ];
    for(const[e,h]of events)document.addEventListener(e,h,{passive:true,capture:true});

    const mediaDevices=navigator.mediaDevices;
    const originalGetUserMedia=mediaDevices?.getUserMedia?.bind(mediaDevices);
    if(mediaDevices&&originalGetUserMedia){
      try{
        mediaDevices.getUserMedia=(async(constraints:MediaStreamConstraints)=>{
          const stream=await originalGetUserMedia(constraints);
          if(stream.getAudioTracks().length){
            win.__emActiveMicCount=(win.__emActiveMicCount||0)+1;
            markActivity();
            let closed=false;
            const close=()=>{
              if(closed)return;
              closed=true;
              win.__emActiveMicCount=Math.max(0,(win.__emActiveMicCount||0)-1);
            };
            for(const track of stream.getAudioTracks())track.addEventListener("ended",close,{once:true});
          }
          return stream;
        }) as typeof mediaDevices.getUserMedia;
      }catch{}
    }

    const flush=(keepalive=false)=>{
      if(!sessionId.current||(activeSeconds.current<=0&&idleCount.current<=0))return;
      void fetch("/api/student/study-time",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          sessionId:sessionId.current,
          activeSeconds:Math.floor(activeSeconds.current),
          idleCount:idleCount.current,
          path:pathRef.current,
          studyDate:studyDate.current,
        }),
        keepalive,
        cache:"no-store",
      }).catch(()=>undefined);
    };

    const tick=setInterval(()=>{
      const now=Date.now();
      const today=sgDate();
      if(today!==studyDate.current){
        flush(true);
        studyDate.current=today;
        sessionId.current=makeSessionId();
        activeSeconds.current=0;
        idleCount.current=0;
        pendingQuietSeconds.current=0;
        lastHumanActivityAt.current=0;
        lastTickAt.current=now;
        idleEpisode.current=false;
        hasEngaged.current=false;
        mediaWasPlaying.current=false;
        hiddenSince.current=0;
        return;
      }

      const elapsed=Math.max(0,Math.min(2,(now-lastTickAt.current)/1000));
      lastTickAt.current=now;
      if(!isStudyPath(pathRef.current))return;

      const mediaActive=mediaIsPlaying()||voiceIsLive()||youtubePlaying.current;
      if(mediaActive){
        // Explicit learning media/voice activity is valid study even without mouse movement.
        activeSeconds.current+=elapsed;
        hasEngaged.current=true;
        idleEpisode.current=false;
        pendingQuietSeconds.current=0;
        mediaWasPlaying.current=true;
        return;
      }

      if(mediaWasPlaying.current){
        mediaWasPlaying.current=false;
        lastHumanActivityAt.current=now;
        pendingQuietSeconds.current=0;
      }
      if(document.visibilityState!=="visible"||lastHumanActivityAt.current<=0||idleEpisode.current)return;

      const quietMs=now-lastHumanActivityAt.current;
      if(quietMs<IDLE_MS){
        pendingQuietSeconds.current+=elapsed;
      }else{
        registerIdle();
      }
    },TICK_MS);

    const heartbeat=setInterval(()=>flush(false),HEARTBEAT_MS);
    const onVisibility=()=>{
      const now=Date.now();
      if(document.visibilityState==="hidden"){
        hiddenSince.current=now;
        pendingQuietSeconds.current=0;
        flush(true);
      }else{
        if(hiddenSince.current&&now-hiddenSince.current>=IDLE_MS&&isStudyPath(pathRef.current)&&hasEngaged.current&&!mediaIsPlaying()&&!voiceIsLive()&&!youtubePlaying.current)registerIdle();
        hiddenSince.current=0;
        lastHumanActivityAt.current=0;
        pendingQuietSeconds.current=0;
        lastTickAt.current=now;
      }
    };
    document.addEventListener("visibilitychange",onVisibility);
    const onPageHide=()=>flush(true);
    window.addEventListener("pagehide",onPageHide);

    return()=>{
      clearInterval(tick);
      clearInterval(heartbeat);
      clearInterval(youtubePing);
      flush(true);
      document.removeEventListener("visibilitychange",onVisibility);
      window.removeEventListener("pagehide",onPageHide);
      window.removeEventListener("message",onMessage);
      for(const[e,h]of events)document.removeEventListener(e,h,{capture:true} as EventListenerOptions);
      if(mediaDevices&&originalGetUserMedia){try{mediaDevices.getUserMedia=originalGetUserMedia}catch{}}
    };
  },[]);

  return null;
}
