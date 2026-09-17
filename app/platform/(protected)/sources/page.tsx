import { Suspense } from "react";
import { PageIntro } from "@/components/ui";
import { SourceContentStudio } from "@/components/source-content-studio";
export default function SourcesPage(){return <><PageIntro eyebrow="Platform · Source & Content Studio" title="Sources & content" description="Manage source catalogues and create Reading, Listening, Speaking, Writing, Cloze and Question Bank content from one workspace. Generated material remains draft-first where review is required."/><Suspense fallback={<div className="emptyState">Loading source studio…</div>}><SourceContentStudio/></Suspense></>}
