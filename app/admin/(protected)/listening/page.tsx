import Link from "next/link";
import { TenantListeningManager } from "@/components/tenant-listening-manager";
import { PageIntro } from "@/components/ui";
export default function Page(){return <><PageIntro eyebrow="PSLE listening studio" title="Listening content and practice" description="Create and publish P5/P6 audio comprehension with well-grounded questions. Owned audio is recommended for repeatable listening practice."/><div className="rowActions" style={{marginBottom:20}}><Link className="button primary" href="/admin/listening/owned">Upload owned audio</Link></div><TenantListeningManager/></>}
