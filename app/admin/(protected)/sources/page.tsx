import { Suspense } from "react";
import { SourceContentStudio } from "@/components/source-content-studio";
export default function Page(){return <><div className="sectionHeading"><div><span>Tenant Admin · Source & Content Studio</span><h1>Sources & content</h1><p>Use platform-approved sources and create tenant-private Reading, Listening, Speaking, Writing, Cloze and Question Bank material from one workspace.</p></div></div><Suspense fallback={<div className="emptyState">Loading source studio…</div>}><SourceContentStudio tenant/></Suspense></>}
