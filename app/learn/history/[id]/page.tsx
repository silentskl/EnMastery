import{LearningTaskHistory}from"@/components/learning-task-history";
export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <LearningTaskHistory id={id}/>}
