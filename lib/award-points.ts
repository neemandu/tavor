import { createAdminClient } from "@/lib/supabase/server";

type PointsReason =
  | "scenario_complete"
  | "exam_score"
  | "daily_streak"
  | "enrichment_view"
  | "letter_learned";

export async function awardPoints(
  userId: string,
  points: number,
  reason: PointsReason,
  metadata?: Record<string, unknown>
) {
  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { error: pointsError } = await supabase.from("user_points").insert({
    user_id: userId,
    points,
    reason,
    metadata: metadata ?? {},
  });
  if (pointsError) {
    console.error(`awardPoints insert failed (reason=${reason}, userId=${userId}):`, pointsError);
    return;
  }

  const { data: streak, error: streakReadError } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (streakReadError) {
    console.error("awardPoints streak read failed:", streakReadError);
    return;
  }

  const last = streak?.last_activity_date as string | null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const current = (streak?.current_streak as number | null) ?? 0;
  const longest = (streak?.longest_streak as number | null) ?? 0;

  const newStreak = !streak ? 1 : last === yesterday ? current + 1 : last === today ? current : 1;
  const firstToday = last !== today;

  const { error: streakWriteError } = await supabase.from("user_streaks").upsert(
    {
      user_id: userId,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, longest),
      last_activity_date: today,
    },
    { onConflict: "user_id" }
  );
  if (streakWriteError) {
    console.error("awardPoints streak upsert failed:", streakWriteError);
  }

  if (firstToday && newStreak > 1) {
    const { error: bonusError } = await supabase.from("user_points").insert({
      user_id: userId,
      points: 5,
      reason: "daily_streak",
      metadata: { current_streak: newStreak },
    });
    if (bonusError) {
      console.error("awardPoints daily_streak bonus failed:", bonusError);
    }
  }
}
