import { PageIntro } from "@/components/ui";
import { SpeakingWorkspace } from "@/components/speaking-workspace";
export default function ConversationPage() {
  return <><PageIntro eyebrow="PSLE Paper 4 · Oral" title="Stimulus-Based Conversation" description="Look closely at the photograph, explain your observations, connect them to your experiences and respond naturally to follow-up questions. Feedback is for practice, not an official PSLE mark."/><SpeakingWorkspace focus="stimulus"/></>;
}
