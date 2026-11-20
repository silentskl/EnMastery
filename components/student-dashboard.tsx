import Link from "next/link";
const modules = [
  { href:"/oral/conversation", kicker:"Paper 4 · Oral", title:"Stimulus-Based Conversation", description:"Respond to a photograph, share personal experiences and explain your opinions. Practise examiner-style follow-up questions.", detail:"25 marks · PSLE-style practice", tone:"tone-violet" },
  { href:"/oral/reading-aloud", kicker:"Paper 4 · Oral", title:"Reading Aloud", description:"Read a short passage for its purpose and audience. Record yourself and receive feedback on pronunciation, fluency and expression.", detail:"15 marks · PSLE-style practice", tone:"tone-amber" },
  { href:"/learn/listen", kicker:"Paper 3 · Listening", title:"Listening Comprehension", description:"Listen carefully, replay and answer comprehension questions about details, sequence, purpose and inference.", detail:"20 marks · PSLE-style practice", tone:"tone-green" },
] as const;
export function StudentDashboard() {
  return <>
    <section className="hero"><div>
      <div className="eyebrow" style={{color:"#b8c7ff"}}>Singapore Primary 5–6 · English</div>
      <h1>Build confidence in speaking, reading aloud and listening.</h1>
      <p>Three focused PSLE practice areas. Listen closely, speak in complete ideas and improve with specific feedback after every attempt.</p>
    </div><div className="heroScore"><div className="scoreBox"><span>Focus</span><strong>PSLE</strong></div><div className="scoreBox"><span>Skills</span><strong>03</strong></div></div></section>
    <div className="sectionTitle"><div><h2>Choose a skill to practise</h2><p>Real exam tasks inspire our practice. Feedback scores are learning indicators, not official SEAB grades.</p></div></div>
    <div className="activityGrid">{modules.map(item =>
      <Link href={item.href} className={"activityCard " + item.tone} key={item.href}>
        <div className="activityKicker">{item.kicker}</div><h3>{item.title}</h3><p>{item.description}</p><span className="sourceHint">{item.detail}</span><span className="cardArrow">→</span>
      </Link>
    )}</div>
    <section className="card" style={{marginTop:24}}>
      <div className="cardHeader"><h2>How to practise</h2><span>10–15 minutes a day</span></div>
      <p>Try one conversation, one reading passage and one listening activity. Listen to the feedback, repeat the difficult part and build a steady habit.</p>
      <div className="rowActions"><Link className="button primary" href="/oral/conversation">Start conversation</Link><Link className="button secondary" href="/account">Student account</Link></div>
    </section>
  </>;
}
