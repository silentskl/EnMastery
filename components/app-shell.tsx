"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminSignOut } from "@/components/admin-signout";
import { TenantSignOut } from "@/components/tenant-signout";
import { SystemClock } from "@/components/system-clock";
import { UiLanguageProvider, UiLanguageToggle } from "@/components/ui-language";
import { CurrentUserBadge } from "@/components/current-user-badge";

const studentNav = [
  ["Home", "/"], ["Conversation", "/oral/conversation"],
  ["Role Play", "/oral/roleplay"], ["Reading Aloud", "/oral/reading-aloud"], ["Listening", "/learn/listen"],
] as const;
const platformNav = [
  ["Overview", "/platform"], ["Organisations", "/platform/tenants"],
  ["Oral tasks", "/platform/speaking"], ["Listening library", "/platform/listening"],
  ["Jobs", "/platform/jobs"], ["AI settings", "/platform/settings/integrations"],
] as const;
const tenantNav = [
  ["Overview", "/admin"], ["Students", "/admin/students"],
  ["Oral tasks", "/admin/speaking"], ["Listening library", "/admin/listening"],
  ["Jobs", "/admin/jobs"], ["AI settings", "/admin/settings/integrations"],
] as const;

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const platformMode = pathname.startsWith("/platform");
  const tenantMode = pathname.startsWith("/admin");
  const opsMode = platformMode || tenantMode;
  const login = ["/platform/login", "/admin/login"].includes(pathname);
  const home = platformMode ? "/platform" : tenantMode ? "/admin" : "/";
  const nav = platformMode ? platformNav : tenantMode ? tenantNav : studentNav;
  const brand = platformMode ? "PSLE Platform" : tenantMode ? "PSLE Admin" : "EnMastery · PSLE";
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  if (login) return <div className="adminLoginShell"><main className="content">{children}</main></div>;
  return <div className={"appShell " + (opsMode ? "adminMode" : "")}>
    <aside className="sidebar">
      <Link className="brand" href={home}><span className="brandMark">EM</span><span>{brand}</span></Link>
      <nav className="navList" aria-label="Main navigation">
        {nav.map(([label, href]) => <Link key={href} href={href} className={active(href) ? "activeNav" : ""}>{label}</Link>)}
      </nav>
      <div className="sidebarFoot">
        {platformMode ? <><strong>PSLE content administration</strong><Link href="/">Student view</Link><AdminSignOut/></>
        : tenantMode ? <><strong>Oral and listening only</strong><Link href="/">Student view</Link><TenantSignOut/></>
        : <><strong>Singapore Primary 5–6</strong><span>Picture Talk · Role Play · Reading Aloud · Listening</span><Link href="/account">Student account</Link></>}
      </div>
    </aside>
    <div className="mainColumn">
      <header className="topbar">
        <Link className="mobileBrand" href={home}><span className="brandMark">EM</span></Link>
        <div className="topbarRight">{opsMode && <UiLanguageToggle/>}<SystemClock/><span className="xp">PSLE English</span><CurrentUserBadge mode={platformMode ? "platform" : tenantMode ? "tenant" : "student"}/></div>
      </header>
      <main className="content">{children}</main>
      {!opsMode && <nav className="mobileNav" aria-label="Mobile navigation">{studentNav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>}
    </div>
  </div>;
}
export function AppShell({children}:{children:ReactNode}) {
  return <UiLanguageProvider><ShellInner>{children}</ShellInner></UiLanguageProvider>;
}
