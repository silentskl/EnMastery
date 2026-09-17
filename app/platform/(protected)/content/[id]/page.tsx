import { AdminContentReview } from "@/components/admin-content-review";
export default async function ReviewPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AdminContentReview id={id}/>}
