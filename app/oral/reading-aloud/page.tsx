import { PageIntro } from "@/components/ui";
import { SpeakingWorkspace } from "@/components/speaking-workspace";
export default function ReadingAloudPage() {
  return <><PageIntro eyebrow="PSLE Paper 4 · Oral" title="Reading Aloud" description="Understand the given situation and intended audience. Read naturally with clear pronunciation, meaningful pauses and expression. Acoustic scoring needs Azure Speech; fallback scores are approximate."/><SpeakingWorkspace focus="reading_aloud"/></>;
}
