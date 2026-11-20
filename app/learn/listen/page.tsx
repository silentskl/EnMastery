import { PageIntro } from "@/components/ui";
import { StudentListeningLibrary } from "@/components/student-listening-library";
export default function ListenPage() {
  return <><PageIntro eyebrow="PSLE Paper 3 · Listening" title="Listening Comprehension" description="Practise listening twice for purpose, key details and inference, then answer comprehension questions. A full PSLE paper contains 20 multiple-choice questions; shorter lessons are skill practice."/><StudentListeningLibrary/></>;
}
