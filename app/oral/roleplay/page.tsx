import { PageIntro } from "@/components/ui";
import { RoleplayWorkspace } from "@/components/roleplay-workspace";
export default function RoleplayPage(){
  return <><PageIntro eyebrow="Everyday Spoken English · AI Role Play" title="Practise real-life conversations" description="Choose a situation and talk naturally with an AI character. Order food, check in at a hotel, find your way around, solve problems or try dozens of other everyday situations. There is no fixed script or question count."/><RoleplayWorkspace/></>;
}
