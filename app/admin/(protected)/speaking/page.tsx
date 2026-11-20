import { SpeakingTaskManager } from "@/components/speaking-task-manager";
import { PageIntro } from "@/components/ui";
export default function Page(){return <><PageIntro eyebrow="PSLE oral studio" title="Conversation and Reading Aloud" description="Create P5/P6 reading passages and photograph-based discussion tasks for your students."/><SpeakingTaskManager endpoint="/api/admin/speaking" tenant/></>}
