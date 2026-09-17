export const LEARNING_STAGES = ["P1-P4","P5","P6","S1","S2","S3","S4"] as const;
export type LearningStage = (typeof LEARNING_STAGES)[number];

export function isLearningStage(value: unknown): value is LearningStage {
  return typeof value === "string" && (LEARNING_STAGES as readonly string[]).includes(value);
}

export function normalizeLearningStage(value: unknown, fallback: LearningStage = "P6"): LearningStage {
  return isLearningStage(value) ? value : fallback;
}

export function defaultLearningStage(schoolLevel: unknown): LearningStage {
  return normalizeLearningStage(schoolLevel, "P6");
}

export const STAGE_LABELS: Record<LearningStage,string> = {
  "P1-P4":"P1–P4 · Foundation",
  P5:"P5 · Upper Primary",
  P6:"P6 · PSLE",
  S1:"S1 · Lower Secondary",
  S2:"S2 · Lower Secondary",
  S3:"S3 · Upper Secondary",
  S4:"S4 · Upper Secondary",
};
