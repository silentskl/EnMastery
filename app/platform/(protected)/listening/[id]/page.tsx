import { AdminListeningReview } from "@/components/admin-listening-review";
export default async function AdminListeningReviewPage({params}:{params:Promise<{id:string}>}){const{id}=await params;return <AdminListeningReview id={id}/>}
