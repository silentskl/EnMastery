import Link from "next/link";
import { PageIntro } from "@/components/ui";
import { StudentPlan } from "@/components/student-plan";
import { LearningProgressCalendar } from "@/components/learning-progress-calendar";
import { LearningMomentum } from "@/components/learning-momentum";
export default function LearnPage(){return <><PageIntro eyebrow="Learn" title="Today’s mission and your learning record." description="Complete each assigned skill once, pass its mastery gate, and track your real progress day by day."/><div className="sectionTitle"><div><h2>Today&apos;s learning mission</h2><p>This is the single daily task list. Completing the same lesson from its library automatically marks the matching Today task done.</p></div><Link className="button ghost" href="/plan">View week</Link></div><StudentPlan compact/><LearningMomentum/><LearningProgressCalendar/></>}
