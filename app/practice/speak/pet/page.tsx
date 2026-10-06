import { PageIntro } from "@/components/ui";
import { SpeakingWorkspace } from "@/components/speaking-workspace";

export default function PetSpeakingPracticePage() {
  return <>
    <PageIntro
      eyebrow="Speaking · PET"
      title="B1 Preliminary Picture Description"
      description="Practise Speaking Part 2 with everyday photographs. Speak for about one minute, describe what you can see, and receive PET-focused feedback on task coverage, discourse, grammar, vocabulary and fluency."
    />
    <SpeakingWorkspace initialTrack="pet" />
  </>;
}
