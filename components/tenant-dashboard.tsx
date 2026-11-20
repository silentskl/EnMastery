import Link from "next/link";
export function TenantDashboard(){return <>
  <div className="sectionHeading"><div><span>PSLE English · Organisation</span><h1>Oral and listening studio</h1><p>Manage students, publish PSLE-style speaking prompts and listening comprehension lessons, and configure the speech and AI services.</p></div></div>
  <div className="activityGrid adminHomeGrid">
    <Link className="activityCard tone-violet" href="/admin/speaking"><div className="activityKicker">Paper 4</div><h3>Oral tasks</h3><p>Photograph-based conversations and Reading Aloud passages.</p><span className="cardArrow">→</span></Link>
    <Link className="activityCard tone-green" href="/admin/listening"><div className="activityKicker">Paper 3</div><h3>Listening library</h3><p>Upload or curate audio and associated comprehension questions.</p><span className="cardArrow">→</span></Link>
    <Link className="activityCard" href="/admin/students"><div className="activityKicker">Access</div><h3>Students</h3><p>Manage the accounts used to record practice.</p><span className="cardArrow">→</span></Link>
    <Link className="activityCard tone-amber" href="/admin/settings/integrations"><div className="activityKicker">Speech & AI</div><h3>Integrations</h3><p>Configure ModelBridge, speech recognition and pronunciation assessment.</p><span className="cardArrow">→</span></Link>
  </div>
</>}
