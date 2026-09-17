export type ReviewRating = "again" | "hard" | "good" | "easy";

const DAY = 24 * 60 * 60 * 1000;
export function scheduleReview(args:{rating:ReviewRating; mastery:number; reviewCount:number; correctStreak:number; now?:Date}) {
  const now = args.now || new Date();
  let mastery = Number.isFinite(args.mastery) ? args.mastery : 0;
  let streak = Math.max(0, args.correctStreak || 0);
  let delayMs = DAY;
  if (args.rating === "again") {
    mastery = Math.max(0, mastery - 12); streak = 0; delayMs = 10 * 60 * 1000;
  } else if (args.rating === "hard") {
    mastery = Math.min(100, mastery + 4); streak = Math.max(0, streak); delayMs = Math.max(12 * 60 * 60 * 1000, Math.min(3 * DAY, DAY * Math.max(1, args.reviewCount)));
  } else if (args.rating === "good") {
    mastery = Math.min(100, mastery + 11); streak += 1;
    const days = [1, 3, 7, 14, 30, 60, 90][Math.min(args.reviewCount, 6)]; delayMs = days * DAY;
  } else {
    mastery = Math.min(100, mastery + 18); streak += 1;
    const days = [3, 7, 14, 30, 60, 90, 120][Math.min(args.reviewCount, 6)]; delayMs = days * DAY;
  }
  const next = new Date(now.getTime() + delayMs);
  return { mastery, correctStreak: streak, nextReviewAt: next.toISOString(), status: mastery >= 85 ? "mastered" : mastery >= 45 ? "review" : "learning" };
}
