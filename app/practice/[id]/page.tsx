import{PracticeSet}from"@/components/paper2/practice-set";export default async function Page({params}:{params:Promise<{id:string}>}){const{id}=await params;return <PracticeSet id={id}/>}
