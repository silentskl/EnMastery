"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSignOut } from "@/components/admin-signout";
import { TenantSignOut } from "@/components/tenant-signout";
import { DailyGameReward } from "@/components/daily-game-reward";
import { SystemClock } from "@/components/system-clock";
import { UiLanguageProvider, UiLanguageToggle, useUiLanguage } from "@/components/ui-language";
import { CurrentUserBadge } from "@/components/current-user-badge";

// V1.0.2 release markers: Sources & Content · Practice & Exams · Tenant Admin · bilingual operations UI
const studentNav = [["Home","/"],["Learn","/learn"],["Practice","/practice"],["Assignments","/assignments"],["Vocabulary","/vocabulary"],["Grammar","/grammar"],["Science","/science"],["Exam","/exam"],["Progress","/progress"]] as const;
const platformNav = [["dashboard","/platform"],["tenants","/platform/tenants"],["sourcesContent","/platform/sources"],["questions","/platform/questions"],["workQueue","/platform/jobs"],["syllabusMonitor","/platform/syllabus-monitor"],["roadmap","/platform/roadmap"],["integrations","/platform/settings/integrations"]] as const;
const tenantNav = [["dashboard","/admin"],["students","/admin/students"],["sourcesContent","/admin/sources"],["learnSettings","/admin/learn-settings"],["practiceSettings","/admin/practice-settings"],["vocabularyAdmin","/admin/vocabulary"],["questions","/admin/questions"],["practiceExams","/admin/practice"],["workQueue","/admin/jobs"],["courses","/admin/courses"],["assignments","/admin/assignments"],["aiUsage","/admin/usage"],["modelbridge","/admin/settings/integrations"]] as const;

type OpsKey = typeof platformNav[number][0] | typeof tenantNav[number][0];

function ShellInner({children}:{children:ReactNode}){
  const pathname=usePathname(),platformMode=pathname.startsWith("/platform"),tenantMode=pathname.startsWith("/admin"),login=pathname==="/platform/login"||pathname==="/admin/login";
  const {t}=useUiLanguage();
  if(login)return <div className="adminLoginShell"><main className="content">{children}</main></div>;
  const opsMode=platformMode||tenantMode;
  const home=platformMode?"/platform":tenantMode?"/admin":"/",brand=platformMode?"English Mastery Platform":tenantMode?"English Mastery Admin":"English Mastery";
  const opsNav=platformMode?platformNav:tenantNav;
  const isActive=(href:string)=>pathname===href||pathname.startsWith(`${href}/`);
  const isStudentActive=(href:string)=>href==="/"?pathname==="/":pathname===href||pathname.startsWith(`${href}/`);
  return <div className={`appShell ${opsMode?"adminMode":""}`}><aside className="sidebar"><Link className="brand" href={home}><span className="brandMark">EM</span><span>{brand}{platformMode&&<span className="brandVersion">v1.0.2</span>}</span></Link><nav className="navList">{opsMode?opsNav.map(([key,href])=><Link className={isActive(href)?"activeNav":""} key={href} href={href}>{t(key as OpsKey)}</Link>):studentNav.map(([label,href])=><Link className={isStudentActive(href)?"activeNav":""} key={href} href={href}>{label}</Link>)}</nav><div className="sidebarFoot">{platformMode?<><strong>{t("platformOperator")}</strong><span>{t("globalCurriculum")}</span><Link href="/">{t("studentView")}</Link><AdminSignOut/></>:tenantMode?<><strong>{t("tenantAdmin")}</strong><span>{t("contentStudents")}</span><Link href="/">{t("studentView")}</Link><TenantSignOut/></>:<><strong>English + Science</strong><span>English P1–S4 · Science P3–P6 · V1.0.2</span><Link href="/account">Student account</Link></>}</div></aside><div className="mainColumn"><header className="topbar"><Link className="mobileBrand" href={home}><span className="brandMark">EM</span></Link><div className="topbarRight">{opsMode&&<UiLanguageToggle/>}<SystemClock/>{!opsMode&&<DailyGameReward/>}<span className="xp">{platformMode?t("platformConsole"):tenantMode?t("adminConsole"):"Live learning"}</span><CurrentUserBadge mode={platformMode?"platform":tenantMode?"tenant":"student"}/></div></header><main className="content">{children}</main>{!opsMode&&<nav className="mobileNav">{studentNav.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav>}</div></div>;
}

export function AppShell({children}:{children:ReactNode}){
  return <UiLanguageProvider><ShellInner>{children}</ShellInner></UiLanguageProvider>;
}
