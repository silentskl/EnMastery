import { SpeakingTaskManager } from "@/components/speaking-task-manager";
import { PageIntro } from "@/components/ui";
export default function Page(){return <><PageIntro eyebrow="Global PSLE oral" title="Conversation and Reading Aloud" description="Publish curriculum-aligned oral practice for all organisations."/><SpeakingTaskManager endpoint="/api/platform/speaking"/></>}
