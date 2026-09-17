import { normalizeLearningStage, type LearningStage } from "@/lib/language/stages";

export type LearnerTenantContext = { tenantId: string; schoolLevel: LearningStage };

export async function learnerTenantContext(db: D1Database, childId: string): Promise<LearnerTenantContext> {
  const row = await db.prepare("SELECT tenant_id,school_level FROM child_profiles WHERE id=?")
    .bind(childId).first<{ tenant_id: string | null; school_level: string }>();
  const tenantId = childId.startsWith("guest-child-") ? "" : (row?.tenant_id || "tenant-default");
  return {
    tenantId,
    schoolLevel: normalizeLearningStage(row?.school_level, "P6"),
  };
}
