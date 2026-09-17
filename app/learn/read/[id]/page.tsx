"use client";
import {useParams} from "next/navigation";
import {StudentReader} from "@/components/student-reader";

/** Client shell keeps dynamic Reading navigation lightweight on Cloudflare Workers. */
export default function ReadingLessonPage(){
  const params=useParams<{id:string|string[]}>();
  const raw=params?.id,id=Array.isArray(raw)?raw[0]:raw;
  return id?<StudentReader id={id}/>:<div className="emptyState">Loading lesson…</div>;
}
