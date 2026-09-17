import { sendNotificationEmail } from "@/lib/notifications/email";

type MailRuntime=Parameters<typeof sendNotificationEmail>[0];
function escapeHtml(v:string){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]||c));}

export async function sendTenantWelcomeEmail(env:MailRuntime,args:{to:string;tenantName:string;tenantSlug:string;adminEmail:string;origin:string}){
  const loginUrl=`${args.origin.replace(/\/$/,"")}/admin/login`;
  return sendNotificationEmail(env,{
    to:args.to,
    subject:`Welcome to English Mastery — ${args.tenantName}`,
    text:`Welcome to English Mastery.\n\nYour organisation is ready.\nOrganisation: ${args.tenantName}\nTenant slug: ${args.tenantSlug}\nAdmin email: ${args.adminEmail}\n\nTenant Admin login: ${loginUrl}\n\nNext, open Admin → Settings → Integrations to configure your Tenant ModelBridge API key, then create student accounts.\n\nFor security, this email does not contain your password.`,
    html:`<h2>Welcome to English Mastery</h2><p>Your organisation is ready.</p><p><strong>Organisation:</strong> ${escapeHtml(args.tenantName)}<br/><strong>Tenant slug:</strong> <code>${escapeHtml(args.tenantSlug)}</code><br/><strong>Admin email:</strong> ${escapeHtml(args.adminEmail)}</p><p><a href="${escapeHtml(loginUrl)}">Open Tenant Admin sign in</a></p><p>Next, open <strong>Admin → Settings → Integrations</strong> to configure your Tenant ModelBridge API key, then create student accounts.</p><p>For security, this email does not contain your password.</p>`
  });
}

export async function sendTenantPasswordResetEmail(env:MailRuntime,args:{to:string;tenantName:string;tenantSlug:string;resetUrl:string}){
  return sendNotificationEmail(env,{
    to:args.to,
    subject:"Reset your English Mastery password",
    text:`A password reset was requested for ${args.tenantName} (${args.tenantSlug}).\n\nReset your password within 30 minutes:\n${args.resetUrl}\n\nIf you did not request this, you can ignore this email. The link can be used only once.`,
    html:`<p>A password reset was requested for <strong>${escapeHtml(args.tenantName)}</strong> (<code>${escapeHtml(args.tenantSlug)}</code>).</p><p><a href="${escapeHtml(args.resetUrl)}">Reset your password</a> within 30 minutes.</p><p>If you did not request this, you can ignore this email. The link can be used only once.</p>`
  });
}
