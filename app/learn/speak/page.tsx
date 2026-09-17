import { PageIntro } from "@/components/ui";
import { SpeakingWorkspace } from "@/components/speaking-workspace";
export default function SpeakPage(){return <><PageIntro eyebrow="Speak · Live" title="Speak first. Improve after the idea." description="AI conversation now runs STT → ModelBridge → TTS. Reading Aloud uses acoustic pronunciation assessment when Azure Speech is configured, with a free recognition-based practice fallback."/><SpeakingWorkspace/></>}
