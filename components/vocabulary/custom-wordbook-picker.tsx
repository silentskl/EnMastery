"use client";
import { useEffect,useState } from "react";

type Collection={id:string;name:string;collectionType:"system"|"custom"};

export function CustomWordbookPicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const[books,setBooks]=useState<Collection[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;setLoading(true);setError("");fetch("/api/student/vocabulary/collections",{cache:"no-store"}).then(async r=>{const b=await r.json().catch(()=>({})) as {collections?:Collection[];error?:string};if(!r.ok)throw new Error(b.error||"Could not load word books");if(active)setBooks((b.collections||[]).filter(c=>c.collectionType==="custom"));}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load word books")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 return <div className="vocabSaveDestination"><label><span className="fieldLabel">Save to</span><select value={value} disabled={disabled||loading} onChange={e=>onChange(e.target.value)}><option value="">My vocabulary only</option>{books.map(book=><option key={book.id} value={book.id}>{book.name}</option>)}</select></label>{loading?<small className="muted">Loading Tenant custom word books…</small>:error?<small className="dangerText">{error}</small>:books.length?<small className="muted">Choosing a custom word book also keeps the item in My vocabulary. Tenant-managed books are shared within your organisation.</small>:<small className="muted">No custom word book is available. Ask your Tenant Admin to create one.</small>}</div>;
}
