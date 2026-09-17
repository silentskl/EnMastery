import Link from "next/link";
import { TenantRegistrationForm } from "@/components/tenant-registration-form";
export default function Page(){return <div className="adminLoginWrap"><TenantRegistrationForm/><div style={{maxWidth:760,margin:"16px auto 0"}}><Link className="button ghost" href="/admin/login">Already have a Tenant Admin account? Sign in</Link></div></div>}
