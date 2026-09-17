import { OFFICIAL_SYLLABUS_SOURCES } from "@/lib/syllabus/sources";
import { PageIntro } from "@/components/ui";
import { SyllabusCheckButton } from "@/components/syllabus-check-button";
export default function MonitorPage(){return <><PageIntro eyebrow="Admin · Curriculum operations" title="Syllabus Monitor" description="Monitor official MOE/SEAB sources, detect material changes, assess affected skills and create reviewable content-update jobs before anything is published." action={<SyllabusCheckButton/>}/><div className="card"><div className="cardHeader"><h2>Official sources</h2><span>Default schedule · 07:00 SGT daily</span></div><table className="monitorTable"><thead><tr><th>Source</th><th>Type</th><th>Status</th><th>Last check</th></tr></thead><tbody>{OFFICIAL_SYLLABUS_SOURCES.map(s=><tr key={s.code}><td><strong>{s.title}</strong><div style={{fontSize:17,color:'var(--muted)',marginTop:3}}>{s.code}</div></td><td>{s.kind.toUpperCase()}</td><td><span className="okDot"/>Current</td><td>Pending production binding</td></tr>)}</tbody></table></div><div className="sectionTitle"><div><h2>Change workflow</h2><p>Detection never edits live learning materials directly.</p></div></div><div className="changeCard"><h3>On material change</h3><p style={{margin:'4px 0',color:'var(--muted)'}}>Create semantic diff → map affected curriculum skills → create content update jobs → notify administrators through the configured SMTP integration → human review → publish new content version.</p><div className="changeGrid"><div><span>Safety rule</span><strong>Draft-first updates</strong></div><div><span>Auditability</span><strong>Every source snapshot retained</strong></div><div><span>Notification</span><strong>SMTP notification (Platform Integrations)</strong></div></div></div><div className="sectionTitle"><div><h2>Runtime architecture</h2></div></div><div className="architecture">Cron 23:00 UTC (07:00 SGT)
   ↓
Syllabus Monitor Worker
   ├─ fetch official HTML/PDF
   ├─ SHA-256 fingerprint
   ├─ D1 snapshot/version history
   ├─ optional ModelBridge semantic impact analysis
   ├─ content_update_jobs (review required)
   └─ Verified Email (optional on Free) → administrators</div></>}
