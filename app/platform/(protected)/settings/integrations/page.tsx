import { PageIntro } from "@/components/ui";
import { AdminIntegrationsSettings } from "@/components/admin-integrations-settings";
export default function Page(){return <><PageIntro eyebrow="Admin · Settings" title="Integrations & providers" description="Configure ModelBridge, YouTube and speech providers from the admin console. Secret values are encrypted at rest and are never displayed again after saving."/><AdminIntegrationsSettings/></>}
