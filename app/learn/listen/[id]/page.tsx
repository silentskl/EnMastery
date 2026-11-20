import { StudentListeningPlayer } from "@/components/student-listening-player";
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <StudentListeningPlayer id={id}/>}
