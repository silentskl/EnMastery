import { getEnv } from "@/lib/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { getListeningContent } from "@/lib/listening/store";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(request); if (denied) return denied;
  const { id } = await params; const env = getEnv(); const visible=await env.DB.prepare("SELECT id FROM content_items WHERE id=? AND status<>'deleted'").bind(id).first(); if(!visible)return Response.json({error:"Listening content not found"},{status:404}); const content = await getListeningContent(env.DB, id, false);
  return content ? Response.json({ content }) : Response.json({ error: "Listening content not found" }, { status: 404 });
}
