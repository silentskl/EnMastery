import Link from "next/link";
import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="pageIntro"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}

export function ProgressBar({ value }: { value: number }) {
  return <div className="bar" aria-label={`${value}%`}><span style={{ width: `${value}%` }} /></div>;
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="statCard"><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

export function ActivityCard({ href, kicker, title, description, meta, tone="blue" }: { href: string; kicker: string; title: string; description: string; meta?: string; tone?: string }) {
  return <Link href={href} className={`activityCard tone-${tone}`}><div className="activityKicker">{kicker}</div><h3>{title}</h3><p>{description}</p>{meta && <span className="activityMeta">{meta}</span>}<span className="cardArrow">→</span></Link>;
}
