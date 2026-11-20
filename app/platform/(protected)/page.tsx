import Link from "next/link";
import { PageIntro } from "@/components/ui";
export default function Page(){return <><PageIntro eyebrow="Platform" title="PSLE oral and listening operations" description="Only conversation, reading aloud, listening, student access and required AI/content operations remain in scope."/><div className="activityGrid adminHomeGrid">
<Link className="activityCard tone-violet" href="/platform/speaking"><div className="activityKicker">Paper 4</div><h3>Oral task library</h3><p>Publish photograph-based conversation prompts and reading passages.</p><span className="cardArrow">→</span></Link>
<Link className="activityCard tone-green" href="/platform/listening"><div className="activityKicker">Paper 3</div><h3>Listening library</h3><p>Prepare high-quality audio-based comprehension exercises.</p><span className="cardArrow">→</span></Link>
<Link className="activityCard" href="/platform/tenants"><div className="activityKicker">Administration</div><h3>Organisations</h3><p>Manage organisational access and students.</p><span className="cardArrow">→</span></Link>
<Link className="activityCard tone-amber" href="/platform/settings/integrations"><div className="activityKicker">Operations</div><h3>AI & speech services</h3><p>Configure audio, AI and feedback providers.</p><span className="cardArrow">→</span></Link>
</div></>}
