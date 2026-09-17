import { StudentListeningPlayer } from "@/components/student-listening-player";
export default async function ListeningLessonPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{practice?:string}>}){const{id}=await params,q=await searchParams;return <StudentListeningPlayer id={id} practiceMode={q.practice==="1"}/>}
