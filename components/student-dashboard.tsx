import Link from "next/link";
const modules = [
  { href:"/oral/conversation", kicker:"Paper 4 · Oral", title:"Stimulus-Based Conversation", description:"Respond to a photograph, share personal experiences and explain your opinions. Practise examiner-style follow-up questions.", detail:"25 marks · PSLE-style practice", tone:"tone-violet" },
  { href:"/oral/roleplay", kicker:"Everyday English · AI Dialogue", title:"Real-Life Role Play", description:"Choose from 105 everyday situations: ordering food, hotel check-in, transport, school, shopping, community services and more. Chat naturally with an AI character.", detail:"105 situations · open-ended speaking", tone:"tone-violet" },
  { href:"/oral/reading-aloud", kicker:"Paper 4 · Oral", title:"Reading Aloud", description:"Read a short passage for its purpose and audience. Record yourself and receive feedback on pronunciation, fluency and expression.", detail:"15 marks · PSLE-style practice", tone:"tone-amber" },
  { href:"/learn/listen", kicker:"Paper 3 · Listening", title:"Listening Comprehension", description:"Listen carefully, replay and answer comprehension questions about details, sequence, purpose and inference.", detail:"20 marks · PSLE-style practice", tone:"tone-green" },
] as const;
export function StudentDashboard() {
  return <>
    <section className="hero"><div>
      <div className="eyebrow" style={{color:"#b8c7ff"}}>Singapore Primary 5–6 · English</div>
      <h1>Speak confidently in real-life situations, describe pictures, read aloud and listen.</h1>
      <p>PSLE-style oral and listening practice, plus everyday English role-play. Listen closely, speak naturally and improve with specific feedback after each session.</p>
    </div><div className="heroScore"><div className="scoreBox"><span>Focus</span><strong>PSLE</strong></div><div className="scoreBox"><span>Skills</span><strong>04</strong></div></div></section>
    <div className="sectionTitle"><div><h2>Choose a skill to practise</h2><p>Real exam tasks inspire our practice. Feedback scores are learning indicators, not official SEAB grades.</p></div></div>
    <div className="activityGrid">{modules.map(item =>
      <Link href={item.href} className={"activityCard " + item.tone} key={item.href}>
        <div className="activityKicker">{item.kicker}</div><h3>{item.title}</h3><p>{item.description}</p><span className="sourceHint">{item.detail}</span><span className="cardArrow">→</span>
      </Link>
    )}</div>
    <section className="card" style={{marginTop:24}}>
      <div className="cardHeader"><h2>How to practise</h2><span>30 minutes every day</span></div>
      <p>Complete at least 30 minutes of active study every Singapore day: one picture-based Conversation, one everyday Role Play, two assessed Reading Aloud recordings and one complete Listening lesson. Your daily progress is shown above and persists across refreshes. Time alone is not enough: finish all five activities too. Everyday role-play is not an official PSLE examination component.</p>
      <div className="rowActions"><Link className="button primary" href="/oral/conversation">Start conversation</Link><Link className="button secondary" href="/account">Student account</Link></div>
    </section>
  </>;
}
