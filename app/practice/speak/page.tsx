import Link from "next/link";
import { SessionSetup } from "@/components/question-bank/session-setup";

export default function Page() {
  return <div className="stackForm">
    <section className="card">
      <div className="activityKicker">Speaking specialised practice</div>
      <h2>PET · Picture Description</h2>
      <p>Cambridge B1 Preliminary Speaking Part 2 practice: describe one everyday photograph for about one minute and receive PET-focused AI feedback.</p>
      <Link className="button primary" href="/practice/speak/pet">Start PET picture practice</Link>
    </section>
    <SessionSetup category="oral" mode="practice" />
  </div>;
}
