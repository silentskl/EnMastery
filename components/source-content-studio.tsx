"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AdminSourceManager } from "@/components/admin-source-manager";
import { AdminListeningManager } from "@/components/admin-listening-manager";
import { AdminOwnedListening } from "@/components/admin-owned-listening";
import { TenantOwnedListening } from "@/components/tenant-owned-listening";
import { SpeakingTaskManager } from "@/components/speaking-task-manager";
import { AdminWritingManager } from "@/components/admin-writing-manager";
import { QuestionBankAdmin } from "@/components/question-bank/admin-bank";
import { TenantSourceManager } from "@/components/tenant-source-manager";
import { TenantListeningManager } from "@/components/tenant-listening-manager";
import { TenantWritingManager } from "@/components/tenant-writing-manager";
import { TenantQuestionBank } from "@/components/question-bank/tenant-bank";
import { useUiLanguage } from "@/components/ui-language";
import { ReadingLessonLibrary } from "@/components/reading-lesson-library";
import { ReferenceSourcePanel } from "@/components/reference-source-panel";
import { UnifiedContentLibrary } from "@/components/unified-content-library";

// R27: source-first workspace + per-domain libraries + unified moderation library.
type Tab = "reading" | "listening" | "speaking" | "writing" | "cloze" | "question-bank" | "library";
const tabs: Array<{id:Tab; label:string; hint:string}> = [
  { id:"reading", label:"Reading", hint:"Sources · lesson library" },
  { id:"listening", label:"Listening", hint:"YouTube / podcast · lesson library" },
  { id:"speaking", label:"Speaking", hint:"Sources · speaking library" },
  { id:"writing", label:"Writing", hint:"Sources · writing library" },
  { id:"cloze", label:"Cloze", hint:"Sources · cloze library" },
  { id:"question-bank", label:"Question Bank", hint:"Sources · question library" },
  { id:"library", label:"Content Library", hint:"Review · publish · take offline" },
];
function selectedTab(value:string|null):Tab {return tabs.some(x=>x.id===value) ? value as Tab : "reading";}
export function SourceContentStudio({tenant=false}:{tenant?:boolean}) {
  const params=useSearchParams(),router=useRouter(),pathname=usePathname();
  const {t,language}=useUiLanguage();
  const active=selectedTab(params.get("tab"));
  function switchTab(tab:Tab){const p=new URLSearchParams(params.toString());p.set("tab",tab);router.replace(`${pathname}?${p.toString()}`,{scroll:false});}
  const zh:Record<Tab,[string,string]>={reading:["阅读","来源 · 课程库"],listening:["听力","YouTube / 播客 · 课程库"],speaking:["口语","来源 · 口语库"],writing:["写作","来源 · 写作库"],cloze:["完形填空","来源 · 完形库"],"question-bank":["题库","来源 · 题目库"],library:["内容库","审核 · 发布 · 下线"]};
  return <>
    <section className="card sourceStudioToolbar">
      <div className="cardHeader"><div><h2>{t("sourceWorkspace")}</h2><div className="tableSub">{t("sourceWorkspaceDesc")}</div></div><span>{tenant?t("tenantCatalogue"):t("platformCatalogue")}</span></div>
      <div className="tabs sourceStudioTabs">{tabs.map(tab=>{const text=language==="zh-CN"?zh[tab.id]:[tab.label,tab.hint];return <button type="button" key={tab.id} className={active===tab.id?"active":""} onClick={()=>switchTab(tab.id)}><strong>{text[0]}</strong><small style={{display:"block"}}>{text[1]}</small></button>})}</div>
    </section>
    {active==="reading" && <>{tenant?<TenantSourceManager domain="reading"/>:<AdminSourceManager domain="reading"/>}<ReadingLessonLibrary tenant={tenant}/></>}
    {active==="listening" && <>{tenant?<TenantListeningManager/>:<AdminListeningManager/>}<div className="sectionTitle" style={{marginTop:24}}><div><h2>{t("ownedAudio")}</h2><p>{t("ownedAudioDesc")}</p></div></div>{tenant?<TenantOwnedListening/>:<AdminOwnedListening/>}</>}
    {active==="speaking" && <><ReferenceSourcePanel tenant={tenant} category="oral" title="Speaking curriculum & assessment references"/>{tenant?<TenantSourceManager domain="speaking"/>:<AdminSourceManager domain="speaking"/>}<SpeakingTaskManager endpoint={tenant?"/api/admin/speaking":"/api/platform/speaking"} tenant={tenant}/></>}
    {active==="writing" && <><ReferenceSourcePanel tenant={tenant} category="writing" title="Writing curriculum & assessment references"/>{tenant?<TenantSourceManager domain="writing"/>:<AdminSourceManager domain="writing"/>}{tenant?<TenantWritingManager/>:<AdminWritingManager/>}</>}
    {active==="cloze" && <>{tenant?<TenantSourceManager domain="cloze"/>:<AdminSourceManager domain="cloze"/>}{tenant?<TenantQuestionBank key="cloze" mode="cloze"/>:<QuestionBankAdmin key="cloze" mode="cloze"/>}</>}
    {active==="question-bank" && <>{tenant?<TenantQuestionBank key="questions" mode="questions"/>:<QuestionBankAdmin key="questions" mode="questions"/>}</>}
    {active==="library" && <UnifiedContentLibrary tenant={tenant}/>} 
  </>;
}
