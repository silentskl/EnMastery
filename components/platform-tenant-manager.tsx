"use client";
import{useEffect,useState}from"react";

type Tenant={
  id:string;slug:string;name:string;status:string;plan:string;
  student_count:number;course_count:number;assignment_count:number;
  ai_request_quota_monthly:number|null;admin_email:string|null;admin_name:string|null;admin_login_ready:number;
};
type ApiError={error?:string};

export function PlatformTenantManager(){
  const[list,setList]=useState<Tenant[]>([]),[status,setStatus]=useState(""),
    [form,setForm]=useState({name:"",slug:"",plan:"standard",adminName:"",adminEmail:"",adminPassword:"",aiRequestQuota:"5000"}),
    [adminTenant,setAdminTenant]=useState<Tenant|null>(null),
    [adminForm,setAdminForm]=useState({displayName:"",email:"",password:""}),
    [adminStatus,setAdminStatus]=useState("");
  async function load(){const response=await fetch("/api/platform/tenants");const body=await response.json() as {tenants?:Tenant[]};setList(body.tenants||[]);}
  useEffect(()=>{void load()},[]);
  async function create(e:React.FormEvent){
    e.preventDefault();setStatus("Creating tenant…");
    const response=await fetch("/api/platform/tenants",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    const body=await response.json().catch(()=>({})) as ApiError;setStatus(response.ok?"Tenant created.":body.error||"Create failed");
    if(response.ok){setForm({...form,name:"",slug:"",adminName:"",adminEmail:"",adminPassword:"",aiRequestQuota:"5000"});await load();}
  }
  async function state(id:string,value:string){
    const response=await fetch(`/api/platform/tenants/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:value})});
    const body=await response.json().catch(()=>({})) as ApiError;if(!response.ok)setStatus(body.error||"Tenant update failed");await load();
  }
  function openAdmin(tenant:Tenant){setAdminTenant(tenant);setAdminForm({displayName:tenant.admin_name||"Admin",email:tenant.admin_email||"",password:""});setAdminStatus("");}
  async function saveAdmin(e:React.FormEvent){
    e.preventDefault();if(!adminTenant)return;setAdminStatus("Saving Tenant Admin…");
    const response=await fetch(`/api/platform/tenants/${adminTenant.id}/admin`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(adminForm)});
    const body=await response.json().catch(()=>({})) as ApiError;
    setAdminStatus(response.ok?`Admin ready. Sign in with tenant slug “${adminTenant.slug}”.`:body.error||"Could not set Tenant Admin");
    if(response.ok){setAdminForm(v=>({...v,password:""}));await load();}
  }
  return <>
    <div className="sectionHeading"><div><span>Partners</span><h1>Tenants</h1><p>Each tenant is one partner workspace with one Tenant Admin account and its Students. Tenant Admin accounts are managed only here by Platform Admin.</p></div></div>
    <form className="panel tenantForm" onSubmit={create}><h3>Create tenant</h3><div className="formGrid">
      <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></label>
      <label>Slug<input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="auto from name"/></label>
      <label>Plan<input value={form.plan} onChange={e=>setForm({...form,plan:e.target.value})}/></label>
      <label>Monthly AI request quota<input type="number" min="0" value={form.aiRequestQuota} onChange={e=>setForm({...form,aiRequestQuota:e.target.value})}/></label>
      <label>Tenant Admin name<input value={form.adminName} onChange={e=>setForm({...form,adminName:e.target.value})}/></label>
      <label>Tenant Admin email<input type="email" value={form.adminEmail} onChange={e=>setForm({...form,adminEmail:e.target.value})}/></label>
      <label>Tenant Admin password<input type="password" minLength={8} value={form.adminPassword} onChange={e=>setForm({...form,adminPassword:e.target.value})}/></label>
    </div><button className="button primary" type="submit">Create tenant</button>{status&&<span className="formStatus">{status}</span>}</form>
    {adminTenant&&<form className="panel tenantForm" onSubmit={saveAdmin}>
      <div className="cardHeader"><div><h3>Tenant Admin · {adminTenant.name}</h3><div className="tableSub">Login: /admin/login · Tenant slug: <strong>{adminTenant.slug}</strong></div></div><button type="button" className="button ghost small" onClick={()=>setAdminTenant(null)}>Close</button></div>
      <div className="notice">Set or reset the single Admin account for this tenant. Replacing it immediately removes the previous account&apos;s Tenant Admin access.</div>
      <div className="formGrid" style={{marginTop:12}}>
        <label>Admin name<input required value={adminForm.displayName} onChange={e=>setAdminForm({...adminForm,displayName:e.target.value})}/></label>
        <label>Admin email<input type="email" required value={adminForm.email} onChange={e=>setAdminForm({...adminForm,email:e.target.value})}/></label>
        <label>New password<input type="password" minLength={8} required value={adminForm.password} onChange={e=>setAdminForm({...adminForm,password:e.target.value})} placeholder="Minimum 8 characters"/></label>
      </div>
      <button className="button primary" type="submit">Set / reset Tenant Admin</button>{adminStatus&&<span className="formStatus">{adminStatus}</span>}
    </form>}
    <div className="tableWrap"><table className="dataTable"><thead><tr><th>Tenant</th><th>Status</th><th>Admin login</th><th>Students</th><th>Courses</th><th>Assignments</th><th>AI quota/mo</th><th>Action</th></tr></thead><tbody>{list.map(t=><tr key={t.id}>
      <td><strong>{t.name}</strong><div className="muted">{t.slug}</div></td><td>{t.status}</td>
      <td>{t.admin_login_ready>0?<><strong>Ready</strong><div className="muted">{t.admin_email}</div></>:<><strong>Needs setup</strong><div className="muted">No Tenant Admin credential</div></>}</td>
      <td>{t.student_count}</td><td>{t.course_count}</td><td>{t.assignment_count}</td><td>{t.ai_request_quota_monthly??"Unlimited"}</td>
      <td><div className="rowActions"><button type="button" className="button secondary small" onClick={()=>openAdmin(t)}>Set / reset Admin</button>{t.id!=="tenant-default"&&<button type="button" className="button secondary small" onClick={()=>state(t.id,t.status==="active"?"suspended":"active")}>{t.status==="active"?"Suspend":"Activate"}</button>}</div></td>
    </tr>)}</tbody></table></div>
  </>;
}
