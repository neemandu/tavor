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

  await supabase.from("user_points").insert({
    user_id: userId,
    points,
    reason,
    metadata: metadata ?? {},
  });

  const { data: streak } = await supabase
    .from("user_streaks")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("user_id", userId)
    .maybeSingle();

  const last = streak?.last_activity_date as string | null;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const current = (streak?.current_streak as number | null) ?? 0;
  const longest = (streak?.longest_streak as number | null) ?? 0;

  const newStreak = !streak ? 1 : last === yesterday ? current + 1 : last === today ? current : 1;
  const firstToday = last !== today;

  await supabase.from("user_streaks").upsert(
    {
      user_id: userId,
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, longest),
      last_activity_date: today,
    },
    { onConflict: "user_id" }
  );

  if (firstToday && newStreak > 1) {
    await supabase.from("user_points").insert({
      user_id: userId,
      points: 5,
      reason: "daily_streak",
      metadata: { current_streak: newStreak },
    });
  }
}
